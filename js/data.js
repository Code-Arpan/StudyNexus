/*
  js/data.js  (v2)
  ─────────────────────────────────────────────────────────────
  Global state, localStorage helpers, colour palette, seed data.

  NEW in v2:
    • Resources can have type: 'url' | 'file'
    • File resources store: fileName, fileSize, fileType, fileData (base64)
    • getFileIcon(fileType) → emoji icon for each file category
    • getFileCategory(fileType) → broad category string (PDF, Video, etc.)
    • formatFileSize(bytes) → "1.2 MB" human-readable size
    • currentTypeFilter — sidebar "By Type" filter
*/

/* ── Global state variables ─────────────────────────────── */

// The master array of all saved resources.
// Each resource object looks like one of these:
//
// URL resource:
// { id, type:'url', url, title, category, importance, tags, starred, addedAt }
//
// File resource:
// { id, type:'file', fileName, fileSize, fileType, fileData, title, category, importance, tags, starred, addedAt }
//
// fileData is a base64-encoded string (the entire file contents).
// That's how browsers can store binary files as text in localStorage.
let resources = JSON.parse(localStorage.getItem('study-nexus-v2') || '[]');

let currentFilter     = 'all';   // 'all' | 'starred' | category name
let currentView       = 'grid';  // 'grid' | 'list'
let activeTag         = null;    // tag string or null
let currentTypeFilter = null;    // 'PDF' | 'Video' | 'Image' | etc. or null
let formTags          = [];      // tags being built in the add-resource form
let editTags          = [];      // tags being built in the edit form
let lastAiSuggestion  = null;    // last Cerebras AI response { title, category, tags }

// The file the user has selected in the file tab (a JS File object)
// We read it when the user submits the form.
let selectedFile = null;

/* ── Colour palette for categories ─────────────────────── */
const COLOR_PALETTE = [
  { bg:'rgba(123,104,238,0.12)', color:'#9b8df7', border:'rgba(123,104,238,0.28)' },
  { bg:'rgba(255,140,105,0.12)', color:'#ff8c69', border:'rgba(255,140,105,0.28)' },
  { bg:'rgba(86,217,160,0.12)',  color:'#56d9a0', border:'rgba(86,217,160,0.28)'  },
  { bg:'rgba(255,107,107,0.12)', color:'#ff6b6b', border:'rgba(255,107,107,0.28)' },
  { bg:'rgba(86,180,255,0.12)',  color:'#56b4ff', border:'rgba(86,180,255,0.28)'  },
  { bg:'rgba(255,217,61,0.12)',  color:'#ffd93d', border:'rgba(255,217,61,0.28)'  },
  { bg:'rgba(196,86,255,0.12)',  color:'#c456ff', border:'rgba(196,86,255,0.28)'  },
  { bg:'rgba(255,175,86,0.12)',  color:'#ffaf56', border:'rgba(255,175,86,0.28)'  },
];
const catColors = {};

function getCatColor(cat) {
  if (!catColors[cat]) {
    catColors[cat] = COLOR_PALETTE[Object.keys(catColors).length % COLOR_PALETTE.length];
  }
  return catColors[cat];
}

/* ── Save to localStorage ────────────────────────────────── */
function saveData() {
  try {
    localStorage.setItem('study-nexus-v2', JSON.stringify(resources));
  } catch (e) {
    // localStorage has a ~5MB limit. Large files (videos) may exceed it.
    // We show a friendly error instead of crashing silently.
    if (e.name === 'QuotaExceededError') {
      showToast('Storage full! Try removing large files or use URLs instead.', 'error');
    }
  }
}

/* ── File type helpers ───────────────────────────────────────
   getFileIcon(mimeType)
   Returns an emoji that represents the file type visually.
   mimeType is the browser-detected MIME type like "application/pdf".
──────────────────────────────────────────────────────────── */
function getFileIcon(mimeType) {
  if (!mimeType) return '📄';

  // Image types
  if (mimeType.startsWith('image/')) return '🖼️';

  // Video types
  if (mimeType.startsWith('video/')) return '🎬';

  // Audio types
  if (mimeType.startsWith('audio/')) return '🎵';

  // Check specific application types
  if (mimeType.includes('pdf'))                       return '📕';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📊';
  if (mimeType.includes('word') || mimeType.includes('document'))           return '📝';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet'))       return '📈';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return '📦';
  if (mimeType.includes('text/'))  return '📃';
  if (mimeType.includes('json'))   return '🔧';
  if (mimeType.includes('csv'))    return '📋';

  return '📄'; // generic fallback
}


/* ── getFileTypeLabel(mimeType) ──────────────────────────────
   Returns a short human-readable label used in the "By Type"
   sidebar filter and on file-type badges on cards.
──────────────────────────────────────────────────────────── */
function getFileTypeLabel(mimeType) {
  if (!mimeType) return 'File';
  if (mimeType.startsWith('image/')) return 'Image';
  if (mimeType.startsWith('video/')) return 'Video';
  if (mimeType.startsWith('audio/')) return 'Audio';
  if (mimeType.includes('pdf'))      return 'PDF';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'PPT';
  if (mimeType.includes('word') || mimeType.includes('document'))           return 'DOC';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet'))       return 'Excel';
  if (mimeType.includes('zip') || mimeType.includes('archive'))             return 'Archive';
  if (mimeType.includes('text/') || mimeType.includes('txt'))               return 'Text';
  if (mimeType.includes('csv'))                                              return 'CSV';
  return 'File';
}


/* ── getFileTypeBadgeStyle(label) ────────────────────────────
   Returns inline CSS string for the coloured file-type badge.
   Each type gets a distinct colour so it's easy to tell apart.
──────────────────────────────────────────────────────────── */
function getFileTypeBadgeStyle(label) {
  const styles = {
    'PDF':     'background:rgba(255,107,107,0.15);color:#ff6b6b;border:1px solid rgba(255,107,107,0.3)',
    'PPT':     'background:rgba(255,140,105,0.15);color:#ff8c69;border:1px solid rgba(255,140,105,0.3)',
    'DOC':     'background:rgba(86,180,255,0.15);color:#56b4ff;border:1px solid rgba(86,180,255,0.3)',
    'Excel':   'background:rgba(86,217,160,0.15);color:#56d9a0;border:1px solid rgba(86,217,160,0.3)',
    'Image':   'background:rgba(196,86,255,0.15);color:#c456ff;border:1px solid rgba(196,86,255,0.3)',
    'Video':   'background:rgba(255,217,61,0.15);color:#ffd93d;border:1px solid rgba(255,217,61,0.3)',
    'Audio':   'background:rgba(123,104,238,0.15);color:#9b8df7;border:1px solid rgba(123,104,238,0.3)',
    'Archive': 'background:rgba(255,175,86,0.15);color:#ffaf56;border:1px solid rgba(255,175,86,0.3)',
    'Text':    'background:rgba(255,255,255,0.08);color:#aaaacc;border:1px solid rgba(255,255,255,0.15)',
    'CSV':     'background:rgba(86,217,160,0.15);color:#56d9a0;border:1px solid rgba(86,217,160,0.3)',
  };
  return styles[label] || 'background:rgba(255,255,255,0.08);color:#aaaacc;border:1px solid rgba(255,255,255,0.15)';
}


/* ── formatFileSize(bytes) ───────────────────────────────────
   Converts raw byte count to a human-readable string.
   e.g. 1536000 → "1.5 MB"
──────────────────────────────────────────────────────────── */
function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024)        return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}


/* ── getFavicon / getDomainLetter (for URL resources) ─────── */
function getFavicon(url) {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch { return null; }
}

function getDomainLetter(url) {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return domain.split('.')[0][0].toUpperCase();
  } catch { return '?'; }
}


/* ── Seed sample data ───────────────────────────────────────
   Pre-populates the app on first launch so it doesn't look empty.
   Mix of URL and file resources to demonstrate both modes.
──────────────────────────────────────────────────────────── */
function seedSampleData() {
  if (resources.length > 0) return; // don't overwrite real data

  const samples = [
    {
      id: '1', type: 'url',
      url: 'https://leetcode.com',
      title: 'LeetCode — DSA Practice',
      category: 'DSA', tags: ['algorithms','interview','practice'],
      starred: true, importance: 'critical', addedAt: Date.now() - 3*86400000
    },
    {
      id: '2', type: 'url',
      url: 'https://web.dev/learn/',
      title: 'web.dev — Modern Web Development',
      category: 'Web Dev', tags: ['html','css','performance'],
      starred: false, importance: 'important', addedAt: Date.now() - 2*86400000
    },
    {
      id: '3', type: 'file',
      fileName: 'ML_Lecture_Notes.pdf', fileSize: 2048000,
      fileType: 'application/pdf', fileData: null, // null = demo (no real file)
      title: 'ML Lecture Notes — Week 3',
      category: 'Machine Learning', tags: ['neural-nets','backprop'],
      starred: true, importance: 'critical', addedAt: Date.now() - 86400000
    },
    {
      id: '4', type: 'url',
      url: 'https://missing.csail.mit.edu',
      title: 'MIT Missing Semester',
      category: 'CS Fundamentals', tags: ['shell','git','tools'],
      starred: false, importance: 'normal', addedAt: Date.now() - 5*86400000
    },
    {
      id: '5', type: 'file',
      fileName: 'System_Design_Slides.pptx', fileSize: 5120000,
      fileType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      fileData: null,
      title: 'System Design — Slides Deck',
      category: 'System Design', tags: ['scalability','architecture'],
      starred: false, importance: 'important', addedAt: Date.now() - 86400000
    },
    {
      id: '6', type: 'url',
      url: 'https://neetcode.io',
      title: 'NeetCode — DSA Roadmap',
      category: 'DSA', tags: ['roadmap','patterns'],
      starred: true, importance: 'important', addedAt: Date.now()
    },
  ];

  samples.forEach(r => getCatColor(r.category));
  resources = samples;
  saveData();
}
