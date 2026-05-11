/**
 * MoodTunes — emotion-vectors.js
 * Semantic emotion vector system for natural language mood matching.
 * Load BEFORE engine.js and script.js.
 * Exposes: window.EmotionVectors
 */

(function (global) {
    "use strict";

    /* ════════════════════════════════════════════════════════════════
       §1  EMOTIONAL DIMENSIONS (12-axis space)
    ════════════════════════════════════════════════════════════════ */
    const DIMENSIONS = [
        "sadness",       // grief, loss, sorrow
        "joy",           // happiness, elation, bliss
        "nostalgia",     // longing, reminiscence, bittersweet
        "calmness",      // peace, serenity, stillness
        "energy",        // vitality, drive, intensity
        "romance",       // love, intimacy, longing
        "tension",       // anxiety, unease, suspense
        "melancholy",    // wistful sadness, moody introspection
        "euphoria",      // ecstasy, peak excitement, exhilaration
        "solitude",      // aloneness, isolation, introspection
        "warmth",        // comfort, safety, belonging
        "darkness",      // dread, desolation, existential weight
    ];

    /* ════════════════════════════════════════════════════════════════
       §2  MOOD VECTORS
       Each mood is a normalised point in the 12D emotion space.
       Values: -1.0 (strongly opposite) → 0 (neutral) → 1.0 (strongly present)
    ════════════════════════════════════════════════════════════════ */
    const MOOD_EMOTION_VECTORS = {
        sad: {
            sadness:   1.0, joy:      -0.8, nostalgia:  0.5,
            calmness:  0.2, energy:   -0.7, romance:   -0.2,
            tension:   0.3, melancholy: 0.9, euphoria: -0.9,
            solitude:  0.7, warmth:   -0.2, darkness:   0.6,
        },
        chill: {
            sadness:   0.1, joy:       0.2, nostalgia:  0.3,
            calmness:  1.0, energy:   -0.7, romance:    0.2,
            tension:  -0.8, melancholy: 0.2, euphoria: -0.3,
            solitude:  0.4, warmth:    0.5, darkness:  -0.2,
        },
        happy: {
            sadness:  -0.9, joy:       1.0, nostalgia:  0.1,
            calmness:  0.2, energy:    0.6, romance:    0.3,
            tension:  -0.7, melancholy:-0.8, euphoria:  0.5,
            solitude: -0.4, warmth:    0.7, darkness:  -0.8,
        },
        romantic: {
            sadness:   0.1, joy:       0.4, nostalgia:  0.5,
            calmness:  0.5, energy:   -0.2, romance:    1.0,
            tension:   0.2, melancholy: 0.1, euphoria:  0.3,
            solitude: -0.3, warmth:    0.8, darkness:  -0.1,
        },
        energetic: {
            sadness:  -0.7, joy:       0.5, nostalgia: -0.2,
            calmness: -0.9, energy:    1.0, romance:   -0.1,
            tension:   0.5, melancholy:-0.7, euphoria:  0.7,
            solitude: -0.5, warmth:    0.2, darkness:   0.1,
        },
        party: {
            sadness:  -1.0, joy:       0.8, nostalgia: -0.3,
            calmness: -1.0, energy:    0.9, romance:    0.0,
            tension:  -0.4, melancholy:-1.0, euphoria:  1.0,
            solitude: -0.9, warmth:    0.4, darkness:  -0.6,
        },
        focus: {
            sadness:  -0.1, joy:       0.1, nostalgia:  0.0,
            calmness:  0.8, energy:    0.2, romance:   -0.4,
            tension:  -0.3, melancholy: 0.1, euphoria: -0.4,
            solitude:  0.6, warmth:    0.1, darkness:  -0.1,
        },
        sleep: {
            sadness:   0.1, joy:       0.0, nostalgia:  0.2,
            calmness:  1.0, energy:   -1.0, romance:    0.1,
            tension:  -0.9, melancholy: 0.2, euphoria: -0.8,
            solitude:  0.5, warmth:    0.4, darkness:   0.1,
        },
    };

    /* ════════════════════════════════════════════════════════════════
       §3  KEYWORD → EMOTION WEIGHTS
       Each keyword increments one or more dimension scores.
       Organised thematically; lookup is O(1) via flat map.
    ════════════════════════════════════════════════════════════════ */
    const KEYWORD_EMOTION_MAP = (function () {
        const raw = [
            // ── Sadness / grief
            ["sad",         { sadness: 1.0, melancholy: 0.6 }],
            ["sadness",     { sadness: 1.0, melancholy: 0.7 }],
            ["cry",         { sadness: 0.9, melancholy: 0.5 }],
            ["crying",      { sadness: 0.9, melancholy: 0.5 }],
            ["tears",       { sadness: 0.8, melancholy: 0.5 }],
            ["grief",       { sadness: 1.0, darkness: 0.6 }],
            ["sorrow",      { sadness: 0.9, melancholy: 0.6 }],
            ["heartbreak",  { sadness: 0.9, romance: -0.3, tension: 0.4 }],
            ["broken",      { sadness: 0.8, darkness: 0.4 }],
            ["pain",        { sadness: 0.7, tension: 0.5, darkness: 0.3 }],
            ["hurt",        { sadness: 0.7, tension: 0.4 }],
            ["empty",       { sadness: 0.7, darkness: 0.5, solitude: 0.6 }],
            ["lost",        { sadness: 0.6, solitude: 0.5, melancholy: 0.4 }],
            ["miss",        { sadness: 0.6, nostalgia: 0.7 }],
            ["missing",     { sadness: 0.6, nostalgia: 0.7 }],
            ["goodbye",     { sadness: 0.7, nostalgia: 0.5 }],
            ["departed",    { sadness: 0.7, nostalgia: 0.4, darkness: 0.3 }],

            // ── Melancholy / wistfulness
            ["melancholy",  { melancholy: 1.0, sadness: 0.6 }],
            ["melancholic", { melancholy: 1.0, sadness: 0.6 }],
            ["bittersweet", { melancholy: 0.8, nostalgia: 0.7, joy: 0.2 }],
            ["wistful",     { melancholy: 0.8, nostalgia: 0.7 }],
            ["gloomy",      { melancholy: 0.8, sadness: 0.5, darkness: 0.4 }],
            ["gray",        { melancholy: 0.6, calmness: 0.3 }],
            ["grey",        { melancholy: 0.6, calmness: 0.3 }],
            ["heavy",       { melancholy: 0.5, tension: 0.4, sadness: 0.4 }],
            ["moody",       { melancholy: 0.7, tension: 0.3 }],
            ["gloom",       { melancholy: 0.8, darkness: 0.5 }],

            // ── Nostalgia / memory
            ["nostalgia",   { nostalgia: 1.0, melancholy: 0.4 }],
            ["nostalgic",   { nostalgia: 1.0, melancholy: 0.4 }],
            ["memory",      { nostalgia: 0.8, melancholy: 0.3 }],
            ["memories",    { nostalgia: 0.9, melancholy: 0.3 }],
            ["remember",    { nostalgia: 0.8, melancholy: 0.3 }],
            ["childhood",   { nostalgia: 0.9, warmth: 0.4, joy: 0.3 }],
            ["past",        { nostalgia: 0.8, melancholy: 0.3 }],
            ["yesterday",   { nostalgia: 0.7, melancholy: 0.3 }],
            ["old",         { nostalgia: 0.6, melancholy: 0.2 }],
            ["retro",       { nostalgia: 0.7 }],
            ["vintage",     { nostalgia: 0.7, warmth: 0.3 }],

            // ── Calmness / peace
            ["calm",        { calmness: 1.0, tension: -0.6 }],
            ["calm",        { calmness: 1.0 }],
            ["peaceful",    { calmness: 0.9, tension: -0.7 }],
            ["serene",      { calmness: 0.9 }],
            ["still",       { calmness: 0.8, solitude: 0.3 }],
            ["quiet",       { calmness: 0.8, solitude: 0.4 }],
            ["silence",     { calmness: 0.7, solitude: 0.6 }],
            ["gentle",      { calmness: 0.7, warmth: 0.4 }],
            ["soft",        { calmness: 0.7, warmth: 0.3 }],
            ["mellow",      { calmness: 0.8, melancholy: 0.2 }],
            ["tranquil",    { calmness: 0.9, tension: -0.5 }],
            ["breathe",     { calmness: 0.6 }],
            ["breathing",   { calmness: 0.6 }],
            ["relax",       { calmness: 0.8, energy: -0.4 }],
            ["relaxed",     { calmness: 0.8, energy: -0.4 }],
            ["soothing",    { calmness: 0.8, warmth: 0.4 }],
            ["float",       { calmness: 0.6, solitude: 0.3, melancholy: 0.2 }],
            ["drift",       { calmness: 0.6, solitude: 0.4, melancholy: 0.3 }],
            ["drifting",    { calmness: 0.6, solitude: 0.4, melancholy: 0.3 }],

            // ── Night / rain / weather → contextual melancholy/calmness
            ["night",       { melancholy: 0.4, calmness: 0.5, solitude: 0.5, darkness: 0.3 }],
            ["midnight",    { melancholy: 0.5, solitude: 0.6, darkness: 0.4 }],
            ["rain",        { melancholy: 0.6, calmness: 0.5, sadness: 0.4, nostalgia: 0.3 }],
            ["rainy",       { melancholy: 0.6, calmness: 0.5, sadness: 0.4 }],
            ["raining",     { melancholy: 0.6, calmness: 0.5, sadness: 0.4 }],
            ["drizzle",     { melancholy: 0.5, calmness: 0.6, sadness: 0.3 }],
            ["storm",       { tension: 0.5, darkness: 0.5, energy: 0.3 }],
            ["thunder",     { tension: 0.5, darkness: 0.4, energy: 0.4 }],
            ["fog",         { melancholy: 0.6, calmness: 0.4, solitude: 0.5 }],
            ["foggy",       { melancholy: 0.6, calmness: 0.4, solitude: 0.5 }],
            ["winter",      { melancholy: 0.5, calmness: 0.4, sadness: 0.3, nostalgia: 0.3 }],
            ["cold",        { melancholy: 0.5, solitude: 0.4, sadness: 0.3 }],
            ["snow",        { melancholy: 0.4, calmness: 0.5, nostalgia: 0.4 }],
            ["dark",        { darkness: 0.7, melancholy: 0.4, solitude: 0.3 }],
            ["darkness",    { darkness: 0.8, melancholy: 0.4 }],
            ["shadows",     { darkness: 0.6, melancholy: 0.4, solitude: 0.4 }],
            ["moon",        { melancholy: 0.4, calmness: 0.5, solitude: 0.4, nostalgia: 0.3 }],
            ["moonlight",   { melancholy: 0.4, calmness: 0.5, romance: 0.3 }],
            ["stars",       { calmness: 0.4, melancholy: 0.3, nostalgia: 0.4 }],
            ["starlight",   { calmness: 0.5, melancholy: 0.3, romance: 0.3 }],
            ["sunset",      { nostalgia: 0.6, melancholy: 0.4, warmth: 0.4 }],
            ["dawn",        { calmness: 0.6, nostalgia: 0.3, joy: 0.2 }],
            ["autumn",      { melancholy: 0.6, nostalgia: 0.5, calmness: 0.3 }],
            ["fall",        { melancholy: 0.5, nostalgia: 0.5, calmness: 0.3 }],
            ["summer",      { joy: 0.6, energy: 0.4, nostalgia: 0.3, warmth: 0.5 }],
            ["spring",      { joy: 0.5, calmness: 0.4, warmth: 0.4 }],

            // ── Solitude / loneliness
            ["alone",       { solitude: 1.0, sadness: 0.5, melancholy: 0.4 }],
            ["lonely",      { solitude: 0.9, sadness: 0.7, melancholy: 0.5 }],
            ["loneliness",  { solitude: 1.0, sadness: 0.7, melancholy: 0.5 }],
            ["isolated",    { solitude: 0.9, darkness: 0.4 }],
            ["abandoned",   { solitude: 0.8, sadness: 0.7, darkness: 0.4 }],
            ["empty room",  { solitude: 0.9, sadness: 0.6, melancholy: 0.5 }],
            ["no one",      { solitude: 0.7, sadness: 0.5 }],
            ["myself",      { solitude: 0.5, melancholy: 0.2 }],
            ["introspect",  { solitude: 0.5, calmness: 0.3 }],

            // ── Joy / happiness
            ["happy",       { joy: 1.0, energy: 0.5, sadness: -0.7 }],
            ["happiness",   { joy: 1.0, warmth: 0.5 }],
            ["joy",         { joy: 1.0, energy: 0.4 }],
            ["joyful",      { joy: 0.9, energy: 0.4 }],
            ["bright",      { joy: 0.6, energy: 0.4, warmth: 0.4 }],
            ["smile",       { joy: 0.7, warmth: 0.4 }],
            ["laugh",       { joy: 0.8, energy: 0.4 }],
            ["sunshine",    { joy: 0.7, warmth: 0.6, energy: 0.3 }],
            ["sunny",       { joy: 0.6, warmth: 0.5, energy: 0.3 }],
            ["light",       { joy: 0.5, calmness: 0.3 }],
            ["free",        { joy: 0.5, energy: 0.4 }],
            ["freedom",     { joy: 0.5, energy: 0.5 }],
            ["fun",         { joy: 0.8, energy: 0.5 }],
            ["good vibes",  { joy: 0.8, energy: 0.4, warmth: 0.4 }],
            ["blessed",     { joy: 0.6, warmth: 0.6 }],
            ["grateful",    { joy: 0.5, warmth: 0.5, nostalgia: 0.2 }],

            // ── Energy / power
            ["energy",      { energy: 1.0 }],
            ["energetic",   { energy: 1.0, euphoria: 0.3 }],
            ["hype",        { energy: 0.9, euphoria: 0.6 }],
            ["pump",        { energy: 0.8, euphoria: 0.4 }],
            ["power",       { energy: 0.8, tension: 0.3 }],
            ["fire",        { energy: 0.9, tension: 0.4, euphoria: 0.4 }],
            ["adrenaline",  { energy: 1.0, tension: 0.5, euphoria: 0.5 }],
            ["rush",        { energy: 0.8, tension: 0.4 }],
            ["intense",     { energy: 0.7, tension: 0.6 }],
            ["beast",       { energy: 0.9, tension: 0.3 }],
            ["grind",       { energy: 0.7, tension: 0.2 }],
            ["workout",     { energy: 0.9 }],
            ["run",         { energy: 0.7 }],
            ["running",     { energy: 0.7 }],
            ["sprint",      { energy: 0.8 }],

            // ── Romance / love
            ["love",        { romance: 1.0, warmth: 0.6 }],
            ["romantic",    { romance: 1.0, warmth: 0.5 }],
            ["lover",       { romance: 0.9, warmth: 0.4 }],
            ["darling",     { romance: 0.8, warmth: 0.5 }],
            ["kiss",        { romance: 0.8, warmth: 0.4 }],
            ["embrace",     { romance: 0.7, warmth: 0.6 }],
            ["together",    { romance: 0.5, warmth: 0.6 }],
            ["desire",      { romance: 0.8, tension: 0.3 }],
            ["longing",     { romance: 0.6, nostalgia: 0.5, sadness: 0.3 }],
            ["passion",     { romance: 0.8, energy: 0.4, tension: 0.3 }],
            ["intimate",    { romance: 0.8, calmness: 0.4 }],
            ["crush",       { romance: 0.7, tension: 0.3 }],

            // ── Darkness / existential
            ["darkness",    { darkness: 1.0, melancholy: 0.5 }],
            ["void",        { darkness: 0.9, solitude: 0.7, sadness: 0.5 }],
            ["despair",     { darkness: 0.9, sadness: 0.8, solitude: 0.4 }],
            ["hopeless",    { darkness: 0.8, sadness: 0.8 }],
            ["broken",      { darkness: 0.5, sadness: 0.7 }],
            ["abyss",       { darkness: 1.0, solitude: 0.6 }],
            ["fear",        { darkness: 0.6, tension: 0.8 }],
            ["dread",       { darkness: 0.7, tension: 0.8 }],
            ["numb",        { darkness: 0.6, sadness: 0.7, melancholy: 0.5 }],
            ["hollow",      { darkness: 0.6, sadness: 0.6, solitude: 0.5 }],

            // ── Euphoria / ecstasy
            ["euphoria",    { euphoria: 1.0, joy: 0.6, energy: 0.6 }],
            ["ecstasy",     { euphoria: 1.0, joy: 0.5 }],
            ["bliss",       { euphoria: 0.8, joy: 0.7, calmness: 0.3 }],
            ["exhilarate",  { euphoria: 0.9, energy: 0.7 }],
            ["high",        { euphoria: 0.7, energy: 0.5 }],
            ["soar",        { euphoria: 0.7, joy: 0.5, energy: 0.4 }],
            ["peak",        { euphoria: 0.8, energy: 0.6 }],
            ["transcend",   { euphoria: 0.7, calmness: 0.4 }],

            // ── Warmth / comfort
            ["warm",        { warmth: 1.0, calmness: 0.4 }],
            ["warmth",      { warmth: 1.0, calmness: 0.4 }],
            ["cozy",        { warmth: 0.9, calmness: 0.6 }],
            ["home",        { warmth: 0.8, nostalgia: 0.5 }],
            ["comfort",     { warmth: 0.9, calmness: 0.5 }],
            ["safe",        { warmth: 0.7, calmness: 0.6 }],
            ["family",      { warmth: 0.7, nostalgia: 0.4 }],
            ["friend",      { warmth: 0.6, joy: 0.3 }],
            ["hug",         { warmth: 0.8, calmness: 0.3 }],
            ["tender",      { warmth: 0.7, romance: 0.3 }],

            // ── Tension / anxiety
            ["anxious",     { tension: 0.9, darkness: 0.4, energy: 0.3 }],
            ["anxiety",     { tension: 1.0, darkness: 0.4 }],
            ["stress",      { tension: 0.8, energy: 0.3 }],
            ["tense",       { tension: 0.9 }],
            ["nervous",     { tension: 0.8 }],
            ["worry",       { tension: 0.7, darkness: 0.3 }],
            ["uneasy",      { tension: 0.7, darkness: 0.3 }],
            ["restless",    { tension: 0.6, energy: 0.4 }],
            ["edge",        { tension: 0.6, energy: 0.3 }],
        ];
        return new Map(raw);
    })();

    /* ════════════════════════════════════════════════════════════════
       §4  PHRASE / BIGRAM EMOTION MAP
       Multi-word contexts that carry a distinct emotion beyond
       their component keywords.
    ════════════════════════════════════════════════════════════════ */
    const PHRASE_EMOTION_MAP = new Map([
        ["lonely rain night",   { sadness: 0.9, melancholy: 0.8, calmness: 0.5, solitude: 0.8, nostalgia: 0.4 }],
        ["rainy night",         { sadness: 0.7, melancholy: 0.7, calmness: 0.6, solitude: 0.5 }],
        ["late night",          { melancholy: 0.5, solitude: 0.6, calmness: 0.4 }],
        ["dark night",          { darkness: 0.7, melancholy: 0.5, solitude: 0.5 }],
        ["broken heart",        { sadness: 0.9, romance: -0.2, tension: 0.4 }],
        ["fall apart",          { sadness: 0.8, darkness: 0.4, tension: 0.3 }],
        ["let go",              { sadness: 0.5, nostalgia: 0.5, calmness: 0.3 }],
        ["good times",          { nostalgia: 0.7, joy: 0.5, warmth: 0.4 }],
        ["old days",            { nostalgia: 0.8, melancholy: 0.3 }],
        ["missing you",         { sadness: 0.7, nostalgia: 0.7, romance: 0.3 }],
        ["feel alive",          { joy: 0.7, energy: 0.6, euphoria: 0.4 }],
        ["can't sleep",         { tension: 0.5, melancholy: 0.5, solitude: 0.5 }],
        ["wide awake",          { tension: 0.4, solitude: 0.4, energy: 0.3 }],
        ["empty inside",        { sadness: 0.8, darkness: 0.5, solitude: 0.7 }],
        ["warm hug",            { warmth: 1.0, calmness: 0.5 }],
        ["slow down",           { calmness: 0.7, melancholy: 0.2 }],
        ["zone out",            { calmness: 0.6, solitude: 0.4 }],
        ["dance floor",         { euphoria: 0.7, energy: 0.8, joy: 0.5 }],
        ["heart racing",        { tension: 0.5, energy: 0.7, euphoria: 0.3 }],
        ["fall in love",        { romance: 0.9, joy: 0.4, tension: 0.3 }],
    ]);

    /* ════════════════════════════════════════════════════════════════
       §5  DIMENSION → CLOSEST MOOD MAP
       Used to map a parsed emotion vector back to a mood id.
    ════════════════════════════════════════════════════════════════ */
    const DIMENSION_MOOD_AFFINITY = {
        sadness:   ["sad"],
        joy:       ["happy", "party"],
        nostalgia: ["sad", "chill"],
        calmness:  ["chill", "sleep", "focus"],
        energy:    ["energetic", "party"],
        romance:   ["romantic"],
        tension:   ["energetic"],
        melancholy:["sad", "chill"],
        euphoria:  ["party", "energetic", "happy"],
        solitude:  ["sad", "focus"],
        warmth:    ["romantic", "happy"],
        darkness:  ["sad"],
    };

    /* ════════════════════════════════════════════════════════════════
       §6  ZERO VECTOR & HELPERS
    ════════════════════════════════════════════════════════════════ */
    function zeroVector() {
        const v = {};
        DIMENSIONS.forEach(d => (v[d] = 0));
        return v;
    }

    function addWeighted(target, source, weight) {
        for (const dim of DIMENSIONS) {
            if (source[dim] !== undefined) target[dim] += source[dim] * weight;
        }
    }

    function normalise(vec) {
        const max = Math.max(...DIMENSIONS.map(d => Math.abs(vec[d])));
        if (max === 0) return vec;
        const out = {};
        DIMENSIONS.forEach(d => (out[d] = parseFloat((vec[d] / max).toFixed(3))));
        return out;
    }

    function clamp(vec) {
        const out = {};
        DIMENSIONS.forEach(d => (out[d] = Math.max(-1, Math.min(1, vec[d]))));
        return out;
    }

    function dotProduct(a, b) {
        return DIMENSIONS.reduce((sum, d) => sum + (a[d] || 0) * (b[d] || 0), 0);
    }

    function magnitude(v) {
        return Math.sqrt(DIMENSIONS.reduce((s, d) => s + v[d] ** 2, 0));
    }

    function cosineSimilarity(a, b) {
        const mag = magnitude(a) * magnitude(b);
        return mag === 0 ? 0 : dotProduct(a, b) / mag;
    }

    /* ════════════════════════════════════════════════════════════════
       §7  TEXT → EMOTION VECTOR
       Parses a free-text query ("lonely rain night") into a
       weighted emotion vector, checking phrases first, then tokens.
    ════════════════════════════════════════════════════════════════ */
    function textToEmotionVector(text) {
        if (!text || typeof text !== "string") return zeroVector();

        const lower   = text.toLowerCase().trim();
        const vec     = zeroVector();
        let   weight  = 0;

        // Pass 1: Phrase matching (higher weight: 1.5)
        for (const [phrase, emotions] of PHRASE_EMOTION_MAP) {
            if (lower.includes(phrase)) {
                addWeighted(vec, emotions, 1.5);
                weight += 1.5;
            }
        }

        // Pass 2: Token matching (weight: 1.0)
        const tokens = lower.split(/[\s,.\-!?;:'"()/\\]+/).filter(Boolean);
        for (const token of tokens) {
            const emotions = KEYWORD_EMOTION_MAP.get(token);
            if (emotions) {
                addWeighted(vec, emotions, 1.0);
                weight += 1.0;
            }
        }

        // Pass 3: Bigram matching (weight: 1.2)
        for (let i = 0; i < tokens.length - 1; i++) {
            const bigram = `${tokens[i]} ${tokens[i + 1]}`;
            const emotions = KEYWORD_EMOTION_MAP.get(bigram) || PHRASE_EMOTION_MAP.get(bigram);
            if (emotions) {
                addWeighted(vec, emotions, 1.2);
                weight += 1.2;
            }
        }

        // Pass 4: Trigram matching (weight: 1.3)
        for (let i = 0; i < tokens.length - 2; i++) {
            const trigram = `${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`;
            const emotions = PHRASE_EMOTION_MAP.get(trigram);
            if (emotions) {
                addWeighted(vec, emotions, 1.3);
                weight += 1.3;
            }
        }

        if (weight === 0) return zeroVector();
        return clamp(normalise(vec));
    }

    /* ════════════════════════════════════════════════════════════════
       §8  TRACK → EMOTION VECTOR
       Builds an emotion vector from a track's title + artist name
       (and optionally its Last.fm tags array).
    ════════════════════════════════════════════════════════════════ */
    function trackToEmotionVector(track) {
        const parts = [
            track.name   || "",
            track.artist || "",
        ].join(" ");

        const vec  = textToEmotionVector(parts);

        // Blend in tag-derived signal if available
        if (Array.isArray(track.tags) && track.tags.length > 0) {
            const tagVec = textToEmotionVector(track.tags.join(" "));
            // 60% title/artist, 40% tags
            for (const d of DIMENSIONS) {
                vec[d] = parseFloat((vec[d] * 0.6 + tagVec[d] * 0.4).toFixed(3));
            }
        }

        return clamp(vec);
    }

    /* ════════════════════════════════════════════════════════════════
       §9  TEXT → MOOD SCORES
       Returns a map of { moodId → cosine similarity 0..1 }
       for a given free-text input.
    ════════════════════════════════════════════════════════════════ */
    function textToMoodScores(text) {
        const queryVec = textToEmotionVector(text);
        const scores   = {};

        for (const [moodId, moodVec] of Object.entries(MOOD_EMOTION_VECTORS)) {
            const sim = cosineSimilarity(queryVec, moodVec);
            scores[moodId] = parseFloat(Math.max(0, sim).toFixed(3));
        }

        return scores;
    }

    /* ════════════════════════════════════════════════════════════════
       §10  TOP MOOD FROM TEXT
       Returns the single best matching mood id for a query string.
    ════════════════════════════════════════════════════════════════ */
    function textToTopMood(text) {
        const scores = textToMoodScores(text);
        return Object.entries(scores)
            .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "chill";
    }

    /* ════════════════════════════════════════════════════════════════
       §11  EMOTION VECTOR SIMILARITY (track ↔ text query)
       Returns 0–1 similarity between a track and a search phrase.
    ════════════════════════════════════════════════════════════════ */
    function trackQuerySimilarity(track, queryText) {
        const trackVec = trackToEmotionVector(track);
        const queryVec = textToEmotionVector(queryText);
        return parseFloat(Math.max(0, cosineSimilarity(trackVec, queryVec)).toFixed(3));
    }

    /* ════════════════════════════════════════════════════════════════
       §12  MOOD ↔ EMOTION VECTOR SIMILARITY
       Score a mood id against an emotion vector (from text).
       Used to augment engine.js computeVectorBonus with richer signal.
    ════════════════════════════════════════════════════════════════ */
    function moodEmotionScore(moodId, emotionVec) {
        const moodVec = MOOD_EMOTION_VECTORS[moodId];
        if (!moodVec) return 0;
        return parseFloat(Math.max(0, cosineSimilarity(emotionVec, moodVec)).toFixed(3));
    }

    /* ════════════════════════════════════════════════════════════════
       §13  DOMINANT DIMENSIONS
       Return top N dimensions from a vector, sorted by absolute value.
    ════════════════════════════════════════════════════════════════ */
    function dominantDimensions(vec, n = 3) {
        return DIMENSIONS
            .filter(d => vec[d] !== 0)
            .sort((a, b) => Math.abs(vec[b]) - Math.abs(vec[a]))
            .slice(0, n)
            .map(d => ({ dimension: d, value: vec[d] }));
    }

    /* ════════════════════════════════════════════════════════════════
       §14  EXPORT
    ════════════════════════════════════════════════════════════════ */
    global.EmotionVectors = {
        // Core converters
        textToEmotionVector,
        trackToEmotionVector,
        textToMoodScores,
        textToTopMood,
        trackQuerySimilarity,
        moodEmotionScore,
        dominantDimensions,

        // Primitives (for custom use)
        zeroVector,
        cosineSimilarity,
        dotProduct,
        normalise,

        // Data (read-only references)
        DIMENSIONS,
        MOOD_EMOTION_VECTORS,
        KEYWORD_EMOTION_MAP,
        PHRASE_EMOTION_MAP,
        DIMENSION_MOOD_AFFINITY,
    };

})(window);
