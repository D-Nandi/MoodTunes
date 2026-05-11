/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║              MoodTunes — AI Recommendation Engine                   ║
 * ║                         engine.js  v2.0                             ║
 * ║                                                                      ║
 * ║  Drop this file into index.html BEFORE script.js.                   ║
 * ║  It exports a single global: window.MoodEngine                      ║
 * ║  script.js calls MoodEngine.rank(tracks, mood) instead of the       ║
 * ║  old applyMoodFilter() to get a fully personalised, confidence-     ║
 * ║  scored, diversity-filtered ranking.                                 ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * ARCHITECTURE — 9-stage pipeline (mirrors the spec exactly)
 *
 *  Stage 1  Candidate Collection    ← done upstream in fetchMusic()
 *  Stage 2  Language Filtering      ← done upstream in enforceLanguageFilter()
 *  Stage 3  Mood Scoring            ← calculateMoodScore() in script.js  +
 *                                      MOOD_VECTORS boost (this file)
 *  Stage 4  Anti-Mood Penalty       ← MOOD_NEGATIVE_TAGS (this file)
 *  Stage 5  Personalization Scoring ← calculatePersonalizationScore() (this file)
 *  Stage 6  Confidence Calculation  ← calculateConfidence() (this file)
 *  Stage 7  Final Ranking           ← weighted combination (this file)
 *  Stage 8  Diversity Filtering     ← max N per artist (this file)
 *  Stage 9  Render                  ← renderCards() in script.js
 */

(function (global) {
    "use strict";

    /* ════════════════════════════════════════════════════════════════════
       §1  MOOD VECTORS
       Each mood is described across 9 emotional dimensions.
       Positive = good for this mood. Negative = bad for this mood.
       Used to score a track's tag cloud against a mood's emotional profile.
    ════════════════════════════════════════════════════════════════════ */
    const MOOD_VECTORS = {
        happy: {
            emotional:    0.3,
            melancholic: -0.8,
            energetic:    0.6,
            calm:         0.2,
            romantic:     0.3,
            party:        0.5,
            focus:       -0.1,
            aggressive:  -0.7,
            sleepy:      -0.9,
        },
        sad: {
            emotional:    1.0,
            melancholic:  0.9,
            energetic:   -0.8,
            calm:         0.3,
            romantic:    -0.3,   // neutral — some sad songs are also romantic
            party:       -1.0,
            focus:       -0.2,
            aggressive:  -0.5,
            sleepy:       0.2,
        },
        romantic: {
            emotional:    0.7,
            melancholic:  0.1,
            energetic:   -0.3,
            calm:         0.5,
            romantic:     1.0,
            party:       -0.6,
            focus:       -0.2,
            aggressive:  -1.0,
            sleepy:       0.2,
        },
        chill: {
            emotional:    0.2,
            melancholic:  0.2,
            energetic:   -0.9,
            calm:         1.0,
            romantic:     0.2,
            party:       -1.0,
            focus:        0.4,
            aggressive:  -1.0,
            sleepy:       0.4,
        },
        energetic: {
            emotional:    0.1,
            melancholic: -0.7,
            energetic:    1.0,
            calm:        -0.9,
            romantic:    -0.2,
            party:        0.5,
            focus:        0.3,
            aggressive:   0.6,
            sleepy:      -1.0,
        },
        party: {
            emotional:   -0.2,
            melancholic: -1.0,
            energetic:    0.9,
            calm:        -1.0,
            romantic:    -0.1,
            party:        1.0,
            focus:       -0.7,
            aggressive:   0.3,
            sleepy:      -1.0,
        },
        focus: {
            emotional:   -0.1,
            melancholic:  0.1,
            energetic:    0.1,
            calm:         0.8,
            romantic:    -0.3,
            party:       -1.0,
            focus:        1.0,
            aggressive:  -0.8,
            sleepy:       0.2,
        },
        sleep: {
            emotional:    0.1,
            melancholic:  0.3,
            energetic:   -1.0,
            calm:         1.0,
            romantic:     0.2,
            party:       -1.0,
            focus:        0.1,
            aggressive:  -1.0,
            sleepy:       1.0,
        },
    };

    /* ════════════════════════════════════════════════════════════════════
       §2  ANTI-TAG SYSTEM
       Hard-penalise tracks whose title/artist contain these terms
       when the selected mood conflicts strongly.
    ════════════════════════════════════════════════════════════════════ */
    const MOOD_ANTI_TAGS = {
        happy:    ["heartbreak","heartbroken","crying","tears","lonely","pain","broken","sorrow","melancholy","empty","numb","goodbye forever","can't go on","depression","desolate"],
        sad:      ["party","turn up","dance floor","banger","shots","celebrate","upbeat","feel good","best day","on top of the world","edm","rave","anthem","club night"],
        romantic: ["fight","war","kill","destroy","hate","anger","violence","rage","aggressive","scream","slam","breakup","betrayal","cheating","revenge","bitter"],
        chill:    ["party","club","rave","edm","drop it","turn up","fire","rage","beast mode","adrenaline","hype","aggressive","intense","scream","roar","blast"],
        energetic:["sleep","lullaby","slow","calm","quiet","soft","rest","dream","peaceful","drift","fade","melancholy","sorrow","crying","tears","ambient","meditation"],
        party:    ["sad","lonely","crying","heartbreak","empty","sleep","lullaby","soft","quiet","rest","alone","goodbye","melancholy","numb","pain","hurt","depression"],
        focus:    ["party","dance","banger","turn up","club","shots","drinking","crazy night","rave","edm","trap"],
        sleep:    ["party","dance","energetic","power","rock","metal","loud","bass drop","fire","beast","hype","adrenaline","shots","club","rave","banger","workout"],
    };

    /* ════════════════════════════════════════════════════════════════════
       §3  TAG-DIMENSION MAPPING
       We map common Last.fm tags to the 9 emotional dimensions so we can
       dot-product a track's implicit "tag vector" against MOOD_VECTORS.
    ════════════════════════════════════════════════════════════════════ */
    const TAG_DIMENSION_MAP = {
        // Emotional / melancholic
        sad:          { emotional: 1.0, melancholic: 0.9 },
        emotional:    { emotional: 1.0, melancholic: 0.4 },
        melancholy:   { emotional: 0.8, melancholic: 1.0 },
        heartbreak:   { emotional: 0.9, melancholic: 0.8 },
        blues:        { emotional: 0.6, melancholic: 0.7 },
        indie:        { emotional: 0.4, melancholic: 0.3, calm: 0.3 },
        folk:         { emotional: 0.5, melancholic: 0.4, calm: 0.4 },
        // Energetic
        rock:         { energetic: 0.7, aggressive: 0.4 },
        metal:        { energetic: 0.9, aggressive: 0.9 },
        punk:         { energetic: 0.8, aggressive: 0.7 },
        workout:      { energetic: 0.9 },
        power:        { energetic: 0.8, aggressive: 0.3 },
        // Calm / chill
        chill:        { calm: 1.0, sleepy: 0.3 },
        ambient:      { calm: 0.9, sleepy: 0.6, focus: 0.4 },
        lofi:         { calm: 0.8, focus: 0.6 },
        "lo-fi":      { calm: 0.8, focus: 0.6 },
        acoustic:     { calm: 0.6, emotional: 0.3, melancholic: 0.2 },
        classical:    { calm: 0.7, focus: 0.8 },
        instrumental: { focus: 0.7, calm: 0.6 },
        jazz:         { focus: 0.5, calm: 0.6 },
        // Sleep
        sleep:        { sleepy: 1.0, calm: 0.8 },
        meditation:   { sleepy: 0.6, calm: 0.9 },
        lullaby:      { sleepy: 0.9, calm: 0.8 },
        relaxing:     { calm: 0.9, sleepy: 0.4 },
        // Romantic
        romantic:     { romantic: 1.0, emotional: 0.4 },
        love:         { romantic: 0.8, emotional: 0.4 },
        "r&b":        { romantic: 0.6, emotional: 0.5 },
        soul:         { romantic: 0.5, emotional: 0.7 },
        // Party / energetic
        party:        { party: 1.0, energetic: 0.7 },
        edm:          { party: 0.9, energetic: 0.8 },
        dance:        { party: 0.7, energetic: 0.6 },
        club:         { party: 0.9, energetic: 0.7 },
        house:        { party: 0.8, energetic: 0.6 },
        electro:      { party: 0.7, energetic: 0.6 },
        // Happy
        happy:        { energetic: 0.3, party: 0.3 },
        "feel-good":  { energetic: 0.4, party: 0.2 },
        pop:          { energetic: 0.2, party: 0.2, romantic: 0.2 },
        upbeat:       { energetic: 0.5, party: 0.4 },
        // Focus
        study:        { focus: 1.0, calm: 0.5 },
        concentration:{ focus: 0.9 },
    };

    /* ════════════════════════════════════════════════════════════════════
       §4  USER PROFILE — persisted in localStorage
       Tracks every meaningful interaction and learns from it.
    ════════════════════════════════════════════════════════════════════ */
    const PROFILE_KEY = "moodtunes_user_profile";

    /**
     * Load the user profile from localStorage.
     * Returns a deep clone to avoid accidental mutation of the raw store.
     */
    function loadProfile() {
        try {
            const raw = localStorage.getItem(PROFILE_KEY);
            if (raw) return JSON.parse(raw);
        } catch (_) {}
        return createEmptyProfile();
    }

    /** Persist the profile object back to localStorage. */
    function saveProfile(profile) {
        try {
            localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
        } catch (_) {}
    }

    /** Build a fresh profile when no data exists yet. */
    function createEmptyProfile() {
        return {
            version: 2,
            // { artistNameLower: { likes: 0, skips: 0, replays: 0, totalListenMs: 0 } }
            artists: {},
            // { moodId: playCount }
            moods: {},
            // { languageName: playCount }
            languages: {},
            // { genreTag: { likes: 0, skips: 0 } }
            genres: {},
            // Array of { name, artist, mood, language, timestamp }
            history: [],
            // Total events recorded
            totalEvents: 0,
        };
    }

    /**
     * Record an interaction event.
     *
     * @param {string} eventType  "like" | "skip" | "replay" | "play" | "complete"
     * @param {object} track      track object (must have .name, .artist, ._language)
     * @param {string} mood       currently active mood id
     * @param {number} listenMs   milliseconds actually listened (for "play" / "complete")
     */
    function recordInteraction(eventType, track, mood, listenMs = 0) {
        const profile = loadProfile();
        const artistKey = (track.artist || "unknown").toLowerCase().trim();
        const lang      = track._language || "unknown";

        // ── Artist stats ──────────────────────────────────────────────
        if (!profile.artists[artistKey]) {
            profile.artists[artistKey] = { likes: 0, skips: 0, replays: 0, totalListenMs: 0 };
        }
        const a = profile.artists[artistKey];
        if (eventType === "like")     a.likes++;
        if (eventType === "skip")     a.skips++;
        if (eventType === "replay")   a.replays++;
        if (eventType === "play" || eventType === "complete") {
            a.totalListenMs += listenMs;
        }

        // ── Mood frequency ────────────────────────────────────────────
        if (mood) {
            profile.moods[mood] = (profile.moods[mood] || 0) + 1;
        }

        // ── Language frequency ────────────────────────────────────────
        profile.languages[lang] = (profile.languages[lang] || 0) + 1;

        // ── History (last 100 plays) ──────────────────────────────────
        if (eventType === "play" || eventType === "complete") {
            profile.history.unshift({
                name:      track.name,
                artist:    track.artist,
                mood:      mood || null,
                language:  lang,
                timestamp: Date.now(),
            });
            if (profile.history.length > 100) profile.history.length = 100;
        }

        profile.totalEvents++;
        saveProfile(profile);
    }

    /* ════════════════════════════════════════════════════════════════════
       §5  PERSONALIZATION SCORING
       Returns a score in [-100, +100] representing how well this track
       matches the user's historical preferences.
    ════════════════════════════════════════════════════════════════════ */

    /**
     * calculatePersonalizationScore(track, profile)
     *
     * Factors:
     *  • Artist like/skip ratio  → ±40 pts
     *  • Artist replay bonus     → +10 pts
     *  • Artist listen time      → +10 pts
     *  • Language preference     → ±20 pts
     *  • Recency (already heard) → -30 pts (avoid repetition)
     *  • Mood alignment bonus    → +20 pts
     */
    function calculatePersonalizationScore(track, profile, mood) {
        let score = 0;

        const artistKey = (track.artist || "").toLowerCase().trim();
        const artStats  = profile.artists[artistKey];

        // ── Artist affinity ───────────────────────────────────────────
        if (artStats) {
            const total = artStats.likes + artStats.skips;
            if (total > 0) {
                const likeRatio = artStats.likes / total;
                // Maps 0–1 ratio → -40..+40
                score += (likeRatio * 80) - 40;
            }
            // Replay bonus: each replay adds +3, capped at +10
            score += Math.min(artStats.replays * 3, 10);
            // Listen-time bonus: 1 pt per 30 seconds of total listen time, capped at +10
            score += Math.min(Math.floor(artStats.totalListenMs / 30000), 10);
        }

        // ── Language preference ───────────────────────────────────────
        const lang     = track._language || "";
        const langHits = profile.languages[lang] || 0;
        const totalLangHits = Object.values(profile.languages).reduce((s, v) => s + v, 0) || 1;
        // Proportion of time spent on this language → ±20
        const langShare = langHits / totalLangHits;
        score += (langShare * 40) - 5;   // mild preference signal, not too aggressive

        // ── Recency penalty — avoid playing the same track again soon ─
        const recentlyHeard = profile.history.some(
            h => h.name  === track.name &&
                 h.artist === track.artist &&
                 (Date.now() - h.timestamp) < 30 * 60 * 1000   // within 30 mins
        );
        if (recentlyHeard) score -= 30;

        // ── Mood alignment bonus ──────────────────────────────────────
        // If the user often listens to this mood, trust its results more
        if (mood) {
            const moodHits  = profile.moods[mood] || 0;
            const totalMood = Object.values(profile.moods).reduce((s, v) => s + v, 0) || 1;
            const moodShare = moodHits / totalMood;
            score += moodShare * 20;
        }

        return Math.max(-100, Math.min(100, score));
    }

    /* ════════════════════════════════════════════════════════════════════
       §6  MOOD-VECTOR SCORING EXTENSION
       Augments the base calculateMoodScore() from script.js with a
       vector-based boost derived from the track's implicit tag profile.

       Returns an ADDITIONAL score bonus (can be negative).
       Call AFTER the base mood score has already been computed.
    ════════════════════════════════════════════════════════════════════ */

    /**
     * computeVectorBonus(track, mood)
     *
     * 1. Build the track's approximate emotional "tag vector" from its
     *    artist name (via MOOD_ARTIST_AFFINITIES in config.js) and any
     *    tags that appear in its title.
     * 2. Dot-product that vector against MOOD_VECTORS[mood].
     * 3. Return the scaled result as a bonus in [-60, +60].
     */
    function computeVectorBonus(track, mood) {
        const moodVec = MOOD_VECTORS[mood];
        if (!moodVec) return 0;

        // Build track's implied emotional dimensions
        const trackDims = {};

        // Signal 1: scan title for tag-dimension keywords
        const title = (track.name || "").toLowerCase();
        for (const [tag, dims] of Object.entries(TAG_DIMENSION_MAP)) {
            if (title.includes(tag)) {
                for (const [dim, weight] of Object.entries(dims)) {
                    trackDims[dim] = (trackDims[dim] || 0) + weight;
                }
            }
        }

        // Signal 2: map known artist affinities to emotional dimensions
        // MOOD_ARTIST_AFFINITIES comes from config.js (already loaded)
        if (typeof MOOD_ARTIST_AFFINITIES !== "undefined") {
            const artistLower = (track.artist || "").toLowerCase();
            for (const [knownArtist, moods] of Object.entries(MOOD_ARTIST_AFFINITIES)) {
                if (artistLower === knownArtist || artistLower.includes(knownArtist)) {
                    // Convert the artist's mood list into dimension contributions
                    for (const m of moods) {
                        const mv = MOOD_VECTORS[m];
                        if (!mv) continue;
                        for (const [dim, weight] of Object.entries(mv)) {
                            if (weight > 0) {
                                // Dampen the contribution: artist mood → +0.3× dimension
                                trackDims[dim] = (trackDims[dim] || 0) + (weight * 0.3);
                            }
                        }
                    }
                    break;
                }
            }
        }

        // Dot-product: Σ( moodVec[dim] × trackDims[dim] )
        let dot = 0;
        for (const [dim, moodWeight] of Object.entries(moodVec)) {
            dot += moodWeight * (trackDims[dim] || 0);
        }

        // Normalise to ±60 range (raw dot can get large with many dimension hits)
        let bonus = Math.tanh(dot) * 60;

        /* ── EmotionVectors semantic layer ──────────────────────────────
           Blend in 12-dimension semantic similarity (emotion-vectors.js).
           Catches title/artist signals TAG_DIMENSION_MAP misses,
           e.g. "lonely rain" → sadness/calmness/solitude.
           Contributes up to ±30 additional pts.
        ──────────────────────────────────────────────────────────────── */
        if (global.EmotionVectors) {
            const EV  = global.EmotionVectors;
            const sim = (track._emotionSim !== undefined)
                ? track._emotionSim
                : EV.trackQuerySimilarity(track, mood);
            bonus += Math.tanh((sim - 0.4) * 4) * 30;
        }

        return Math.round(bonus);
    }

    /* ════════════════════════════════════════════════════════════════════
       §7  ANTI-TAG PENALTY
       Scans title for hard mood-conflicting terms.
       Returns a negative penalty (0 or lower).
    ════════════════════════════════════════════════════════════════════ */

    function computeAntiTagPenalty(track, mood) {
        const title   = (track.name   || "").toLowerCase();
        const artist  = (track.artist || "").toLowerCase();
        const antiTags = MOOD_ANTI_TAGS[mood] || [];
        let penalty = 0;
        for (const tag of antiTags) {
            if (title.includes(tag) || artist.includes(tag)) {
                penalty -= 80;    // single strong mismatch is usually disqualifying
                break;            // don't stack penalties — one is enough to exclude
            }
        }
        return penalty;
    }

    /* ════════════════════════════════════════════════════════════════════
       §8  CONFIDENCE SCORE
       0–100 rating of how reliable this recommendation is.
       Not shown in the UI by default but stored on every track object.
    ════════════════════════════════════════════════════════════════════ */

    const CONFIDENCE_THRESHOLD = 42;   // tracks below this are hidden

    /**
     * calculateConfidence(track, mood, moodScore, personScore)
     *
     * Continuous multi-signal raw score (not yet normalized).
     * Normalization happens in rank() across the whole batch so the
     * distribution spans the full 42–99 range rather than clustering.
     *
     * Raw signal weights (sum → raw score, later stretched):
     *   A. Semantic similarity  0–40 pts  (EmotionVectors cosine sim)
     *   B. Mood keyword score   0–30 pts  (moodScore continuous mapping)
     *   C. Anti-tag penalty     0–25 pts  (subtracted when present)
     *   D. Source reliability   0–15 pts  (curated > tag)
     *   E. Personalization      ±10 pts
     *   F. Metadata quality     0–5  pts
     */
    function calculateConfidence(track, mood, moodScore, personScore) {
        let raw = 0;

        /* A — Semantic similarity (largest single signal) */
        // Use pre-stamped _emotionSim if available (set in script.js fetchMusic),
        // otherwise compute live. Cosine sim 0–1 → 0–40 pts.
        let sem = 0;
        if (global.EmotionVectors) {
            const sim = (track._emotionSim != null)
                ? track._emotionSim
                : global.EmotionVectors.trackQuerySimilarity(track, mood);
            sem = sim * 40;
        } else {
            // Fallback when EmotionVectors not loaded: derive from moodScore shape
            sem = Math.max(0, Math.min(40, (moodScore + 50) * 0.4));
        }
        raw += sem;

        /* B — Mood keyword score: continuous sigmoid mapping
           moodScore range in practice: −80 … +80
           Map to 0–30 pts using tanh so extreme values are rewarded/penalized. */
        raw += (Math.tanh(moodScore / 40) + 1) * 15;   // 0–30 pts

        /* C — Anti-tag penalty: track._antiPenalty stored by rank() caller
           If track already received an anti-tag penalty, reflect it here.
           antiPenalty is 0 or −80; map to 0 or −25. */
        const antiSignal = (track._antiPenalty || 0);
        raw += antiSignal * (25 / 80);   // scales −80→−25, 0→0

        /* D — Source reliability: curated seeds are more trustworthy */
        const srcPts = { preferred: 15, similar: 10, "artist-top": 8, tag: 3 };
        raw += srcPts[track._source] || 3;

        /* E — Personalization: ±10 pts, dampened so it moves the needle
           without dominating when user has little history. */
        raw += Math.tanh(personScore / 50) * 10;

        /* F — Metadata: small reward for rich metadata */
        if (track.image && track.image.length > 10) raw += 3;
        if (track.url   && track.url.length   > 10) raw += 2;

        return raw;   // raw — rank() will normalize across the batch
    }

    /* Normalize a batch of raw confidence scores to the display range [minPct, 99].
       Uses min-max stretch so the best track in the batch always hits ~95–99%
       and the spread reflects genuine quality differences. */
    function normalizeConfidenceScores(scoredTracks) {
        const raws = scoredTracks.map(t => t._rawConf);
        const lo   = Math.min(...raws);
        const hi   = Math.max(...raws);
        const span = hi - lo || 1;

        // Target display range: weak=42, strong=99
        const MIN_DISPLAY = 42;
        const MAX_DISPLAY = 99;
        const displaySpan = MAX_DISPLAY - MIN_DISPLAY;

        return scoredTracks.map(t => {
            const norm  = (t._rawConf - lo) / span;          // 0–1
            // Apply a mild power curve (^0.7) to push scores apart in the middle
            const curved = Math.pow(norm, 0.7);
            const display = Math.round(MIN_DISPLAY + curved * displaySpan);
            return { ...t, confidenceScore: Math.min(MAX_DISPLAY, display) };
        });
    }

    /* ════════════════════════════════════════════════════════════════════
       §9  DIVERSITY FILTER
       Prevents the same artist from dominating the results list.
    ════════════════════════════════════════════════════════════════════ */

    const MAX_TRACKS_PER_ARTIST = 3;

    function applyDiversityFilter(tracks) {
        const artistCount = {};
        return tracks.filter(t => {
            const key = (t.artist || "unknown").toLowerCase();
            artistCount[key] = (artistCount[key] || 0) + 1;
            return artistCount[key] <= MAX_TRACKS_PER_ARTIST;
        });
    }

    /* ════════════════════════════════════════════════════════════════════
       §10  MAIN PIPELINE — MoodEngine.rank(tracks, mood)
       This is the single entry-point called from script.js.
       It replaces the old applyMoodFilter() call in fetchMusic().
    ════════════════════════════════════════════════════════════════════ */

    /**
     * rank(tracks, mood)
     *
     * @param  {Array}  tracks  Array of track objects already through
     *                          stages 1–2 (language + dedup filters).
     *                          Each track has at minimum:
     *                          { name, artist, _language, _source, score, moodScore? }
     * @param  {string} mood    Selected mood id (e.g. "sad")
     * @returns {Array}         Filtered, scored, ranked, diversity-filtered tracks.
     *                          Each track gains:
     *                            .confidenceScore   0–100
     *                            .finalScore        composite ranking key
     *                            .personScore       personalization contribution
     */
    function rank(tracks, mood) {
        const profile = loadProfile();

        const preScored = tracks.map(track => {
            // Stage 3: Base mood score (already computed upstream via calculateMoodScore)
            const baseMoodScore   = track.moodScore ?? 0;
            const vectorBonus     = computeVectorBonus(track, mood);
            const moodScore       = baseMoodScore + vectorBonus;

            // Stage 4: Anti-tag penalty — stored on track so calculateConfidence can read it
            const antiPenalty     = computeAntiTagPenalty(track, mood);
            const adjustedMood    = moodScore + antiPenalty;

            // Stage 5: Personalization score
            const personScore     = calculatePersonalizationScore(track, profile, mood);

            // Stage 6: Raw confidence (not yet normalized)
            const trackWithSignals = { ...track, _antiPenalty: antiPenalty };
            const rawConf          = calculateConfidence(trackWithSignals, mood, adjustedMood, personScore);

            // Stage 7: Final ranking formula
            const finalScore =
                (adjustedMood * 0.70) +
                (personScore  * 0.30) +
                Math.log1p(track.score || 0) * 0.5;

            return {
                ...track,
                _antiPenalty:  antiPenalty,
                _rawConf:      rawConf,
                moodScore:     Math.round(adjustedMood),
                personScore:   Math.round(personScore),
                finalScore:    Math.round(finalScore),
                confidenceScore: 0,   // filled in after normalization
                _vectorBonus:  Math.round(vectorBonus),
            };
        });

        // Stage 6b: Normalize confidence scores across the whole batch
        const scored = normalizeConfidenceScores(preScored);

        // Hard exclude — below confidence threshold (unless the pool would go empty)
        const above = scored.filter(t => t.confidenceScore >= CONFIDENCE_THRESHOLD);
        const pool  = above.length >= 4 ? above : scored;   // fallback: keep at least a few

        // Also hard-exclude tracks that got an anti-tag penalty (explicit mismatch)
        const withoutMismatch = pool.filter(t => {
            const antiPenalty = computeAntiTagPenalty(t, mood);
            return antiPenalty >= -40;   // only hard-reject the worst offenders
        });
        const finalPool = withoutMismatch.length >= 4 ? withoutMismatch : pool;

        // Stage 7: Sort by finalScore descending
        // Preferred seeds still float to the top thanks to their base score of 999999
        finalPool.sort((a, b) => {
            // Primary: finalScore
            const scoreDiff = b.finalScore - a.finalScore;
            if (Math.abs(scoreDiff) > 1) return scoreDiff;
            // Tiebreaker: confidence (more reliable recommendations first)
            return b.confidenceScore - a.confidenceScore;
        });

        // Stage 8: Diversity filter
        const diverse = applyDiversityFilter(finalPool);

        return diverse;
    }

    /* ════════════════════════════════════════════════════════════════════
       §11  INTERACTION HOOKS
       Call these from script.js at the right UI moments.
    ════════════════════════════════════════════════════════════════════ */

    /**
     * onPlay(track, mood)
     * Call when the user clicks ▶ on a song card.
     */
    function onPlay(track, mood) {
        recordInteraction("play", track, mood);
    }

    /**
     * onLike(track, mood)
     * Call when the user taps the ❤️ heart (addToFavourites).
     */
    function onLike(track, mood) {
        recordInteraction("like", track, mood);
    }

    /**
     * onSkip(track, mood)
     * Call when the user closes the player bar mid-track
     * or starts a different song before the current one ends.
     * Only record as a skip if less than 50% of the preview was played.
     */
    function onSkip(track, mood, playedMs, totalMs) {
        const fraction = totalMs > 0 ? playedMs / totalMs : 0;
        if (fraction < 0.5) {
            recordInteraction("skip", track, mood, playedMs);
        }
    }

    /**
     * onComplete(track, mood, listenMs)
     * Call when the audio "ended" event fires.
     */
    function onComplete(track, mood, listenMs) {
        recordInteraction("complete", track, mood, listenMs);
    }

    /**
     * onReplay(track, mood)
     * Call when the user clicks ▶ on a track they've already played
     * in the same session (detect by checking recently-played list).
     */
    function onReplay(track, mood) {
        recordInteraction("replay", track, mood);
    }

    /* ════════════════════════════════════════════════════════════════════
       §12  PROFILE INTROSPECTION UTILITIES
       Useful for debugging or building a "Your taste" panel in future.
    ════════════════════════════════════════════════════════════════════ */

    /** Return the top N favourite artists by (likes + replays - skips). */
    function topArtists(n = 5) {
        const profile = loadProfile();
        return Object.entries(profile.artists)
            .map(([artist, s]) => ({
                artist,
                affinity: s.likes * 2 + s.replays - s.skips,
            }))
            .filter(x => x.affinity > 0)
            .sort((a, b) => b.affinity - a.affinity)
            .slice(0, n)
            .map(x => x.artist);
    }

    /** Return the most-used mood id. */
    function topMood() {
        const profile = loadProfile();
        const entries = Object.entries(profile.moods);
        if (!entries.length) return null;
        return entries.sort((a, b) => b[1] - a[1])[0][0];
    }

    /** Reset all learned data (useful for a "Clear my profile" setting). */
    function resetProfile() {
        localStorage.removeItem(PROFILE_KEY);
    }

    /* ════════════════════════════════════════════════════════════════════
       §13  EXPORT
    ════════════════════════════════════════════════════════════════════ */

    global.MoodEngine = {
        // Core pipeline
        rank,

        // Interaction tracking
        onPlay,
        onLike,
        onSkip,
        onComplete,
        onReplay,

        // Profile utilities
        topArtists,
        topMood,
        resetProfile,
        loadProfile,

        // Exposed for testing
        _computeVectorBonus:             computeVectorBonus,
        _calculatePersonalizationScore:  calculatePersonalizationScore,
        _calculateConfidence:            calculateConfidence,
        _computeAntiTagPenalty:          computeAntiTagPenalty,
        _MOOD_VECTORS:                   MOOD_VECTORS,
        _CONFIDENCE_THRESHOLD:           CONFIDENCE_THRESHOLD,
    };

})(window);
