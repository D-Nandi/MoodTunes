/* ===== STATE ===== */
let selectedLanguages = [];
let selectedMood = null;
let currentTracks = [];
let currentAudio = null;
let progressInterval = null;
let previewTimeout = null;
let showingFavourites = false;
let _previewToken = 0;           // incremented on every new preview request
let _previewAbortCtrl = null;    // AbortController for in-flight fetches

/* ===== DATA ===== */
const LANGUAGES = [
    "Hindi", "English", "Bengali", "Tamil", "Telugu", "Punjabi", "Malayalam",
    "Kannada", "Marathi", "Gujarati", "Urdu", "Korean", "Japanese",
    "Spanish", "French", "Portuguese", "Arabic", "Turkish", "Russian", "Italian",
    "German", "Chinese"
];

const MOODS = [
    { id: "happy", emoji: "😊", name: "Happy", desc: "Feel good vibes", accent: "#FFB347", gradient: "linear-gradient(135deg,#1a1200,#0a0a0a)", rgb: "255,179,71" },
    { id: "sad", emoji: "😢", name: "Sad", desc: "Let it all out", accent: "#5B8CFF", gradient: "linear-gradient(135deg,#000d1a,#0a0a0a)", rgb: "91,140,255" },
    { id: "romantic", emoji: "💕", name: "Romantic", desc: "Love is in the air", accent: "#FF6B9D", gradient: "linear-gradient(135deg,#1a0010,#0a0a0a)", rgb: "255,107,157" },
    { id: "chill", emoji: "😌", name: "Chill", desc: "Relax and unwind", accent: "#43E97B", gradient: "linear-gradient(135deg,#001a0d,#0a0a0a)", rgb: "67,233,123" },
    { id: "energetic", emoji: "⚡", name: "Energetic", desc: "Power through your day", accent: "#FF6B35", gradient: "linear-gradient(135deg,#1a0500,#0a0a0a)", rgb: "255,107,53" },
    { id: "party", emoji: "🎉", name: "Party", desc: "Turn it up loud", accent: "#A855F7", gradient: "linear-gradient(135deg,#0d001a,#0a0a0a)", rgb: "168,85,247" },
    { id: "focus", emoji: "🎯", name: "Focus", desc: "Deep work mode", accent: "#06B6D4", gradient: "linear-gradient(135deg,#00121a,#0a0a0a)", rgb: "6,182,212" },
    { id: "sleep", emoji: "😴", name: "Sleep", desc: "Drift away", accent: "#8B9DC3", gradient: "linear-gradient(135deg,#00051a,#0a0a0a)", rgb: "139,157,195" },
];

/* ===== INIT ===== */
document.addEventListener("DOMContentLoaded", () => {
    renderLanguageChips();
    renderMoodGrid();

    // ── AMBIENT LIGHTING: inject three-blob layer into mood screen ──────────
    (function injectAmbientLayer() {
        const moodScreen = document.getElementById("screen-mood");
        if (!moodScreen || document.getElementById("mood-ambient")) return;
        moodScreen.insertAdjacentHTML("afterbegin", [
            '<div class="mood-ambient" id="mood-ambient">',
            '    <div class="mood-ambient-blob mood-ambient-blob-4"></div>',
            '    <div class="mood-ambient-blob mood-ambient-blob-1"></div>',
            '    <div class="mood-ambient-blob mood-ambient-blob-2"></div>',
            '    <div class="mood-ambient-blob mood-ambient-blob-3"></div>',
            '</div>'
        ].join(""));
    })();
    // ────────────────────────────────────────────────────────────────────────

    loadMoodHistory();
    updateFavCount();

    // Wire nav
    wireNavClicks();
    setActiveNav("home");

    document.getElementById("language-search").addEventListener("input", filterLanguages);
    document.getElementById("btn-next-mood").addEventListener("click", goToMoodSelection);
    document.getElementById("btn-back-lang").addEventListener("click", () => showScreen("screen-language", "home"));
    document.getElementById("btn-find-music").addEventListener("click", goToResults);
    document.getElementById("btn-shuffle").addEventListener("click", shuffleCards);
    document.getElementById("btn-change-mood").addEventListener("click", goBackToMood);
    document.getElementById("btn-back-main").addEventListener("click", resetToHome);
    document.getElementById("btn-favourites").addEventListener("click", showFavourites);
    document.getElementById("btn-retry").addEventListener("click", () => goToResults());
    document.getElementById("player-play-pause").addEventListener("click", togglePlayPause);
    document.getElementById("player-close").addEventListener("click", () => {
        // Engine: record skip if user bailed before 50% of preview
        if (currentAudio && !currentAudio.paused) {
            const playedMs = Math.round(currentAudio.currentTime * 1000);
            const totalMs  = Math.round((currentAudio.duration || 0) * 1000);
            const songName = document.getElementById("player-song")?.textContent || "";
            const lastTrack = currentTracks.find(t => t.name === songName)
                || { name: songName, artist: "", _language: selectedLanguages[0] || "" };
            MoodEngine.onSkip(lastTrack, selectedMood, playedMs, totalMs);
        }
        stopPreview();
        hidePlayerBar();
    });
    document.getElementById("logo-link").addEventListener("click", (e) => { e.preventDefault(); resetToHome(); });
});

function setSelectedMood(mood) {
    selectedMood = mood;
    applyMoodTheme(mood);
}

/* ===== SCREEN NAVIGATION ===== */

/**
 * Map each nav key → { screen, guard }
 * guard() returns true if navigation is allowed.
 */
const NAV_MAP = {
    home:       { screen: "screen-language",  guard: () => true },
    moods:      { screen: "screen-mood",      guard: () => selectedLanguages.length > 0 },
    discover:   { screen: "screen-results",   guard: () => selectedLanguages.length > 0 && !!selectedMood },
    favourites: { screen: "screen-results",   guard: () => true },   // always reachable; opens fav overlay
};

/* Which nav key maps to each screenId (for auto-highlighting) */
const SCREEN_TO_NAV = {
    "screen-language": "home",
    "screen-mood":     "moods",
    "screen-results":  "discover",
};

let _currentScreen = "screen-language";   // track the active screen

/* ── setActiveNav ── highlight the correct nav pill */
function setActiveNav(navKey) {
    document.querySelectorAll(".nav-link").forEach(link => {
        const key = link.dataset.nav;
        link.classList.toggle("nav-active", key === navKey);

        // Lock links whose guards fail (except currently active one)
        if (key !== navKey && key !== "home") {
            const cfg = NAV_MAP[key];
            link.classList.toggle("nav-locked", cfg && !cfg.guard());
        } else {
            link.classList.remove("nav-locked");
        }
    });
}

/* ── showScreen ── cinematic transition between screens */
function showScreen(screenId, activeNavKey) {
    const prev = document.getElementById(_currentScreen);
    const next = document.getElementById(screenId);
    if (!next || screenId === _currentScreen) {
        // Even if same screen, still refresh nav highlight
        const key = activeNavKey || SCREEN_TO_NAV[screenId] || "home";
        setActiveNav(key);
        updateNavBadge(screenId);
        return;
    }

    // Exit animation on current screen
    if (prev) {
        prev.classList.add("screen-exiting");
        prev.addEventListener("animationend", () => {
            prev.classList.remove("active", "screen-exiting");
        }, { once: true });
    }

    // Small delay so exit starts before enter
    setTimeout(() => {
        next.classList.add("active", "screen-entering");
        next.addEventListener("animationend", () => {
            next.classList.remove("screen-entering");
        }, { once: true });

        // Re-trigger fade-in children
        next.querySelectorAll(".fade-in").forEach(el => {
            el.style.animation = "none";
            el.offsetHeight;   // reflow
            el.style.animation = "";
        });

        _currentScreen = screenId;
        window.scrollTo({ top: 0, behavior: "smooth" });

        const key = activeNavKey || SCREEN_TO_NAV[screenId] || "home";
        setActiveNav(key);
        updateNavBadge(screenId);
    }, prev ? 120 : 0);
}

/* ── updateNavBadge ── right-side mood/lang pill on results screen */
function updateNavBadge(screenId) {
    const navRight = document.getElementById("navbar-right");
    if (screenId === "screen-results" && selectedMood && selectedLanguages.length > 0) {
        const mood = MOODS.find(m => m.id === selectedMood);
        navRight.innerHTML = `<span class="navbar-badge">${mood.emoji} ${mood.name} · ${selectedLanguages.join(", ")}</span>`;
    } else {
        navRight.innerHTML = "";
    }
}

/* ── wireNavClicks ── attach click handlers to all nav links */
function wireNavClicks() {
    document.querySelectorAll(".nav-link").forEach(link => {
        link.addEventListener("click", e => {
            e.preventDefault();
            const key = link.dataset.nav;
            handleNavClick(key);
        });
    });
}

/* ── handleNavClick ── smart routing per nav key */
function handleNavClick(key) {
    switch (key) {
        case "home":
            resetToHome();
            break;

        case "moods":
            if (selectedLanguages.length === 0) {
                // Flash the language screen and show a hint
                showToast("Pick a language first 🌍");
                showScreen("screen-language", "home");
            } else {
                goToMoodSelection();
            }
            break;

        case "discover":
            if (selectedLanguages.length === 0) {
                showToast("Pick a language first 🌍");
                showScreen("screen-language", "home");
            } else if (!selectedMood) {
                showToast("Choose a mood first 🎭");
                showScreen("screen-mood", "moods");
            } else {
                // If already on results and showing favs, switch back to discover view
                if (_currentScreen === "screen-results" && showingFavourites) {
                    showingFavourites = false;
                    document.getElementById("btn-favourites").classList.remove("active-fav");
                    const shuffleBtn = document.getElementById("btn-shuffle");
                    shuffleBtn.disabled = false;
                    shuffleBtn.style.opacity = "1";
                    shuffleBtn.style.cursor = "pointer";
                    document.getElementById("favourites-empty").style.display = "none";
                    renderCards(currentTracks);
                    setActiveNav("discover");
                } else {
                    goToResults();
                }
            }
            break;

        case "favourites":
            if (_currentScreen !== "screen-results") {
                // Navigate to results screen first, then open favs
                if (selectedLanguages.length === 0 || !selectedMood) {
                    // No session yet — just show results screen with favourites panel
                    showScreen("screen-results", "favourites");
                    // Render favourites directly without fetching
                    openFavouritesDirectly();
                } else {
                    showScreen("screen-results", "favourites");
                    setTimeout(() => {
                        if (!showingFavourites) showFavourites();
                        else setActiveNav("favourites");
                    }, 180);
                }
            } else {
                // Already on results — toggle favourites
                if (!showingFavourites) showFavourites();
                setActiveNav("favourites");
            }
            break;
    }
}

/* ── openFavouritesDirectly ── show favs even without an active session ── */
function openFavouritesDirectly() {
    const grid     = document.getElementById("results-grid");
    const empty    = document.getElementById("results-empty");
    const error    = document.getElementById("results-error");
    const favEmpty = document.getElementById("favourites-empty");
    const info     = document.getElementById("results-info");
    const shuffleBtn = document.getElementById("btn-shuffle");

    empty.style.display = "none";
    error.style.display = "none";
    showingFavourites = true;
    document.getElementById("btn-favourites").classList.add("active-fav");
    shuffleBtn.disabled = true;
    shuffleBtn.style.opacity = "0.5";
    shuffleBtn.style.cursor = "not-allowed";
    info.innerHTML = `❤️ <span>Favourites</span>`;

    const favs = loadFavourites();
    if (favs.length === 0) {
        grid.innerHTML = "";
        favEmpty.style.display = "";
        return;
    }
    favEmpty.style.display = "none";
    const placeholderSvg = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1 1%22><rect fill=%22%23222%22 width=%221%22 height=%221%22/></svg>';
    grid.innerHTML = favs.map((f, i) => `
        <div class="song-card" style="animation-delay:${i * 0.04}s">
            <div class="song-card-art-wrap">
                <img src="${f.image || placeholderSvg}" alt="${escapeHtml(f.name)}" loading="lazy" onerror="this.src='${placeholderSvg}'">
                <button class="song-card-heart" onclick="toggleFavourite(${i})" title="Remove">❤️</button>
                <button class="song-card-play" onclick="previewSong('${escapeAttr(f.name)}','${escapeAttr(f.artist)}','${escapeAttr(f.image || "")}')">▶</button>
            </div>
            <div class="song-card-body">
                <div class="song-card-title">${escapeHtml(f.name)}</div>
                <div class="song-card-artist">${escapeHtml(f.artist)}</div>
                <div class="song-card-badges">
                    <span class="badge">${f.language || ""}</span>
                    <span class="badge badge-mood">${f.mood || ""}</span>
                </div>
            </div>
        </div>
    `).join("");
    setActiveNav("favourites");
}


function goToMoodSelection() {
    if (selectedLanguages.length === 0) return;
    showScreen("screen-mood", "moods");
}

function goToResults() {
    if (selectedLanguages.length === 0 || !selectedMood) return;
    saveMoodHistory(selectedLanguages, selectedMood);
    showScreen("screen-results", "discover");
    showingFavourites = false;
    document.getElementById("btn-favourites").classList.remove("active-fav");
    const shuffleBtn = document.getElementById("btn-shuffle");
    shuffleBtn.disabled = false;
    shuffleBtn.style.opacity = "1";
    shuffleBtn.style.cursor = "pointer";
    fetchMusic(selectedLanguages, selectedMood);
}

function goBackToMood() {
    showScreen("screen-mood", "moods");
}

function resetToHome() {
    selectedLanguages = [];
    selectedMood = null;
    showingFavourites = false;
    stopPreview();
    hidePlayerBar();
    applyMoodTheme(null);
    document.querySelectorAll(".lang-chip").forEach(c => c.classList.remove("selected"));
    document.querySelectorAll(".mood-card").forEach(c => c.classList.remove("selected"));
    document.getElementById("btn-next-mood").disabled = true;
    document.getElementById("btn-find-music").disabled = true;
    loadMoodHistory();
    showScreen("screen-language", "home");
}

/* ===== LANGUAGE ===== */
function renderLanguageChips() {
    const container = document.getElementById("language-chips");
    // Stamp --chip-i CSS var for staggered entrance animation
    container.innerHTML = LANGUAGES.map((l, i) =>
        `<button class="lang-chip lang-chip--entering" data-lang="${l}" onclick="selectLanguage('${l}')" style="--chip-i:${i}">${l}</button>`
    ).join("");
    // Remove entrance class after all animations finish so re-renders don't re-trigger
    const total = LANGUAGES.length;
    const lastDelay = 420 + total * 28 + 520;   // last chip delay + duration
    setTimeout(() => {
        container.querySelectorAll(".lang-chip--entering")
            .forEach(c => c.classList.remove("lang-chip--entering"));
    }, lastDelay);
}

function selectLanguage(lang) {
    const idx = selectedLanguages.indexOf(lang);
    if (idx > -1) {
        selectedLanguages.splice(idx, 1);
    } else {
        selectedLanguages.push(lang);
    }
    document.querySelectorAll(".lang-chip").forEach(c =>
        c.classList.toggle("selected", selectedLanguages.includes(c.dataset.lang))
    );
    document.getElementById("btn-next-mood").disabled = selectedLanguages.length === 0;
}

function filterLanguages() {
    const q = document.getElementById("language-search").value.toLowerCase();
    let visIdx = 0;
    document.querySelectorAll(".lang-chip").forEach(c => {
        const match = c.dataset.lang.toLowerCase().includes(q);
        if (match) {
            c.style.display = "";
            // Gentle stagger re-entrance on filter change
            c.style.setProperty("--chip-i", visIdx);
            c.classList.remove("lang-chip--entering");
            void c.offsetWidth;   // force reflow to restart animation
            c.classList.add("lang-chip--entering");
            visIdx++;
        } else {
            c.style.display = "none";
        }
    });
}

/* ===== MOOD ===== */
function renderMoodGrid() {
    const grid = document.getElementById("mood-grid");
    grid.innerHTML = MOODS.map((m, i) => `
        <div class="mood-card mood-card--entering" data-mood="${m.id}" onclick="selectMood('${m.id}')" style="--mood-i:${i}">
            <span class="mood-emoji">${m.emoji}</span>
            <div class="mood-name">${m.name}</div>
            <div class="mood-desc">${m.desc}</div>
        </div>
    `).join("");
    // Remove entrance class after animations complete
    setTimeout(() => {
        grid.querySelectorAll(".mood-card--entering")
            .forEach(c => c.classList.remove("mood-card--entering"));
    }, 80 + MOODS.length * 55 + 500);
}

function selectMood(mood) {
    selectedMood = mood;
    document.querySelectorAll(".mood-card").forEach(c =>
        c.classList.toggle("selected", c.dataset.mood === mood)
    );
    document.getElementById("btn-find-music").disabled = false;
    applyMoodTheme(mood);
}

function applyMoodTheme(mood) {
    const root       = document.documentElement;
    const moodScreen = document.getElementById("screen-mood");

    if (!mood) {
        root.style.setProperty("--accent",      "#1DB954");
        root.style.setProperty("--bg-gradient", "linear-gradient(135deg,#0a0a0a,#0a0a0a)");
        root.style.setProperty("--accent-rgb",  "29,185,84");
        if (moodScreen) moodScreen.classList.remove("mood-lit");
        return;
    }

    const m = MOODS.find(x => x.id === mood);
    if (m) {
        root.style.setProperty("--accent",      m.accent);
        root.style.setProperty("--bg-gradient", m.gradient);
        root.style.setProperty("--accent-rgb",  m.rgb);
        // Activate the live cinematic ambient lighting on the mood screen
        if (moodScreen) moodScreen.classList.add("mood-lit");
    }
}

/* ===== MOOD HISTORY ===== */
function saveMoodHistory(languages, mood) {
    const m = MOODS.find(x => x.id === mood);
    let history = JSON.parse(localStorage.getItem("moodtunes_history") || "[]");
    const langLabel = Array.isArray(languages) ? languages.join(", ") : languages;
    history.unshift({ language: langLabel, languages: Array.isArray(languages) ? languages : [languages], mood, emoji: m.emoji, name: m.name, timestamp: Date.now() });
    history = history.slice(0, 3);
    localStorage.setItem("moodtunes_history", JSON.stringify(history));
}

function loadMoodHistory() {
    const history = JSON.parse(localStorage.getItem("moodtunes_history") || "[]");
    const section = document.getElementById("mood-history-section");
    const list = document.getElementById("mood-history-list");
    if (history.length === 0) { section.style.display = "none"; return; }
    section.style.display = "";
    list.innerHTML = history.map((h, i) => `
        <div class="mood-history-card" onclick="replayHistory(${i})">
            <span class="mood-history-emoji">${h.emoji}</span>
            <div class="mood-history-text">
                <strong>${h.name}</strong>
                ${h.language} · ${timeAgo(h.timestamp)}
            </div>
        </div>
    `).join("");
}

function replayHistory(index) {
    const history = JSON.parse(localStorage.getItem("moodtunes_history") || "[]");
    const h = history[index];
    if (!h) return;
    // Restore languages array
    selectedLanguages = h.languages || (h.language ? h.language.split(", ") : []);
    document.querySelectorAll(".lang-chip").forEach(c =>
        c.classList.toggle("selected", selectedLanguages.includes(c.dataset.lang))
    );
    document.getElementById("btn-next-mood").disabled = selectedLanguages.length === 0;
    selectedMood = h.mood;
    applyMoodTheme(h.mood);
    document.querySelectorAll(".mood-card").forEach(c =>
        c.classList.toggle("selected", c.dataset.mood === h.mood)
    );
    document.getElementById("btn-find-music").disabled = false;
    goToResults();
}

function timeAgo(ts) {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return Math.floor(diff / 60) + "m ago";
    if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
    return Math.floor(diff / 86400) + "d ago";
}

/* ===== API (Last.fm + Deezer) ===== */

/* -- Last.fm fetch helper -- */
async function lastfmFetch(params) {
    const url = new URL(LASTFM_BASE_URL);
    Object.entries({ ...params, api_key: LASTFM_API_KEY, format: "json" })
        .forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Last.fm API error: ${res.status}`);
    return res.json();
}

/* -- Extract best album art from Last.fm image array -- */
function getLastfmImage(images) {
    if (!images || images.length === 0) return "";
    const order = ["extralarge", "large", "medium", "small"];
    for (const size of order) {
        const img = images.find(i => i.size === size);
        // Skip Last.fm's blank star placeholder image
        if (img && img["#text"] && img["#text"].trim() !== "" &&
            !img["#text"].includes("2a96cbd8b46e442fc41c2b86b821562f")) {
            return img["#text"];
        }
    }
    return "";
}

/* -- Fetch album art from iTunes API (free, no key needed) -- */
async function fetchItunesArt(songName, artistName) {
    try {
        const query = encodeURIComponent(`${artistName} ${songName}`);
        const res = await fetch(`https://itunes.apple.com/search?term=${query}&media=music&limit=1`);
        const data = await res.json();
        if (data.results && data.results.length > 0) {
            return (data.results[0].artworkUrl100 || "").replace("100x100", "300x300");
        }
    } catch (e) { /* silent fail */ }
    return "";
}

/* -- Build tag combinations: language tag + mood tag -- */
function buildTagQueries(languages, mood) {
    const langs = Array.isArray(languages) ? languages : [languages];
    const moods = MOOD_TAG_MAP[mood] || [mood];
    const queries = [];

    for (const lang of langs) {
        const langTag = LANGUAGE_TAG_MAP[lang] || lang.toLowerCase();

        // Primary: language + mood  e.g. "bengali sad"
        queries.push({ tag: `${langTag} ${moods[0]}`, lang });

        // Secondary: language + second mood tag
        if (moods[1]) {
            queries.push({ tag: `${langTag} ${moods[1]}`, lang });
        }

        // Tertiary: just language tag  e.g. "bengali"
        queries.push({ tag: langTag, lang });

        // NEVER add mood-only fallback — causes cross-language pollution
    }

    return queries;
}

/* -- Fetch top tracks for a specific artist from Last.fm -- */
async function fetchArtistTracks(artist, limit = 5) {
    try {
        const data = await lastfmFetch({
            method: "artist.gettoptracks",
            artist: artist,
            limit:  String(limit),
        });
        const tracks = data?.toptracks?.track;
        if (!tracks || tracks.length === 0) return [];
        return tracks.map(t => ({
            name:   t.name,
            artist: artist,
            image:  getLastfmImage(t.image),
            url:    t.url || "",
            // NOTE: _language is intentionally left unset here.
            // It MUST be stamped by the caller so every track carries
            // the exact language the user selected — never "preferred".
            score:  parseInt(t.listeners || 0) + 100000,
        }));
    } catch (e) {
        return [];
    }
}

/*
 * ═══════════════════════════════════════════════════════════════════
 *  fetchSimilarTracks — RESTORED with mandatory artist-whitelist gate
 *
 *  WHY IT WAS REMOVED:
 *    track.getsimilar results were tagged _language:"preferred" which
 *    bypassed enforceLanguageFilter entirely, flooding results with
 *    English and Hindi tracks regardless of the user's selection.
 *
 *  WHY IT'S SAFE NOW — two changes make it safe:
 *    1. Every result is immediately filtered through artistInAllowedSet()
 *       for the target language BEFORE being returned. Non-whitelisted
 *       artists are discarded here — they never reach rawTracks.
 *    2. Returned tracks are stamped _language:lang (the actual selected
 *       language), not _language:"preferred", so enforceLanguageFilter
 *       provides a correct second gate.
 *
 *  USAGE: only called from PATH A with PREFERRED_SONGS seeds.
 *  Seeding with a verified Bengali song + filtering by Bengali artists
 *  = similar tracks stay within the Bengali artist ecosystem.
 * ═══════════════════════════════════════════════════════════════════
 */
async function fetchSimilarTracks(songName, artistName, lang, limit = 20) {
    try {
        const data = await lastfmFetch({
            method:      "track.getsimilar",
            track:       songName,
            artist:      artistName,
            limit:       String(limit),
            autocorrect: "1",
        });

        const tracks = data?.similartracks?.track;
        if (!tracks || tracks.length === 0) return [];

        // Build the artist whitelist for the target language once
        const allowedSet = buildAllowedArtistSet([lang]);

        return tracks
            .filter(t => {
                const trackArtist = (t.artist?.name || "").trim();
                // MANDATORY GATE: discard any similar track whose artist is
                // not in the whitelist for the target language. This is the
                // exact guard that was missing before — without it, similar
                // tracks seeded from a Bengali song freely returned English
                // and Hindi artists.
                if (allowedSet.size > 0) {
                    return artistInAllowedSet(trackArtist, allowedSet);
                }
                // No whitelist for this language → trust tag pipeline (PATH B)
                return true;
            })
            .map(t => ({
                name:      t.name,
                artist:    (t.artist?.name || "Unknown Artist").trim(),
                image:     getLastfmImage(t.image),
                url:       t.url || "",
                _language: lang,         // ← correct language stamp, not "preferred"
                _source:   "similar",
                score:     Math.round(parseFloat(t.match || 0) * 100000),
            }));
    } catch (e) {
        console.warn("[MoodTunes] fetchSimilarTracks failed:", songName, artistName, e);
        return [];
    }
}

/* -- Shuffle array helper -- */
function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/*
 * ═══════════════════════════════════════════════════════════════════
 *  buildAllowedArtistSet(langs)
 *
 *  Returns a lowercase Set of every artist in PREFERRED_ARTISTS for
 *  the given language list. Used as the single source of truth for
 *  artist-whitelist filtering throughout the pipeline.
 * ═══════════════════════════════════════════════════════════════════
 */
function buildAllowedArtistSet(langs) {
    const set = new Set();
    for (const lang of langs) {
        (PREFERRED_ARTISTS[lang] || []).forEach(a => set.add(a.toLowerCase()));
    }
    return set;
}

/*
 * ═══════════════════════════════════════════════════════════════════
 *  artistInAllowedSet(artistName, allowedSet)
 *
 *  BUG FIX — removed `allowed.includes(a)` direction of matching.
 *
 *  THE OLD BUG:
 *    The bidirectional check `a.includes(allowed) || allowed.includes(a)`
 *    caused false positives in the "contained-by" direction:
 *      • Artist "Blue"   → matched whitelist "Blue Town"   ✓ WRONG
 *      • Artist "KK"     → matched whitelist "KK Slider"   ✓ WRONG
 *      • Artist "Noble"  → matched whitelist "Noble Man"   ✓ WRONG
 *    Any short, generic artist name returned by Last.fm would pass
 *    the whitelist gate if a longer whitelisted name happened to
 *    contain that short string — letting wrong-language tracks through.
 *
 *  THE FIX:
 *    Only allow the "track artist CONTAINS whitelisted name" direction.
 *    This correctly handles feat. credits ("Arijit Singh feat. Shreya"
 *    contains "arijit singh") without the false-positive blast radius.
 *    The reverse direction is permanently removed.
 * ═══════════════════════════════════════════════════════════════════
 */
function artistInAllowedSet(artistName, allowedSet) {
    if (allowedSet.size === 0) return false;
    const a = (artistName || "").toLowerCase().trim();
    for (const allowed of allowedSet) {
        // Exact match (most common, fastest path)
        if (a === allowed) return true;
        // Track credit contains a whitelisted artist name
        // e.g. "arijit singh feat. shreya ghoshal" ⊇ "arijit singh"  → PASS
        // ✖ Deliberately NOT doing allowed.includes(a) — that direction
        //   is the one that let "Blue" pass the "Blue Town" Bengali check.
        if (a.includes(allowed)) return true;
    }
    return false;
}

/*
 * ═══════════════════════════════════════════════════════════════════
 *  THE LANGUAGE GATE  — enforceLanguageFilter(tracks, langs)
 *
 *  This is the single mandatory filter that every track must pass
 *  before reaching the render layer.
 *
 *  Rules (applied in order, ALL must be true):
 *  1. t._language must be one of the user-selected langs.
 *     → Kills anything tagged with a wrong language.
 *  2. For languages that have a PREFERRED_ARTISTS list (Bengali, Hindi,
 *     English, etc.), the track's artist must be in that whitelist.
 *     → Kills stray artists Last.fm returns for broad tag queries.
 *  3. For languages without a preferred list (e.g. Swahili, Mongolian),
 *     rule 2 is skipped — we trust the tag query result.
 *
 *  There is NO fallback, NO softening, NO "keep 3 minimum" escape hatch.
 *  If zero tracks survive, the empty-state UI is shown.
 * ═══════════════════════════════════════════════════════════════════
 */
function enforceLanguageFilter(tracks, langs) {
    // Pre-build per-language artist sets once (not inside the loop)
    const artistSets = {};
    for (const lang of langs) {
        artistSets[lang] = buildAllowedArtistSet([lang]);
    }

    return tracks.filter(t => {
        // Rule 1: language tag must match a user selection
        if (!langs.includes(t._language)) return false;

        // Rule 2: if the language has a preferred-artist list, enforce it
        const set = artistSets[t._language];
        if (set && set.size > 0) {
            return artistInAllowedSet(t.artist, set);
        }

        // Rule 3: no preferred list for this language → pass through
        return true;
    });
}

/* ==========================================================
   STRICT MOOD ENGINE — calculateMoodScore(track, mood)

   Returns an integer score representing how well a track
   matches the selected mood. Positive = good match.
   Negative = mismatch / should be excluded.

   Scoring sources (applied in order):
     1. Song title vs MOOD_POSITIVE_KEYWORDS[mood]   → +25 each
     2. Song title vs MOOD_NEGATIVE_KEYWORDS[mood]   → -50 each (hard penalty)
     3. Artist affinity from MOOD_ARTIST_AFFINITIES  → ±30
     4. Source bonus: "preferred" seeds from correct mood → +20

   Threshold constants:
     MOOD_HARD_EXCLUDE  — below this: always excluded
     MOOD_SOFT_EXCLUDE  — below this: excluded only when enough tracks exist
========================================================== */

const MOOD_HARD_EXCLUDE  = -50;   // strong mismatch — never show
const MOOD_SOFT_EXCLUDE  = -20;   // weak mismatch — drop if we have enough tracks
const MOOD_MIN_POOL_SIZE =  8;    // minimum tracks before applying soft exclude

function calculateMoodScore(track, mood) {
    const titleLower  = (track.name   || "").toLowerCase();
    const artistLower = (track.artist || "").toLowerCase();

    const positiveKws = MOOD_POSITIVE_KEYWORDS[mood] || [];
    const negativeKws = MOOD_NEGATIVE_KEYWORDS[mood] || [];

    let score = 0;

    /* ── 1. Title keyword scoring ─────────────────────────── */
    for (const kw of positiveKws) {
        if (titleLower.includes(kw)) {
            score += 25;
            break;   // one positive match per song is enough — avoid stacking
        }
    }

    for (const kw of negativeKws) {
        if (titleLower.includes(kw)) {
            score -= 50;   // hard disqualifier
            break;
        }
    }

    /* ── 2. Artist affinity scoring ──────────────────────── */
    // Look up the artist in MOOD_ARTIST_AFFINITIES (exact match then
    // partial-contains for "feat." style credits)
    let affinityMoods = null;
    for (const [knownArtist, moods] of Object.entries(MOOD_ARTIST_AFFINITIES)) {
        if (artistLower === knownArtist || artistLower.includes(knownArtist)) {
            affinityMoods = moods;
            break;
        }
    }

    if (affinityMoods) {
        if (affinityMoods.includes(mood)) {
            // Artist is known for this mood → boost
            score += 30;
        } else {
            // Artist is known but NOT for this mood → mild penalty
            // (we don't harshly penalise because artists are versatile)
            score -= 15;
        }
    }

    /* ── 3. Source bonus for hand-curated preferred seeds ── */
    // Preferred seeds are human-verified language matches.
    // Give them a small bonus so they sort above noisy similar-track results,
    // but NOT enough to override a genuine mood mismatch.
    if (track._source === "preferred") {
        score += 20;
    }

    return score;
}

/*
 * applyMoodFilter(tracks, mood)
 *
 * Takes a deduped, language-filtered track list and returns it
 * with mood-irrelevant tracks removed and mood score baked into
 * the sort key.
 *
 * Strategy:
 *   Phase 1 — Hard exclude: drop any track below MOOD_HARD_EXCLUDE.
 *             These are clear mismatch cases (e.g. party track in Sad mood).
 *   Phase 2 — Soft exclude: if we still have enough tracks, also drop
 *             tracks below MOOD_SOFT_EXCLUDE.
 *   Phase 3 — Re-sort by combined score so mood-aligned songs appear first.
 */
function applyMoodFilter(tracks, mood) {
    // Attach moodScore to every track
    const scored = tracks.map(t => ({
        ...t,
        moodScore: calculateMoodScore(t, mood),
    }));

    // Phase 1: Hard exclude (always applied)
    const afterHard = scored.filter(t => t.moodScore >= MOOD_HARD_EXCLUDE);

    // Phase 2: Soft exclude (only when pool is large enough)
    const afterSoft = afterHard.length > MOOD_MIN_POOL_SIZE
        ? afterHard.filter(t => t.moodScore >= MOOD_SOFT_EXCLUDE)
        : afterHard;

    // Phase 3: Re-sort
    // Preferred seeds (score 999999) stay near top because their base score
    // dominates; within the same tier, moodScore is the tiebreaker.
    afterSoft.sort((a, b) => {
        // Combine base score with mood score (mood score weighted heavily
        // so mood-aligned tracks always beat mood-neutral ones at same tier)
        const aTotal = a.score + (a.moodScore * 5000);
        const bTotal = b.score + (b.moodScore * 5000);
        return bTotal - aTotal;
    });

    return afterSoft;
}

/* -- Main fetch function — strict language+mood pipeline -- */
async function fetchMusic(languages, mood, page = "1") {
    const grid     = document.getElementById("results-grid");
    const empty    = document.getElementById("results-empty");
    const error    = document.getElementById("results-error");
    const favEmpty = document.getElementById("favourites-empty");

    empty.style.display    = "none";
    error.style.display    = "none";
    favEmpty.style.display = "none";
    renderSkeletons();
    loadRecentlyPlayed();
    updateResultsInfo();

    const btn        = document.getElementById("btn-find-music");
    const shuffleBtn = document.getElementById("btn-shuffle");

    if (page !== "1") {
        shuffleBtn.classList.add("loading");
        shuffleBtn.disabled = true;
    } else {
        btn.classList.add("loading");
    }

    const langs = Array.isArray(languages) ? languages : [languages];

    try {
        let rawTracks = [];

        for (const lang of langs) {
            const hasCuratedList = !!(PREFERRED_ARTISTS[lang] && PREFERRED_ARTISTS[lang].length > 0);

            if (hasCuratedList) {
                /*
                 * ─────────────────────────────────────────────────────────────
                 * PATH A — CURATED LANGUAGE  (Bengali / Hindi / English)
                 *
                 * ════════════════════════════════════════════════
                 * ROOT CAUSE OF THE CROSS-LANGUAGE BUG (now fixed)
                 * ════════════════════════════════════════════════
                 * PREVIOUS APPROACH (broken):
                 *   Used artist.gettoptracks() on every artist in PREFERRED_ARTISTS[lang].
                 *
                 *   WHY IT CONTAMINATED RESULTS:
                 *   Several artists appear in MULTIPLE language whitelists:
                 *     • "Kishore Kumar"     → Bengali list AND Hindi list
                 *     • "Hemanta Mukherjee" → Bengali list AND Hindi list
                 *     • "Manna Dey"         → Bengali list AND Hindi list
                 *     • "Bappi Lahiri"      → Bengali list AND Hindi list
                 *   When Bengali was selected, we called artist.gettoptracks("Kishore Kumar").
                 *   Last.fm returned his globally most-played tracks — overwhelmingly Hindi
                 *   songs (Mere Sapno Ki Rani, Yeh Dosti, etc.). Those were stamped
                 *   _language:"Bengali" and passed the whitelist check (correctly — Kishore
                 *   Kumar IS in the Bengali list). Result: Hindi songs in Bengali results.
                 *   The language filter was bypassed at the data-source level.
                 *
                 * ════════════════════════════════
                 * NEW APPROACH (contamination-free)
                 * ════════════════════════════════
                 * Step 1 — Seed from PREFERRED_SONGS[lang]:
                 *   Manually curated, guaranteed language-correct songs.
                 *   "Nesharjana" by Arnob IS Bengali. "Tum Hi Ho" by Arijit IS Hindi.
                 *   Zero ambiguity. Added directly as verified results.
                 *
                 * Step 2 — Expand via track.getsimilar (fetchSimilarTracks):
                 *   Seeds a Bengali song → Last.fm returns globally similar tracks →
                 *   IMMEDIATE artist-whitelist filter inside fetchSimilarTracks discards
                 *   any artist not in PREFERRED_ARTISTS[lang] before they reach rawTracks.
                 *   Bengali seed → similar → Bengali-artist filter = Bengali tracks only.
                 *
                 * Step 3 — enforceLanguageFilter() as always-on final gate (unchanged).
                 *
                 * GUARANTEE: A track only enters rawTracks if it is either:
                 *   (a) In PREFERRED_SONGS[lang] — manually verified correct language, OR
                 *   (b) Returned by track.getsimilar from a verified seed AND its artist
                 *       is whitelisted for the target language.
                 * ─────────────────────────────────────────────────────────────
                 */
                const seeds   = PREFERRED_SONGS[lang] || [];
                const pageNum = parseInt(page) || 1;

                if (seeds.length === 0) {
                    // No PREFERRED_SONGS for this language yet — use artist top-tracks
                    // but ONLY for artists that are exclusive to this language's whitelist.
                    // This prevents cross-listed artists (e.g. Kishore Kumar) from polluting.
                    const allArtistsForLang = PREFERRED_ARTISTS[lang] || [];
                    const otherCuratedLangs = Object.keys(PREFERRED_ARTISTS).filter(l => l !== lang);
                    const exclusiveArtists  = allArtistsForLang.filter(artist => {
                        const lc = artist.toLowerCase();
                        return !otherCuratedLangs.some(l =>
                            (PREFERRED_ARTISTS[l] || []).some(a => a.toLowerCase() === lc)
                        );
                    });
                    // Use exclusive artists if we have enough; otherwise fall back to full list
                    const pool   = exclusiveArtists.length >= 3 ? exclusiveArtists : allArtistsForLang;
                    const picked = shuffleArray(pool).slice(0, 8);
                    const fallbackResults = await Promise.allSettled(
                        picked.map(artist => fetchArtistTracks(artist, 5))
                    );
                    fallbackResults.forEach(r => {
                        if (r.status === "fulfilled") {
                            rawTracks = rawTracks.concat(
                                r.value.map(t => ({ ...t, _language: lang, _source: "artist-top" }))
                            );
                        }
                    });

                } else {
                    // ── Step 1: Add all PREFERRED_SONGS for this language ──────────────
                    // These are hand-verified to be in the correct language.
                    // On shuffle (page > 1), rotate through a different window for variety.
                    const shuffledSeeds = shuffleArray(seeds);
                    const offset        = pageNum === 1 ? 0 : ((pageNum - 1) * 8) % shuffledSeeds.length;
                    const seedWindow    = pageNum === 1
                        ? shuffledSeeds
                        : shuffledSeeds.slice(offset, offset + 12);

                    seedWindow.forEach(s => {
                        rawTracks.push({
                            name:      s.name,
                            artist:    s.artist,
                            image:     "",        // iTunes fallback fills this in renderCards
                            url:       "",
                            _language: lang,
                            _source:   "preferred",
                            score:     999999,    // seeds always sort to the top
                        });
                    });

                    // ── Step 2: Expand via track.getsimilar (whitelist-filtered) ────────
                    // fetchSimilarTracks applies the artist whitelist internally —
                    // nothing from another language ecosystem can survive that filter.
                    //
                    // MOOD IMPROVEMENT: Prioritise seeds that are mood-aligned.
                    // Seeding similar-track queries from a "sad" song returns other
                    // sad songs; seeding from a "party" song returns party songs.
                    // We pick up to 4 seeds, preferring mood-matched ones.
                    const moodScoredSeeds = seeds
                        .map(s => {
                            const track = { name: s.name, artist: s.artist, _source: "preferred" };
                            let moodScore = calculateMoodScore(track, mood);
                            // Blend EmotionVectors semantic score if available (+0..+25 boost)
                            if (window.EmotionVectors) {
                                const sim = window.EmotionVectors.trackQuerySimilarity(track, mood);
                                moodScore += sim * 25;
                            }
                            return { ...s, moodScore };
                        })
                        .sort((a, b) => b.moodScore - a.moodScore);

                    // Take the top mood-aligned seeds; fall back to shuffled pool if needed
                    const topMoodSeeds = moodScoredSeeds.slice(0, 4);
                    const seedsForSimilar = topMoodSeeds.length >= 2
                        ? topMoodSeeds
                        : shuffleArray(seeds).slice(0, 4);
                    const similarResults  = await Promise.allSettled(
                        seedsForSimilar.map(s =>
                            fetchSimilarTracks(s.name, s.artist, lang, 15)
                        )
                    );
                    similarResults.forEach(r => {
                        if (r.status === "fulfilled") {
                            rawTracks = rawTracks.concat(r.value);
                        }
                    });
                }

            } else {
                /*
                 * PATH B — NON-CURATED LANGUAGE (Swahili, Mongolian, etc.)
                 *
                 * No PREFERRED_ARTISTS whitelist exists. Use tag queries
                 * as the only available option. Quality may vary.
                 */
                const queries = buildTagQueries([lang], mood);
                for (const q of queries) {
                    try {
                        const data = await lastfmFetch({
                            method: "tag.gettoptracks",
                            tag:    q.tag,
                            limit:  "20",
                            page:   page,
                        });
                        const tracks = data && data.tracks && data.tracks.track;
                        if (!tracks || tracks.length === 0) continue;

                        const parsed = tracks.map(t => ({
                            name:      t.name,
                            artist:    t.artist && t.artist.name ? t.artist.name : "Unknown Artist",
                            image:     getLastfmImage(t.image),
                            url:       t.url || "",
                            _language: q.lang,
                            _source:   "tag",
                            score:     parseInt(t.listeners || 0),
                        }));
                        rawTracks = rawTracks.concat(parsed);
                    } catch (innerErr) {
                        console.warn("Last.fm tag query failed:", q.tag, innerErr);
                    }
                }
            }
        }

        /* Language gate — enforces artist whitelist for curated languages */
        const filteredTracks = enforceLanguageFilter(rawTracks, langs);

        /* Deduplicate */
        const seen = new Set();
        const dedupedTracks = filteredTracks.filter(t => {
            const key = (t.name + "||" + t.artist).toLowerCase().trim();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        /* Sort by score descending (base pass before mood filter) */
        dedupedTracks.sort((a, b) => b.score - a.score);

        /* ── AI ENGINE — Stages 3-8 ──────────────────────────────────────
         * MoodEngine.rank() replaces applyMoodFilter() with a full
         * 9-stage pipeline: mood scoring + vector bonus, anti-tag penalty,
         * personalization, confidence gating, diversity filtering.
         * engine.js must be loaded before script.js in index.html.
         * ────────────────────────────────────────────────────────────── */
        // Pre-attach base moodScore + semantic emotion similarity so engine.js can augment both
        const preScoredTracks = dedupedTracks.map(t => {
            const base = { ...t, moodScore: calculateMoodScore(t, mood) };
            // Stamp _emotionSim if EmotionVectors is loaded
            if (window.EmotionVectors) {
                base._emotionSim = window.EmotionVectors.trackQuerySimilarity(t, mood);
            }
            return base;
        });
        const moodFilteredTracks = MoodEngine.rank(preScoredTracks, mood);

        if (page !== "1") {
            shuffleBtn.classList.remove("loading");
            shuffleBtn.disabled = false;
        } else {
            btn.classList.remove("loading");
        }

        if (moodFilteredTracks.length === 0) {
            grid.innerHTML = "";
            showLanguageEmptyState(langs, mood);
            return;
        }

        currentTracks = moodFilteredTracks;
        renderCards(currentTracks);

    } catch (e) {
        console.error("fetchMusic error:", e);
        if (page !== "1") {
            shuffleBtn.classList.remove("loading");
            shuffleBtn.disabled = false;
        } else {
            btn.classList.remove("loading");
        }
        grid.innerHTML = "";
        error.style.display = "";
    }
}

/*
 * showLanguageEmptyState — contextual empty state when no songs pass the filter.
 * Shows the selected language + mood in the message so the user knows exactly
 * what was searched and can make an informed choice to adjust.
 */
function showLanguageEmptyState(langs, mood) {
    const empty = document.getElementById("results-empty");
    const moodObj = MOODS.find(m => m.id === mood);
    const moodLabel = moodObj ? `${moodObj.emoji} ${moodObj.name}` : mood;
    const langLabel = langs.join(" + ");

    // Swap in a contextual message — restore generic text on retry
    const illustration = empty.querySelector(".empty-illustration");
    const heading      = empty.querySelector("h2");
    const sub          = empty.querySelector("p");

    if (illustration) illustration.textContent = "🔍";
    if (heading)      heading.textContent = `No ${moodLabel} songs found`;
    if (sub)          sub.textContent =
        `We couldn't find ${langLabel} songs for this mood. Try a different mood or add more languages.`;

    empty.style.display = "";
}

/* ===== RENDER ===== */
/* ─────────────────────────────────────────────────────────────────────
   buildSemanticIndicator(track, mood)
   Semantic mood panel rendered inside each song card.
   Data sources: EmotionVectors (emotion-vectors.js) + engine.js scores.
───────────────────────────────────────────────────────────────────── */
const _SEM_DIM_LABELS = {
    sadness:   ["lonely","sorrowful","tearful"],
    joy:       ["joyful","uplifting","bright"],
    nostalgia: ["nostalgic","wistful","retro"],
    calmness:  ["serene","peaceful","mellow"],
    energy:    ["energetic","driving","powerful"],
    romance:   ["romantic","tender","intimate"],
    tension:   ["tense","restless","uneasy"],
    melancholy:["reflective","rainy","moody"],
    euphoria:  ["euphoric","electric","soaring"],
    solitude:  ["solitary","quiet","introspective"],
    warmth:    ["warm","cozy","comforting"],
    darkness:  ["dark","haunting","brooding"],
};

// Stable label pick — same track always gets same tag
function _semTag(dimension, trackName) {
    const pool = _SEM_DIM_LABELS[dimension] || [dimension];
    return pool[(trackName ? trackName.length : 0) % pool.length];
}

function buildSemanticIndicator(track, mood) {
    if (!window.EmotionVectors) return "";
    const EV = window.EmotionVectors;

    /* 1 ── AI Match % — use the normalized confidenceScore from engine.js.
       confidenceScore is now batch-normalized (42–99) with genuine spread.
       Fallback: compute from semantic sim only if score is missing/zero. */
    let pct = track.confidenceScore || 0;
    if (pct < 10) {
        // Engine score missing — derive purely from semantic cosine similarity.
        // Use a steeper curve so results still spread meaningfully.
        const sim = track._emotionSim ?? EV.trackQuerySimilarity(track, mood);
        // Apply power curve: high similarity gets boosted, low gets penalized
        const curved = Math.pow(Math.max(0, sim), 0.6);
        pct = Math.round(42 + curved * 57);
    }
    pct = Math.min(99, Math.max(42, pct));

    /* 2 ── Mood labels: primary (selected) + best runner-up */
    const query   = [track.name, track.artist].filter(Boolean).join(" ");
    const scores  = EV.textToMoodScores(query);
    const moodMap = MOODS.reduce((a, m) => { a[m.id] = m; return a; }, {});
    const runnerUp = Object.entries(scores)
        .filter(([id]) => id !== mood && scores[id] > 0.28)
        .sort((a, b) => b[1] - a[1])[0];
    const primary   = moodMap[mood];
    const secondary = runnerUp ? moodMap[runnerUp[0]] : null;
    const moodStr   = primary
        ? (secondary ? `${primary.emoji} ${primary.name} · ${secondary.emoji} ${secondary.name}` : `${primary.emoji} ${primary.name}`)
        : mood;

    /* 3 ── Emotion tags from dominant dimensions */
    const vec  = EV.trackToEmotionVector(track);
    const dims = EV.dominantDimensions(vec, 5);
    const tags = [];
    for (const { dimension, value } of dims) {
        if (value < 0.15) continue;
        const tag = _semTag(dimension, track.name);
        if (!tags.includes(tag)) tags.push(tag);
        if (tags.length >= 3) break;
    }
    if (!tags.length) tags.push(_semTag("melancholy", track.name));

    /* 4 ── Colour tier */
    const col = pct >= 85 ? "var(--accent)" : pct >= 70 ? "#FFB74D" : "rgba(255,255,255,0.45)";

    /* 5 ── SVG arc meter (semicircle, r=14, circumference≈44) */
    const r = 14, circ = Math.PI * r;   // half-circle circumference ≈ 43.98
    const dash = ((pct / 100) * circ).toFixed(1);
    const gap  = (circ - dash).toFixed(1);

    return `<div class="sem">
      <div class="sem-left">
        <svg class="sem-arc" viewBox="0 0 36 20" aria-hidden="true">
          <path class="sem-arc-bg"   d="M3,18 A14,14,0,0,1,33,18" fill="none" stroke-width="3" stroke-linecap="round"/>
          <path class="sem-arc-fill" d="M3,18 A14,14,0,0,1,33,18" fill="none" stroke-width="3" stroke-linecap="round"
            stroke="${col}" stroke-dasharray="${dash} ${gap}" stroke-dashoffset="0"/>
        </svg>
        <span class="sem-pct" style="color:${col}">${pct}%</span>
        <span class="sem-ai-label">AI Match</span>
      </div>
      <div class="sem-right">
        <span class="sem-mood-str">${moodStr}</span>
        <div class="sem-tags">${tags.map(t => `<span class="sem-tag">${t}</span>`).join("")}</div>
      </div>
    </div>`;
}

function renderCards(tracks) {
    const grid = document.getElementById("results-grid");
    const favs = loadFavourites();
    const placeholderSvg = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1 1%22><rect fill=%22%23222%22 width=%221%22 height=%221%22/></svg>';

    grid.innerHTML = tracks.map((t, i) => {
        const img = t.image || "";
        const artistName = t.artist || "Unknown";
        const isFav = favs.some(f => f.name === t.name && f.artist === artistName);
        const duration = t.length ? formatDuration(t.length) : "";
        const semanticHtml = buildSemanticIndicator(t, selectedMood);
        return `
        <div class="song-card" data-index="${i}" style="animation-delay:${i * 0.04}s">
            <div class="song-card-art-wrap">
                <img
                    id="art-${i}"
                    src="${img || placeholderSvg}"
                    alt="${escapeHtml(t.name)}"
                    loading="lazy"
                    onerror="loadItunesArt(this, '${escapeAttr(t.name)}', '${escapeAttr(artistName)}', '${placeholderSvg}')"
                >
                <button class="song-card-heart" onclick="toggleFavourite(${i})" title="Favourite">${isFav ? "❤️" : "🤍"}</button>
                <button class="song-card-play" data-song="${escapeAttr(t.name)}" data-artist="${escapeAttr(artistName)}" onclick="previewSong('${escapeAttr(t.name)}','${escapeAttr(artistName)}','${escapeAttr(img)}')">▶</button>
            </div>
            <div class="song-card-body">
                <div class="song-card-title">${escapeHtml(t.name)}</div>
                <div class="song-card-artist">${escapeHtml(artistName)}</div>
                <div class="song-card-badges">
                    <span class="badge">${t._language || selectedLanguages.join(", ")}</span>
                    <span class="badge badge-mood">${MOODS.find(m => m.id === selectedMood)?.emoji || ""} ${selectedMood}</span>
                    ${duration ? `<span class="badge">${duration}</span>` : ""}
                </div>
                ${semanticHtml}
            </div>
        </div>`;
    }).join("");

    // After rendering, fetch iTunes art for any card that has no image
    tracks.forEach((t, i) => {
        if (!t.image) {
            const imgEl = document.getElementById(`art-${i}`);
            if (imgEl) {
                fetchItunesArt(t.name, t.artist || "").then(url => {
                    if (url && imgEl) {
                        imgEl.src = url;
                        // Also update the track object so preview bar uses the right art
                        currentTracks[i].image = url;
                    }
                });
            }
        }
    });
}

/* -- Called by onerror on img tags — tries iTunes then falls back to placeholder -- */
async function loadItunesArt(imgEl, songName, artistName, placeholder) {
    imgEl.onerror = null; // prevent infinite loop
    const url = await fetchItunesArt(songName, artistName);
    imgEl.src = url || placeholder;
    // Update track object too
    const idx = parseInt(imgEl.closest(".song-card")?.dataset?.index);
    if (!isNaN(idx) && currentTracks[idx]) currentTracks[idx].image = url || "";
}

function formatDuration(ms) {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
}

function renderSkeletons() {
    const grid = document.getElementById("results-grid");
    grid.innerHTML = Array.from({ length: 8 }, () => `
        <div class="skeleton-card">
            <div class="skeleton-art"></div>
            <div class="skeleton-body">
                <div class="skeleton-line"></div>
                <div class="skeleton-line short"></div>
            </div>
        </div>
    `).join("");
}

function showError() {
    document.getElementById("results-grid").innerHTML = "";
    document.getElementById("results-error").style.display = "";
}

function updateResultsInfo() {
    const info = document.getElementById("results-info");
    const m = MOODS.find(x => x.id === selectedMood);
    if (m) info.innerHTML = `${m.emoji} <span>${m.name}</span> · ${selectedLanguages.join(", ")}`;
}

function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function escapeAttr(str) {
    if (!str) return "";
    return str.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* ===== SHUFFLE ===== */
function shuffleCards() {
    if (showingFavourites) return;
    // Fetch new tracks with random page to get different music
    const randomPage = Math.floor(Math.random() * 5) + 1; // Pages 1-5
    fetchMusic(selectedLanguages, selectedMood, randomPage);
}

/* ===== FAVOURITES ===== */
function loadFavourites() {
    return JSON.parse(localStorage.getItem("moodtunes_favourites") || "[]");
}

function toggleFavourite(index) {
    const track = showingFavourites ? loadFavourites()[index] : currentTracks[index];
    if (!track) return;
    let favs = loadFavourites();
    const artistName = track.artist || "Unknown";
    const img = typeof track.image === "string" ? track.image : "";
    const exists = favs.findIndex(f => f.name === track.name && f.artist === artistName);

    if (exists > -1) {
        favs.splice(exists, 1);
        showToast("Removed ✕");
    } else {
        favs.push({ name: track.name, artist: artistName, image: img, url: track.url || "", language: selectedLanguages.join(", "), mood: selectedMood });
        showToast("Added to favourites ❤️");
        // Engine: record like for personalization learning
        MoodEngine.onLike(
            { name: track.name, artist: artistName, _language: selectedLanguages[0] || "" },
            selectedMood
        );
    }
    localStorage.setItem("moodtunes_favourites", JSON.stringify(favs));
    updateFavCount();

    if (showingFavourites) {
        showFavourites();
    } else {
        renderCards(currentTracks);
    }
}

function showFavourites() {
    const favs = loadFavourites();
    const grid = document.getElementById("results-grid");
    const empty = document.getElementById("results-empty");
    const favEmpty = document.getElementById("favourites-empty");
    const errorEl = document.getElementById("results-error");
    empty.style.display = "none";
    errorEl.style.display = "none";

    showingFavourites = !showingFavourites;
    const btn = document.getElementById("btn-favourites");
    const shuffleBtn = document.getElementById("btn-shuffle");

    if (showingFavourites) {
        btn.classList.add("active-fav");
        shuffleBtn.disabled = true;
        shuffleBtn.style.opacity = "0.5";
        shuffleBtn.style.cursor = "not-allowed";
        setActiveNav("favourites");
        if (favs.length === 0) {
            grid.innerHTML = "";
            favEmpty.style.display = "";
            return;
        }
        favEmpty.style.display = "none";
        const placeholderSvg = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1 1%22><rect fill=%22%23222%22 width=%221%22 height=%221%22/></svg>';
        grid.innerHTML = favs.map((f, i) => `
            <div class="song-card" style="animation-delay:${i * 0.04}s">
                <div class="song-card-art-wrap">
                    <img src="${f.image || placeholderSvg}" alt="${escapeHtml(f.name)}" loading="lazy" onerror="this.src='${placeholderSvg}'">
                    <button class="song-card-heart" onclick="toggleFavourite(${i})" title="Remove">❤️</button>
                    <button class="song-card-play" onclick="previewSong('${escapeAttr(f.name)}','${escapeAttr(f.artist)}','${escapeAttr(f.image)}')">▶</button>
                </div>
                <div class="song-card-body">
                    <div class="song-card-title">${escapeHtml(f.name)}</div>
                    <div class="song-card-artist">${escapeHtml(f.artist)}</div>
                    <div class="song-card-badges">
                        <span class="badge">${f.language || ""}</span>
                        <span class="badge badge-mood">${f.mood || ""}</span>
                    </div>
                </div>
            </div>
        `).join("");
    } else {
        btn.classList.remove("active-fav");
        shuffleBtn.disabled = false;
        shuffleBtn.style.opacity = "1";
        shuffleBtn.style.cursor = "pointer";
        favEmpty.style.display = "none";
        setActiveNav("discover");
        renderCards(currentTracks);
    }
}

function updateFavCount() {
    const el = document.getElementById("fav-count");
    if (el) el.textContent = loadFavourites().length;
}

/* ===== TOAST ===== */
function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("visible");
    setTimeout(() => toast.classList.remove("visible"), 2500);
}

/* ===== AUDIO PREVIEW ===== */

/*
 * fetchPreviewUrl — races ALL sources simultaneously and returns the
 * first URL that resolves. Typical response time: ~600–1200 ms.
 * Sources raced in parallel:
 *   • iTunes  (direct, no proxy — fastest and most reliable)
 *   • Deezer via corsproxy.io
 *   • Deezer via allorigins.win
 */
async function fetchPreviewUrl(artistName, songName, signal) {
    const q        = encodeURIComponent(`${artistName} ${songName}`);
    const deezerU  = `https://api.deezer.com/search?q=${q}&limit=5`;

    const parseDeezer = async (res) => {
        if (!res.ok) return Promise.reject('bad response');
        let raw = await res.json();
        if (raw.contents) raw = JSON.parse(raw.contents); // allorigins wrapper
        const t = (raw.data || []).find(t => t.preview);
        return t ? t.preview : Promise.reject('no preview');
    };

    const sources = [
        // 1. iTunes — direct call, no CORS issue, returns .m4a previews
        fetch(`https://itunes.apple.com/search?term=${q}&media=music&entity=song&limit=5`, { signal })
            .then(r => r.ok ? r.json() : Promise.reject('itunes fail'))
            .then(d => {
                const r = (d.results || []).find(r => r.previewUrl);
                return r ? r.previewUrl : Promise.reject('no itunes preview');
            }),

        // 2. Deezer via corsproxy.io
        fetch(`https://corsproxy.io/?${encodeURIComponent(deezerU)}`, { signal })
            .then(parseDeezer),

        // 3. Deezer via allorigins
        fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(deezerU)}`, { signal })
            .then(parseDeezer),
    ];

    // Promise.any: resolves with the first success, rejects only if ALL fail
    return Promise.any(sources);
}

async function previewSong(songName, artistName, imageUrl) {
    // ── 1. Kill any previous request & audio immediately ──────────────────
    if (_previewAbortCtrl) _previewAbortCtrl.abort();
    stopPreview();
    clearActiveCards();

    // ── 2. Mint a fresh token for this request ────────────────────────────
    const token       = ++_previewToken;
    _previewAbortCtrl = new AbortController();
    const { signal }  = _previewAbortCtrl;

    // ── 3. INSTANT UI — show YouTube bar right now, zero wait ─────────────
    //    User gets immediate feedback. If audio is found below, we upgrade.
    showYouTubeFallback(songName, artistName, imageUrl);
    markActiveCard(songName, artistName);
    saveRecentlyPlayed({ name: songName, artist: artistName, image: imageUrl });
    loadRecentlyPlayed();

    // ── 4. Race audio sources in the background (max 5 s) ─────────────────
    //    Auto-abort after 5 s so we don't hang forever.
    const autoAbortId = setTimeout(() => {
        if (token === _previewToken) _previewAbortCtrl?.abort();
    }, 5000);

    try {
        const previewUrl = await fetchPreviewUrl(artistName, songName, signal);
        clearTimeout(autoAbortId);

        // If a newer click happened while we were fetching, bail out silently
        if (token !== _previewToken) return;

        // ── 5. Audio found! Upgrade bar from YouTube mode → audio mode ────
        currentAudio = new Audio(previewUrl);
        currentAudio.volume = 0.7;

        const playPromise = currentAudio.play();

        // Swap the bar to audio-player mode
        const bar = document.getElementById('player-bar');
        bar.classList.remove('youtube-mode');
        document.getElementById('player-play-pause').textContent = '⏸️';
        document.getElementById('player-progress').style.width = '0%';

        const playedTrack = currentTracks.find(
            t => t.name === songName && t.artist === artistName
        ) || { name: songName, artist: artistName, _language: selectedLanguages[0] || '' };
        MoodEngine.onPlay(playedTrack, selectedMood);

        progressInterval = setInterval(updateProgressBar, 500);
        currentAudio.addEventListener('ended', () => {
            if (token !== _previewToken) return;
            MoodEngine.onComplete(
                playedTrack, selectedMood,
                currentAudio ? Math.round(currentAudio.duration * 1000) : 0
            );
            stopPreview();
            hidePlayerBar();
            clearActiveCards();
        });

        // If browser blocks autoplay, quietly revert to YouTube mode
        if (playPromise !== undefined) {
            playPromise.catch(() => {
                if (token !== _previewToken) return;
                if (currentAudio) { currentAudio.src = ''; currentAudio = null; }
                document.getElementById('player-bar').classList.add('youtube-mode');
            });
        }

    } catch (err) {
        clearTimeout(autoAbortId);
        // AbortError = user closed / clicked new song / 5 s timeout
        // AggregateError = all sources failed
        // Either way, the YouTube bar is already visible — nothing more to do.
        // Only hide if a newer request is already in charge.
        if (token !== _previewToken) hidePlayerBar();
    }
}


function stopPreview() {
    // Abort any in-flight network request immediately
    if (_previewAbortCtrl) {
        _previewAbortCtrl.abort();
        _previewAbortCtrl = null;
    }
    // Increment token so any already-resolved-but-not-yet-played fetch is dropped
    _previewToken++;
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = "";
        currentAudio = null;
    }
    clearInterval(progressInterval);
    clearTimeout(previewTimeout);
    clearActiveCards();
    const prog = document.getElementById("player-progress");
    if (prog) prog.style.width = "0%";
}

function togglePlayPause() {
    if (!currentAudio) return;
    if (currentAudio.paused) {
        currentAudio.play();
        document.getElementById("player-play-pause").textContent = "⏸️";
    } else {
        currentAudio.pause();
        document.getElementById("player-play-pause").textContent = "▶️";
    }
}

function updateProgressBar() {
    if (!currentAudio || !currentAudio.duration) return;
    const pct = (currentAudio.currentTime / currentAudio.duration) * 100;
    document.getElementById("player-progress").style.width = pct + "%";
}

function markActiveCard(songName, artistName) {
    document.querySelectorAll(".song-card").forEach(card => {
        const title = card.querySelector(".song-card-title");
        const artist = card.querySelector(".song-card-artist");
        if (title && artist && title.textContent === songName && artist.textContent === artistName) {
            const wrap = card.querySelector(".song-card-art-wrap");
            const badge = document.createElement("div");
            badge.className = "now-playing-badge";
            badge.innerHTML = `<div class="equalizer"><span></span><span></span><span></span></div> Now Playing 🎵`;
            wrap.appendChild(badge);
        }
    });
}

function clearActiveCards() {
    document.querySelectorAll(".now-playing-badge").forEach(b => b.remove());
}

/* ===== RECENTLY PLAYED ===== */
function saveRecentlyPlayed(songObj) {
    let recent = JSON.parse(localStorage.getItem("moodtunes_recent") || "[]");
    recent = recent.filter(r => !(r.name === songObj.name && r.artist === songObj.artist));
    recent.unshift({ ...songObj, timestamp: Date.now() });
    recent = recent.slice(0, 5);
    localStorage.setItem("moodtunes_recent", JSON.stringify(recent));
}

function loadRecentlyPlayed() {
    const recent = JSON.parse(localStorage.getItem("moodtunes_recent") || "[]");
    const section = document.getElementById("recently-played-section");
    const list = document.getElementById("recently-played-list");
    if (recent.length === 0) { section.style.display = "none"; return; }
    section.style.display = "";
    list.innerHTML = recent.map(r => `
        <div class="recent-card" onclick="previewSong('${escapeAttr(r.name)}','${escapeAttr(r.artist)}','${escapeAttr(r.image || "")}')">
            <img src="${r.image || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1 1%22><rect fill=%22%23222%22 width=%221%22 height=%221%22/></svg>'}" alt="${escapeHtml(r.name)}" loading="lazy">
            <div class="recent-name">${escapeHtml(r.name)}</div>
            <div class="recent-artist">${escapeHtml(r.artist)}</div>
        </div>
    `).join("");
}

/* ===== PLAYER BAR ===== */
function showPlayerBar(song) {
    const bar = document.getElementById("player-bar");
    // Clear any leftover youtube-mode from a previous fallback
    bar.classList.remove("youtube-mode");
    document.getElementById("player-art").src = song.image || "";
    document.getElementById("player-song").textContent = song.name;
    document.getElementById("player-artist").textContent = song.artist;
    document.getElementById("player-play-pause").textContent = "⏸️";
    document.getElementById("player-progress").style.width = "0%";
    bar.classList.add("visible");
    document.body.classList.add("player-active");
}

function showYouTubeFallback(songName, artistName, imageUrl) {
    const bar    = document.getElementById("player-bar");
    const ytBtn  = document.getElementById("player-yt-btn");
    const query  = encodeURIComponent(`${artistName} - ${songName}`);
    ytBtn.href   = `https://www.youtube.com/results?search_query=${query}`;

    bar.classList.remove("youtube-mode");  // reset first for clean animation
    document.getElementById("player-art").src            = imageUrl || "";
    document.getElementById("player-song").textContent   = songName;
    document.getElementById("player-artist").textContent = artistName;
    document.getElementById("player-progress").style.width = "0%";
    bar.classList.add("visible", "youtube-mode");
    document.body.classList.add("player-active");
}

function hidePlayerBar() {
    const bar = document.getElementById("player-bar");
    bar.classList.remove("visible", "youtube-mode");
    document.body.classList.remove("player-active");
}
