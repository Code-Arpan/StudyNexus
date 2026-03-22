/*
  ╔══════════════════════════════════════════════════════════════╗
  ║                      js/data.js                              ║
  ║                                                              ║
  ║  This file is the "brain" of the app's data layer.           ║
  ║  It handles:                                                 ║
  ║    1. Loading & saving resources to localStorage             ║
  ║    2. The colour palette for categories                      ║
  ║    3. Seed (sample) data on first load                       ║
  ║                                                              ║
  ║  IMPORTANT: This file must be loaded FIRST (before all       ║
  ║  other JS files) because they all depend on the              ║
  ║  `resources` array and helper functions defined here.        ║
  ╚══════════════════════════════════════════════════════════════╝
*/


/* ================================================================
   GLOBAL STATE VARIABLES
   These are declared with "let" so any JS file can modify them.
   They act as the app's "memory" while it's running.
================================================================ */

// The master array of all saved resources.
// Each resource is an object like:
// {
//   id: "1715000000000",  ← timestamp-based unique ID
//   url: "https://…",
//   title: "My Resource",
//   category: "DSA",
//   importance: "normal",
//   tags: ["algorithms", "graphs"],
//   starred: false,
//   addedAt: 1715000000000
// }
let resources = JSON.parse(localStorage.getItem('study-nexus') || '[]');
//              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//              localStorage.getItem returns a string (or null).
//              JSON.parse converts the string back to a JavaScript array.
//              If nothing is saved yet, we default to an empty array [].

// Currently active filter: 'all' | 'starred' | '<category name>'
let currentFilter = 'all';

// Currently active view: 'grid' | 'list'
let currentView = 'grid';

// The tag that's currently being filtered by (null = show all)
let activeTag = null;

// Tags the user has added in the form (before saving)
let formTags = [];

// Stores the last AI suggestion { category, tags } so "Apply" can use it
let lastAiSuggestion = null;


/* ================================================================
   COLOUR PALETTE
   Each category gets a unique colour theme automatically.
   We cycle through these colours in order.
================================================================ */

// An array of colour theme objects. Each has:
//   bg     → transparent tinted background for badges
//   color  → the solid highlight colour for text
//   border → a slightly visible border
const COLOR_PALETTE = [
  { bg: 'rgba(123,104,238,0.12)', color: '#9b8df7', border: 'rgba(123,104,238,0.28)' }, // purple
  { bg: 'rgba(255,140,105,0.12)', color: '#ff8c69', border: 'rgba(255,140,105,0.28)' }, // orange
  { bg: 'rgba(86,217,160,0.12)',  color: '#56d9a0', border: 'rgba(86,217,160,0.28)'  }, // green
  { bg: 'rgba(255,107,107,0.12)', color: '#ff6b6b', border: 'rgba(255,107,107,0.28)' }, // red
  { bg: 'rgba(86,180,255,0.12)',  color: '#56b4ff', border: 'rgba(86,180,255,0.28)'  }, // blue
  { bg: 'rgba(255,217,61,0.12)',  color: '#ffd93d', border: 'rgba(255,217,61,0.28)'  }, // yellow
  { bg: 'rgba(196,86,255,0.12)',  color: '#c456ff', border: 'rgba(196,86,255,0.28)'  }, // violet
  { bg: 'rgba(255,175,86,0.12)',  color: '#ffaf56', border: 'rgba(255,175,86,0.28)'  }, // amber
];

// This object maps category name → colour theme.
// e.g. { "DSA": { bg: "…", color: "…", border: "…" } }
const catColors = {};


/* ================================================================
   getCatColor(cat)
   Returns the colour theme object for a given category name.
   If the category hasn't been seen before, it assigns the next
   available colour from the palette.

   Example usage:
     const theme = getCatColor('DSA');
     element.style.background = theme.bg;
     element.style.color = theme.color;
================================================================ */
function getCatColor(cat) {
  if (!catColors[cat]) {
    // How many categories have colours already?
    const assignedCount = Object.keys(catColors).length;

    // Pick the next colour, wrapping around with modulo (%)
    // e.g. if we have 8 colours and this is the 9th category,
    // 8 % 8 = 0, so we wrap back to the first colour
    catColors[cat] = COLOR_PALETTE[assignedCount % COLOR_PALETTE.length];
  }
  return catColors[cat];
}


/* ================================================================
   saveData()
   Converts the `resources` array to a JSON string and saves it
   in the browser's localStorage under the key 'study-nexus'.

   localStorage is like a tiny database built into the browser.
   It persists even after the tab/window is closed.
   Maximum storage: ~5MB (plenty for text data).
================================================================ */
function saveData() {
  // JSON.stringify converts array/object → string
  // e.g. [{id:"1", title:"Hello"}] → '[{"id":"1","title":"Hello"}]'
  localStorage.setItem('study-nexus', JSON.stringify(resources));
}


/* ================================================================
   FAVICON HELPERS
   These functions help show a website's icon next to each resource.
================================================================ */

// getFavicon(url)
// Returns a Google favicon service URL for any domain.
// Google hosts favicons for virtually every website for free!
// e.g. getFavicon("https://youtube.com") returns:
//   "https://www.google.com/s2/favicons?domain=youtube.com&sz=32"
function getFavicon(url) {
  try {
    const domain = new URL(url).hostname; // extracts "youtube.com"
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return null; // URL was invalid, return null
  }
}

// getDomainLetter(url)
// Returns the first letter of the domain as a fallback when
// the favicon image fails to load.
// e.g. getDomainLetter("https://youtube.com") → "Y"
function getDomainLetter(url) {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    // domain.split('.')[0] gets just "youtube" from "youtube.com"
    // [0] gets the first character: "y"
    // .toUpperCase() makes it "Y"
    return domain.split('.')[0][0].toUpperCase();
  } catch {
    return '?'; // fallback letter
  }
}


/* ================================================================
   SEED DATA
   Sample resources shown on the very first load.
   If any resources already exist, this function does nothing.
================================================================ */
function seedSampleData() {
  // Don't overwrite existing data
  if (resources.length > 0) return;

  const samples = [
    {
      id: '1',
      url: 'https://leetcode.com',
      title: 'LeetCode — DSA Practice',
      category: 'DSA',
      tags: ['algorithms', 'interview', 'practice'],
      starred: true,
      importance: 'critical',
      addedAt: Date.now() - 3 * 86400000 // 3 days ago (86400000ms = 1 day)
    },
    {
      id: '2',
      url: 'https://web.dev/learn/',
      title: 'web.dev — Modern Web Development',
      category: 'Web Dev',
      tags: ['html', 'css', 'performance'],
      starred: false,
      importance: 'important',
      addedAt: Date.now() - 2 * 86400000
    },
    {
      id: '3',
      url: 'https://www.fast.ai',
      title: 'fast.ai — Practical Deep Learning',
      category: 'Machine Learning',
      tags: ['deep-learning', 'pytorch', 'ai'],
      starred: true,
      importance: 'critical',
      addedAt: Date.now() - 86400000
    },
    {
      id: '4',
      url: 'https://missing.csail.mit.edu',
      title: 'MIT Missing Semester of CS',
      category: 'CS Fundamentals',
      tags: ['shell', 'git', 'tools'],
      starred: false,
      importance: 'normal',
      addedAt: Date.now() - 5 * 86400000
    },
    {
      id: '5',
      url: 'https://docs.python.org/3/',
      title: 'Python 3 Official Documentation',
      category: 'Python',
      tags: ['python', 'reference', 'stdlib'],
      starred: false,
      importance: 'normal',
      addedAt: Date.now() - 86400000
    },
    {
      id: '6',
      url: 'https://neetcode.io',
      title: 'NeetCode — DSA Roadmap & Solutions',
      category: 'DSA',
      tags: ['roadmap', 'patterns', 'interview'],
      starred: true,
      importance: 'important',
      addedAt: Date.now()
    },
  ];

  // Pre-assign colours so categories are coloured from the start
  samples.forEach(function(r) {
    getCatColor(r.category);
  });

  resources = samples;
  saveData();
}
