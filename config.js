/* ===========================
   MoodTunes — config.js
   API: Last.fm + Deezer (previews)
   Playlist artists: English / Hindi / Bengali
=========================== */

/* ===== LAST.FM API ===== */
const LASTFM_API_KEY  = "07ce4d08e3b7fab39cbf554e397f2889";
const LASTFM_BASE_URL = "https://ws.audioscrobbler.com/2.0/";

/* ===== MOOD → Last.fm TAGS ===== */
const MOOD_TAG_MAP = {
    happy:     ["happy", "feel-good", "pop", "dance", "upbeat", "fun"],
    sad:       ["sad", "melancholy", "heartbreak", "blues", "emotional"],
    romantic:  ["romantic", "love", "r&b", "soul", "slow-jam"],
    chill:     ["chill", "chillout", "lo-fi", "ambient", "relax", "lounge"],
    energetic: ["energetic", "rock", "workout", "power", "punk", "adrenaline"],
    party:     ["party", "edm", "dance", "club", "house", "electro"],
    focus:     ["focus", "classical", "instrumental", "jazz", "study", "concentration"],
    sleep:     ["sleep", "ambient", "meditation", "calm", "lullaby", "relaxing"],
};

/* ===== LANGUAGE → Last.fm TAGS ===== */
const LANGUAGE_TAG_MAP = {
    "Hindi":      "hindi",
    "English":    "english",
    "Bengali":    "bengali",
    "Tamil":      "tamil",
    "Telugu":     "telugu",
    "Punjabi":    "punjabi",
    "Malayalam":  "malayalam",
    "Kannada":    "kannada",
    "Marathi":    "marathi",
    "Gujarati":   "gujarati",
    "Odia":       "odia",
    "Urdu":       "urdu",
    "Korean":     "k-pop",
    "Japanese":   "j-pop",
    "Spanish":    "spanish",
    "French":     "french",
    "Portuguese": "portuguese",
    "Arabic":     "arabic",
    "Turkish":    "turkish",
    "Russian":    "russian",
    "Italian":    "italian",
    "German":     "german",
    "Chinese":    "mandopop",
    "Thai":       "thai",
    "Vietnamese": "v-pop",
    "Indonesian": "indonesian",
    "Swahili":    "swahili",
    "Dutch":      "dutch",
    "Polish":     "polish",
    "Romanian":   "romanian",
    "Greek":      "greek",
    "Czech":      "czech",
    "Swedish":    "swedish",
    "Norwegian":  "norwegian",
    "Danish":     "danish",
    "Finnish":    "finnish",
    "Hungarian":  "hungarian",
    "Hebrew":     "hebrew",
    "Persian":    "persian",
    "Malay":      "malay",
    "Filipino":   "opm",
    "Nepali":     "nepali",
    "Sinhala":    "sinhala",
    "Burmese":    "burmese",
    "Khmer":      "khmer",
    "Lao":        "lao",
    "Mongolian":  "mongolian",
    "Uzbek":      "uzbek",
    "Kazakh":     "kazakh",
    "Georgian":   "georgian",
};

/* ==========================================================
   ✅ PREFERRED ARTISTS — extracted from your personal playlists
   MoodTunes will prioritise songs from these artists
   when the matching language is selected.
========================================================== */

const PREFERRED_ARTISTS = {

    /* ── ENGLISH — Cloud Nine playlist ── */
    "English": [
        "The Weeknd", "Drake", "Travis Scott", "Eminem", "Kanye West",
        "Justin Bieber", "Bruno Mars", "Ed Sheeran", "Harry Styles",
        "Linkin Park", "Nirvana", "Radiohead", "Tame Impala",
        "Imagine Dragons", "One Direction", "Maroon 5", "Arctic Monkeys",
        "The Neighbourhood", "The Smiths", "Lord Huron",
        "Billie Eilish", "Steve Lacy", "Ricky Montgomery", "Benson Boone",
        "Charlie Puth", "Mac Miller", "JVKE", "Melanie Martinez",
        "Bazzi", "Akon", "Daddy Yankee", "Don Omar", "Lil Nas X",
        "Nicki Minaj", "Roddy Ricch", "Kendrick Lamar", "Tupac",
        "Dr. Dre", "Snoop Dogg", "Ice Cube", "Mac DeMarco",
        "Fall Out Boy", "Aerosmith", "Lynyrd Skynyrd", "Queen",
        "Zayn", "Dean Lewis", "John Newman", "Gotye", "Passenger",
        "French Montana", "Swae Lee", "David Guetta", "DJ Snake",
        "Hailee Steinfeld", "Ellie Goulding", "Selena Gomez",
        "Lady Gaga", "Camila Cabello", "Jonas Brothers",
        "OneRepublic", "Keane", "Lukas Graham", "Alex Warren",
        "Fetty Wap", "24kGoldn", "Djo", "KALEO", "Maneskin",
        "Masked Wolf", "Hanumankind", "SZA", "Capital Cities",
        "Artemas", "Wizkid", "Ne-Yo", "Logic", "Dan + Shay",
    ],

    /* ── HINDI — Dil Se Diaries + Retro Rhythms playlists ── */
    "Hindi": [
        "Arijit Singh", "Jubin Nautiyal", "Darshan Raval",
        "Atif Aslam", "Shreya Ghoshal", "Neha Kakkar",
        "Armaan Malik", "Ankit Tiwari", "Mithoon", "Papon",
        "B Praak", "Jasleen Royal", "Guru Randhawa",
        "Badshah", "Yo Yo Honey Singh", "Divine", "Raftaar",
        "Prabh Deep", "Talha Anjum", "Amit Trivedi",
        "Shankar Ehsaan Loy", "Sachin-Jigar", "Vishal-Shekhar",
        "A.R. Rahman", "Pritam", "Tanveer Evan",
        "KK", "Sunidhi Chauhan", "Sonu Nigam",
        "Kishore Kumar", "Lata Mangeshkar", "Mohammed Rafi",
        "Asha Bhosle", "Kumar Sanu", "R.D. Burman",
        "Mohit Chauhan", "Javed Ali", "Rahat Fateh Ali Khan",
        "Shaan", "Udit Narayan", "Alka Yagnik",
        "Himesh Reshammiya", "Nusrat Fateh Ali Khan",
        "Shankar Mahadevan", "Hariharan", "Kavita Krishnamurthy",
        "S.P. Balasubrahmanyam",
    ],

    /* ── BENGALI — BMFC playlist ── */
    "Bengali": [
        "Arnob", "Fossils", "Rupam Islam", "Chandrabindu",
        "Shankhachil", "Odd Signature", "Blue Town",
        "Plascon Bangladesh", "Noble Man", "Partiize",
        "Baghhara", "FRANKLN", "Encore", "Mogbaazi",
        "Ashes Bangladesh", "Live Five", "Hailwood Sessions",
        "Doel Signature", "ArcoNuNu", "Maysical",
        "Methinks", "Muned Hasan Ayon", "Sunidhi Chatterjee",
        "Shunou", "Anupam Roy", "Nachiketa Chakraborty",
        "Srikanta Acharya", "Lopamudra Mitra",
        "Shilajit Majumder", "Usha Uthup",
        "Hemanta Mukherjee", "Manna Dey", "Kishore Kumar",
        "Rabindra Sangeet", "Anjan Dutta", "Bappi Lahiri",
    ],
};

/* ==========================================================
   ✅ PREFERRED SONGS — direct songs from your playlists
   Used as seed for Last.fm similar track recommendations
========================================================== */

const PREFERRED_SONGS = {

    "English": [
        { name: "Blinding Lights",         artist: "The Weeknd" },
        { name: "Starboy",                  artist: "The Weeknd" },
        { name: "Die For You",              artist: "The Weeknd" },
        { name: "Save Your Tears",          artist: "The Weeknd" },
        { name: "Golden Hour",              artist: "JVKE" },
        { name: "Sweater Weather",          artist: "The Neighbourhood" },
        { name: "god's plan",               artist: "Drake" },
        { name: "Hotline Bling",            artist: "Drake" },
        { name: "One Dance",                artist: "Drake" },
        { name: "In the End",               artist: "Linkin Park" },
        { name: "Numb",                     artist: "Linkin Park" },
        { name: "Something In The Way",     artist: "Nirvana" },
        { name: "Smells Like Teen Spirit",  artist: "Nirvana" },
        { name: "Creep",                    artist: "Radiohead" },
        { name: "The Less I Know the Better", artist: "Tame Impala" },
        { name: "Let It Happen",            artist: "Tame Impala" },
        { name: "Believer",                 artist: "Imagine Dragons" },
        { name: "Enemy",                    artist: "Imagine Dragons" },
        { name: "Radioactive",              artist: "Imagine Dragons" },
        { name: "Sign of the Times",        artist: "Harry Styles" },
        { name: "Watermelon Sugar",         artist: "Harry Styles" },
        { name: "Falling",                  artist: "Harry Styles" },
        { name: "Shape of You",             artist: "Ed Sheeran" },
        { name: "Photograph",              artist: "Ed Sheeran" },
        { name: "Perfect",                  artist: "Ed Sheeran" },
        { name: "Thinking Out Loud",        artist: "Ed Sheeran" },
        { name: "Bad Habit",                artist: "Steve Lacy" },
        { name: "Line Without a Hook",      artist: "Ricky Montgomery" },
        { name: "Play Date",                artist: "Melanie Martinez" },
        { name: "beautiful",                artist: "Bazzi" },
        { name: "Uptown Funk",              artist: "Bruno Mars" },
        { name: "When I Was Your Man",      artist: "Bruno Mars" },
        { name: "Talking to the Moon",      artist: "Bruno Mars" },
        { name: "What You Mean",            artist: "Justin Bieber" },
        { name: "Love Yourself",            artist: "Justin Bieber" },
        { name: "Peaches",                  artist: "Justin Bieber" },
        { name: "Lose Yourself",            artist: "Eminem" },
        { name: "Till I Collapse",          artist: "Eminem" },
        { name: "The Real Slim Shady",      artist: "Eminem" },
        { name: "Somebody to Love",         artist: "Queen" },
        { name: "End of Beginning",         artist: "Djo" },
        { name: "Ordinary",                 artist: "Alex Warren" },
        { name: "Blue",                     artist: "Billie Eilish" },
        { name: "As Long As You Love Me",   artist: "Justin Bieber" },
        { name: "Sucker",                   artist: "Jonas Brothers" },
        { name: "Counting Stars",           artist: "OneRepublic" },
        { name: "Astronaut In The Ocean",   artist: "Masked Wolf" },
        { name: "Way Down We Go",           artist: "KALEO" },
    ],

    "Hindi": [
        { name: "Tum Hi Ho",                artist: "Arijit Singh" },
        { name: "Channa Mereya",            artist: "Arijit Singh" },
        { name: "Ae Dil Hai Mushkil",       artist: "Arijit Singh" },
        { name: "Ik Vaari Aa",              artist: "Arijit Singh" },
        { name: "Lut Gaye",                 artist: "Jubin Nautiyal" },
        { name: "Tum Se Hi",                artist: "Mohit Chauhan" },
        { name: "Tera Ban Jaunga",          artist: "Akhil Sachdeva" },
        { name: "Bekhayali",                artist: "Sachet Tandon" },
        { name: "Kesariya",                 artist: "Arijit Singh" },
        { name: "Raataan Lambiyan",         artist: "Jubin Nautiyal" },
        { name: "Shayad",                   artist: "Arijit Singh" },
        { name: "Dil Diyan Gallan",         artist: "Atif Aslam" },
        { name: "Pehli Nazar Mein",         artist: "Atif Aslam" },
        { name: "Kal Ho Naa Ho",            artist: "Sonu Nigam" },
        { name: "Tujh Mein Rab Dikhta Hai", artist: "Shreya Ghoshal" },
        { name: "Kabira",                   artist: "Arijit Singh" },
        { name: "Phir Le Aya Dil",          artist: "Arijit Singh" },
        { name: "Roja",                     artist: "A.R. Rahman" },
        { name: "Dum Maro Dum",             artist: "Asha Bhosle" },
        { name: "Yeh Dosti",                artist: "Kishore Kumar" },
        { name: "Mere Sapno Ki Rani",       artist: "Kishore Kumar" },
        { name: "Lag Ja Gale",              artist: "Lata Mangeshkar" },
        { name: "Aaj Phir Tum Pe",          artist: "Lata Mangeshkar" },
        { name: "Pyar Kiya To Darna Kya",   artist: "Lata Mangeshkar" },
        { name: "Gulabi Aankhen",            artist: "Mohammed Rafi" },
        { name: "Dil Dhadakne Do",          artist: "Mohit Chauhan" },
        { name: "Khairiyat",                artist: "Arijit Singh" },
        { name: "Gerua",                    artist: "Arijit Singh" },
        { name: "Surma",                    artist: "B Praak" },
        { name: "Mann Bharrya",             artist: "B Praak" },
    ],

    "Bengali": [
        { name: "Nesharjana",               artist: "Arnob" },
        { name: "Bhalobasha",               artist: "Arnob" },
        { name: "Ekla Cholo Re",            artist: "Arnob" },
        { name: "Bondhu",                   artist: "Fossils" },
        { name: "Bhalobashi",               artist: "Fossils" },
        { name: "Ghumao",                   artist: "Chandrabindu" },
        { name: "Bhalo Achi Bhalo Theko",   artist: "Anupam Roy" },
        { name: "Amake Amar Moto Thakte Dao", artist: "Anupam Roy" },
        { name: "Bojhena Se Bojhena",       artist: "Arijit Singh" },
        { name: "Phire Esho",               artist: "Nachiketa Chakraborty" },
        { name: "Tumi Acho Tai",            artist: "Srikanta Acharya" },
        { name: "Mon Majhi Re",             artist: "Arnob" },
        { name: "Aguner Poroshmoni",        artist: "Hemanta Mukherjee" },
        { name: "Amar Shonar Bangla",       artist: "Rabindra Sangeet" },
        { name: "Purono Sei Diner Kotha",   artist: "Rabindra Sangeet" },
        { name: "Shono",                    artist: "Odd Signature" },
        { name: "Nikkrishto",               artist: "Plascon Bangladesh" },
        { name: "Proukti",                  artist: "Baghhara" },
        { name: "Purnota",                  artist: "Shunou" },
        { name: "Sei Tumi",                 artist: "Shakkhi" },
    ],
};

/* ==========================================================
   ✅ MOOD ENGINE — Strict Mood Scoring System
   Added to enforce emotional accuracy in recommendations.
   
   Pipeline:
     1. calculateMoodScore(track, mood) scores each track
     2. Positive keyword matches in title → boost score
     3. Negative keyword matches in title → penalize score
     4. Artist affinity → boost if artist known for that mood
     5. Tracks below MOOD_SCORE_THRESHOLD are excluded
========================================================== */

/* ── MOOD_POSITIVE_KEYWORDS ─────────────────────────────── */
const MOOD_POSITIVE_KEYWORDS = {
    happy: [
        "happy", "joy", "joyful", "sunshine", "bright", "smile", "smiling",
        "celebrate", "celebration", "good time", "fun", "alive", "free",
        "uptown", "summer", "wonderful", "amazing", "fantastic", "gold",
        "golden", "shine", "shining", "beautiful day", "lucky", "best day",
        "feeling good", "on top", "can't stop", "sing", "laugh"
    ],
    sad: [
        "sad", "sadness", "cry", "crying", "tears", "teardrop", "lonely",
        "alone", "miss", "missing", "heartbreak", "heartbroken", "broken",
        "pain", "painful", "hurt", "hurting", "empty", "emptiness", "lost",
        "gone", "goodbye", "leave", "leaving", "sorrow", "sorrowful",
        "melancholy", "dark", "darkness", "rain", "cold", "blue", "suffer",
        "suffering", "regret", "silent", "fade", "shadow", "hollow", "numb",
        "ache", "aching", "wither", "end", "ending", "without you",
        "can't go on", "falling apart", "falling down", "last time",
        "never again", "why", "lost it all", "tum hi ho", "channa mereya",
        "bekhayali", "shayad", "khairiyat"
    ],
    romantic: [
        "love", "loving", "lover", "heart", "baby", "darling", "dear",
        "kiss", "kissing", "forever", "together", "mine", "yours", "beautiful",
        "hold", "holding", "arms", "dream", "dreaming", "sweet", "sweetness",
        "angel", "rose", "romance", "romantic", "tender", "cherish",
        "adore", "desire", "embrace", "passion", "devotion", "serenade",
        "with you", "for you", "need you", "want you", "only you",
        "marry", "wedding", "perfect", "perfect night", "tum se hi",
        "dil dhadakne", "pehli nazar", "gerua", "teri ban jaunga"
    ],
    chill: [
        "chill", "chilling", "easy", "drift", "drifting", "float", "floating",
        "rest", "resting", "peace", "peaceful", "quiet", "soft", "mellow",
        "breezy", "calm", "serene", "hazy", "lazy", "lo-fi", "lofi",
        "sunset", "afternoon", "slow down", "unwind", "laid back",
        "good vibes", "vibe", "coffee", "breeze", "wave", "gentle"
    ],
    energetic: [
        "fire", "fired up", "power", "powerful", "run", "running", "fight",
        "rush", "strong", "strength", "wild", "beast", "go", "push", "burn",
        "burning", "drive", "driven", "rock", "roar", "thunder", "charge",
        "fierce", "warrior", "unstoppable", "invincible", "champion",
        "victory", "rise", "rising", "higher", "fuel", "adrenaline",
        "motivation", "grind", "hustle", "won't stop", "can't stop me",
        "believer", "radioactive", "enemy"
    ],
    party: [
        "party", "parties", "club", "clubbing", "night out", "dance", "dancing",
        "shot", "shots", "vibe", "vibing", "bass", "drop", "bounce", "rave",
        "turn up", "lit", "banger", "groove", "disco", "dancefloor",
        "dj", "edm", "remix", "anthem", "weekend", "celebrate", "festival",
        "tonight", "all night", "nonstop", "non stop", "move", "body"
    ],
    focus: [
        "focus", "focused", "mind", "mindful", "clear", "clarity", "deep",
        "zone", "in the zone", "grind", "work", "working", "study", "studying",
        "flow", "concentrate", "concentration", "think", "thinking",
        "silence", "still", "present", "aware", "sharp"
    ],
    sleep: [
        "sleep", "sleeping", "sleepy", "dream", "dreaming", "dreamland",
        "lullaby", "drift", "drifting", "fade", "fading", "still", "stillness",
        "moon", "moonlight", "stars", "starlight", "night", "nightfall",
        "rest", "resting", "quiet", "breathe", "breathing", "calm",
        "soft", "gentle", "tender", "slumber", "close your eyes"
    ],
};

/* ── MOOD_NEGATIVE_KEYWORDS ─────────────────────────────── */
/* These are DISQUALIFIERS — strong mismatch signals */
const MOOD_NEGATIVE_KEYWORDS = {
    happy: [
        "heartbreak", "heartbroken", "crying", "tears", "lonely",
        "alone", "pain", "suffering", "broken", "empty", "numb",
        "sorrow", "melancholy", "goodbye forever", "can't go on"
    ],
    sad: [
        "party", "turn up", "let's go", "dance floor", "banger",
        "shots", "tonight we", "all night long", "celebrate",
        "upbeat", "feel good", "best day", "on top of the world"
    ],
    romantic: [
        "fight", "war", "kill", "destroy", "hate", "anger",
        "violence", "rage", "aggressive", "scream", "slam",
        "breakup", "betrayal", "cheating", "revenge"
    ],
    chill: [
        "party", "club", "rave", "edm", "drop it", "turn up",
        "fire", "rage", "beast mode", "adrenaline", "hype",
        "aggressive", "intense", "scream", "roar"
    ],
    energetic: [
        "sleep", "lullaby", "slow", "calm", "quiet", "soft",
        "rest", "dream", "peaceful", "drift", "fade",
        "melancholy", "sorrow", "crying", "tears"
    ],
    party: [
        "sad", "lonely", "crying", "heartbreak", "empty",
        "sleep", "lullaby", "soft", "quiet", "rest", "alone",
        "goodbye", "melancholy", "numb", "pain", "hurt"
    ],
    focus: [
        "party", "dance", "banger", "turn up", "club",
        "shots", "drinking", "crazy night"
    ],
    sleep: [
        "party", "dance", "energetic", "power", "rock", "metal",
        "loud", "bass drop", "fire", "beast", "hype", "adrenaline",
        "shots", "club", "rave", "banger"
    ],
};

/* ── MOOD_ARTIST_AFFINITIES ─────────────────────────────── */
/*
   Maps artist names (lowercase) → primary moods array.
   Used as a secondary signal when title keywords are inconclusive.
   A score bonus is applied if artist's mood matches selected mood.
   A penalty is applied if they are clearly mismatched.
*/
const MOOD_ARTIST_AFFINITIES = {
    // Sad / Emotional
    "arijit singh":           ["sad", "romantic"],
    "atif aslam":             ["sad", "romantic"],
    "b praak":                ["sad"],
    "jubin nautiyal":         ["sad", "romantic"],
    "mohit chauhan":          ["sad", "romantic"],
    "javed ali":              ["sad", "romantic"],
    "rahat fateh ali khan":   ["sad", "romantic"],
    "dean lewis":             ["sad"],
    "ricky montgomery":       ["sad"],
    "passenger":              ["sad", "chill"],
    "radiohead":              ["sad", "chill"],
    "the neighbourhood":      ["sad", "chill"],
    "billie eilish":          ["sad", "chill"],
    "mac miller":             ["sad", "chill"],
    "lord huron":             ["sad", "chill"],
    "bazzi":                  ["sad", "romantic"],
    "alex warren":            ["sad", "romantic"],
    "gotye":                  ["sad"],
    "keane":                  ["sad"],
    "ankit tiwari":           ["sad", "romantic"],
    "mithoon":                ["sad", "romantic"],
    "nachiketa chakraborty":  ["sad"],
    "arnob":                  ["sad", "chill"],
    "anupam roy":             ["sad", "romantic"],

    // Romantic
    "ed sheeran":             ["romantic", "happy"],
    "bruno mars":             ["romantic", "happy", "party"],
    "justin bieber":          ["romantic", "happy"],
    "harry styles":           ["romantic", "happy"],
    "charlie puth":           ["romantic"],
    "shreya ghoshal":         ["romantic", "sad"],
    "armaan malik":           ["romantic"],
    "neha kakkar":            ["romantic", "happy"],
    "darshan raval":          ["romantic", "sad"],
    "sunidhi chauhan":        ["romantic", "happy"],
    "shreya ghoshal":         ["romantic", "sad"],
    "lata mangeshkar":        ["romantic", "sad"],
    "srikanta acharya":       ["romantic", "sad"],
    "lopamudra mitra":        ["romantic", "sad"],
    "shilajit majumder":      ["sad", "chill"],

    // Happy / Upbeat
    "maroon 5":               ["happy", "romantic", "party"],
    "one direction":          ["happy", "romantic"],
    "jonas brothers":         ["happy", "romantic"],
    "selena gomez":           ["happy", "romantic"],
    "camila cabello":         ["happy", "romantic"],
    "hailee steinfeld":       ["happy", "romantic"],
    "ellie goulding":         ["happy", "romantic"],
    "benson boone":           ["happy", "romantic"],
    "jvke":                   ["happy", "romantic"],
    "onerepublic":            ["happy", "romantic"],
    "capital cities":         ["happy", "party"],
    "lukas graham":           ["happy", "sad"],
    "ne-yo":                  ["romantic", "happy"],
    "wizkid":                 ["happy", "party"],
    "akon":                   ["romantic", "happy"],

    // Energetic / Rock
    "eminem":                 ["energetic", "focus"],
    "kendrick lamar":         ["energetic", "focus"],
    "imagine dragons":        ["energetic"],
    "linkin park":            ["energetic", "sad"],
    "nirvana":                ["sad", "energetic"],
    "aerosmith":              ["energetic"],
    "fall out boy":           ["energetic"],
    "maneskin":               ["energetic", "party"],
    "kaleo":                  ["energetic", "sad"],
    "hanumankind":            ["energetic", "focus"],
    "rupam islam":            ["energetic", "sad"],
    "fossils":                ["energetic", "sad"],

    // Party / Dance
    "drake":                  ["party", "happy"],
    "travis scott":           ["energetic", "party"],
    "kanye west":             ["energetic", "party"],
    "badshah":                ["party", "happy"],
    "yo yo honey singh":      ["party", "happy"],
    "guru randhawa":          ["party", "happy"],
    "divine":                 ["energetic", "party"],
    "raftaar":                ["energetic", "party"],
    "david guetta":           ["party"],
    "dj snake":               ["party"],
    "fetty wap":              ["party", "romantic"],
    "24kgoldn":               ["party", "energetic"],
    "lil nas x":              ["party", "happy"],
    "nicki minaj":            ["party", "energetic"],
    "roddy ricch":            ["party", "energetic"],
    "daddy yankee":           ["party", "energetic"],
    "don omar":               ["party", "energetic"],

    // Chill
    "tame impala":            ["chill", "happy"],
    "mac demarco":            ["chill"],
    "steve lacy":             ["chill", "romantic"],
    "djo":                    ["chill"],
    "artemas":                ["chill", "sad"],
    "masked wolf":            ["chill"],
    "the weeknd":             ["romantic", "party", "sad"],

    // Focus / Instrumental
    "a.r. rahman":            ["focus", "romantic"],
    "shankar ehsaan loy":     ["focus", "romantic"],
};
