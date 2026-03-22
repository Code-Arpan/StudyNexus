/*
  js/ai.js  (v2)
  Cerebras AI integration.

  NEW in v2:
    • AI now suggests TITLE in addition to category + tags
    • Reads the active tab — if File tab, sends the filename to Cerebras
    • lastAiSuggestion now includes { title, category, tags }
    • applyAiSuggestion() also fills the title field
*/

/* ── API key management ────────────────────────────────────── */
function saveApiKey() {
  const key = document.getElementById('cerebras-api-key').value.trim();
  if (key) {
    localStorage.setItem('cerebras-api-key', key);
    showApiKeyStatus('✓ Key saved', 'var(--accent3)');
  } else {
    localStorage.removeItem('cerebras-api-key');
    showApiKeyStatus('', '');
  }
}

function loadApiKey() {
  const saved = localStorage.getItem('cerebras-api-key');
  if (saved) {
    document.getElementById('cerebras-api-key').value = saved;
    showApiKeyStatus('✓ Key loaded', 'var(--accent3)');
  }
}

function showApiKeyStatus(msg, color) {
  const el = document.getElementById('api-key-status');
  el.textContent = msg;
  el.style.color = color;
}

function getApiKey() {
  return document.getElementById('cerebras-api-key').value.trim() || null;
}


/* ── askCerebrasAI() ──────────────────────────────────────────
   Sends resource info to Cerebras and gets back:
     { title, category, tags }

   Determines what to send based on the active tab:
     URL tab  → sends the URL and any title already typed
     File tab → sends the filename and any title already typed
──────────────────────────────────────────────────────────── */
async function askCerebrasAI() {

  // ── Gather context ──
  const currentTitle = document.getElementById('inp-title').value.trim();

  // Figure out what we're describing
  let resourceDescription = '';
  if (activeTab === 'url') {
    const url = document.getElementById('inp-url').value.trim();
    if (!url && !currentTitle) {
      showAiError('Please enter a URL or title first.');
      return;
    }
    resourceDescription = url
      ? `URL: ${url}${currentTitle ? '\nTitle hint: ' + currentTitle : ''}`
      : `Title hint: ${currentTitle}`;
  } else {
    // File tab
    const fileName = selectedFile ? selectedFile.name : '';
    if (!fileName && !currentTitle) {
      showAiError('Please select a file or enter a title first.');
      return;
    }
    resourceDescription = fileName
      ? `Filename: ${fileName}${currentTitle ? '\nTitle hint: ' + currentTitle : ''}`
      : `Title hint: ${currentTitle}`;
  }

  // ── Check API key ──
  const apiKey = getApiKey();
  if (!apiKey) {
    showAiError('No API key found.\nAdd your free Cerebras key in the sidebar first.\nGet one at cloud.cerebras.ai');
    return;
  }

  setAiLoading(true);
  hideAiResult();
  hideAiError();

  // ── Build the prompt ──────────────────────────────────────────
  // We ask for title, category, AND tags this time.
  // Telling the model exactly what format to use gives consistent results.
  const prompt = `You are a helpful assistant that classifies study resources for students.

Given this study resource:
${resourceDescription}

Please suggest:
1. A SHORT, DESCRIPTIVE TITLE (max 8 words). Make it clear and specific.
   - If a URL, describe the site's main purpose.
   - If a filename like "ML_Lecture_Week3.pdf", make a clean title like "ML Lecture — Week 3".
   - Do NOT include the domain name in the title.
2. ONE short category (1-3 words). Examples: "DSA", "Machine Learning", "Web Dev", "System Design", "Math", "Python", "Computer Networks", "Database", "OS", "Physics"
3. THREE to FIVE relevant tags (single words or hyphen-joined, all lowercase).

Respond ONLY with a valid JSON object. No explanation, no markdown. Raw JSON only:
{"title": "your title here", "category": "your category", "tags": ["tag1", "tag2", "tag3"]}`;

  // ── Call Cerebras API ─────────────────────────────────────────
  try {
    const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model:       'llama3.1-8b', // Cerebras fast model
        max_tokens:  250,
        temperature: 0.3,   // low = consistent output
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });

    // ── Check HTTP status ──
    if (!response.ok) {
      const errData = await response.json();
      const errMsg  = errData?.error?.message || 'Unknown error';
      if (response.status === 401) throw new Error('Invalid API key. Check the key in the sidebar.');
      if (response.status === 429) throw new Error('Rate limit reached. Wait a moment and try again.');
      throw new Error(`API error (${response.status}): ${errMsg}`);
    }

    // ── Parse response ──
    const data    = await response.json();
    const rawText = data.choices[0].message.content.trim();

    // Strip markdown fences if any
    const cleanText  = rawText.replace(/```json|```/g, '').trim();
    const suggestion = JSON.parse(cleanText);

    // Validate structure
    if (!suggestion.category || !Array.isArray(suggestion.tags)) {
      throw new Error('AI returned unexpected format. Please try again.');
    }

    // Store and display
    lastAiSuggestion = suggestion;
    showAiResult(suggestion);

  } catch (error) {
    let msg = error.message;
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      msg = 'Network error — check your internet connection.';
    }
    showAiError(msg);
    console.error('Cerebras error:', error);
  }

  setAiLoading(false);
}


/* ── applyAiSuggestion() ──────────────────────────────────────
   Fills in title, category, and tags from the AI suggestion.
   NEW: also fills the title field.
──────────────────────────────────────────────────────────── */
function applyAiSuggestion() {
  if (!lastAiSuggestion) return;

  // Fill title — only if the user hasn't typed one themselves
  // (We don't want to overwrite intentional user input)
  if (lastAiSuggestion.title) {
    const titleField = document.getElementById('inp-title');
    titleField.value = lastAiSuggestion.title;

    // Brief flash animation to show the field was updated
    titleField.style.borderColor = 'var(--accent3)';
    titleField.style.boxShadow   = '0 0 0 3px rgba(86,217,160,0.2)';
    setTimeout(() => {
      titleField.style.borderColor = '';
      titleField.style.boxShadow   = '';
    }, 1200);
  }

  // Fill category
  if (lastAiSuggestion.category) {
    document.getElementById('inp-cat').value = lastAiSuggestion.category;
  }

  // Fill tags
  (lastAiSuggestion.tags || []).forEach(function(tag) {
    const clean = tag.toLowerCase().trim();
    if (clean && !formTags.includes(clean)) formTags.push(clean);
  });
  renderFormTags(); // defined in modal.js

  showToast('AI suggestions applied! ✦', 'success');
  hideAiResult();
}


/* ── UI helpers ──────────────────────────────────────────── */

function setAiLoading(isLoading) {
  const btn     = document.getElementById('ai-suggest-btn');
  const btnIcon = document.getElementById('ai-btn-icon');
  const btnText = document.getElementById('ai-btn-text');
  if (isLoading) {
    btn.disabled        = true;
    btnIcon.innerHTML   = '<span class="ai-spinner"></span>';
    btnText.textContent = 'Thinking…';
  } else {
    btn.disabled        = false;
    btnIcon.innerHTML   = '✦';
    btnText.textContent = 'Suggest with AI';
  }
}

function showAiResult(suggestion) {
  const resultEl  = document.getElementById('ai-result');
  const contentEl = document.getElementById('ai-result-content');

  // Title chip (new)
  const titleChip = suggestion.title
    ? `<div class="ai-title-chip">✏ ${suggestion.title}</div>`
    : '';

  // Category chip
  const catChip = suggestion.category
    ? `<span class="ai-cat-chip">📁 ${suggestion.category}</span>`
    : '';

  // Tag chips
  const tagsHTML = (suggestion.tags || []).map(t =>
    `<span class="ai-tag-chip">#${t}</span>`
  ).join('');

  contentEl.innerHTML = `
    ${titleChip}
    ${catChip}
    <div class="ai-tags-row">${tagsHTML}</div>`;

  resultEl.style.display = 'block';
}

function hideAiResult() {
  document.getElementById('ai-result').style.display = 'none';
  lastAiSuggestion = null;
}

function showAiError(message) {
  const el = document.getElementById('ai-error');
  el.textContent = '⚠ ' + message;
  el.style.display = 'block';
}

function hideAiError() {
  const el = document.getElementById('ai-error');
  el.style.display = 'none';
  el.textContent   = '';
}
