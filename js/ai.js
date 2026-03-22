/*
  ╔══════════════════════════════════════════════════════════════╗
  ║                        js/ai.js                              ║
  ║                                                              ║
  ║  Cerebras AI Integration                                     ║
  ║                                                              ║
  ║  What this file does:                                        ║
  ║    • Saves and loads the user's Cerebras API key             ║
  ║    • Sends the resource URL + title to Cerebras AI           ║
  ║    • Parses the AI's response (JSON with category + tags)    ║
  ║    • Displays the suggestions in the modal                   ║
  ║    • Lets the user apply the suggestions with one click      ║
  ║                                                              ║
  ║  How to get a Cerebras API key (it's free!):                 ║
  ║    1. Go to https://cloud.cerebras.ai                        ║
  ║    2. Sign up for a free account                             ║
  ║    3. Go to API Keys section                                 ║
  ║    4. Create a new key and paste it in the sidebar           ║
  ║                                                              ║
  ║  Cerebras API docs: https://inference-docs.cerebras.ai       ║
  ╚══════════════════════════════════════════════════════════════╝
*/


/* ================================================================
   API KEY MANAGEMENT
   We store the key in localStorage so users don't have to
   re-enter it every time they open the app.
================================================================ */

// saveApiKey()
// Called every time the user types in the API key input (oninput).
// Saves the key to localStorage and updates the status indicator.
function saveApiKey() {
  const input = document.getElementById('cerebras-api-key');
  const key   = input.value.trim();

  if (key) {
    // Save to localStorage under the key 'cerebras-api-key'
    localStorage.setItem('cerebras-api-key', key);
    showApiKeyStatus('✓ Key saved', 'var(--accent3)');
  } else {
    // If the field is cleared, remove the saved key
    localStorage.removeItem('cerebras-api-key');
    showApiKeyStatus('', '');
  }
}


// loadApiKey()
// Called when the app starts (app.js).
// Restores the saved key into the input field.
function loadApiKey() {
  const savedKey = localStorage.getItem('cerebras-api-key');
  if (savedKey) {
    document.getElementById('cerebras-api-key').value = savedKey;
    showApiKeyStatus('✓ Key loaded', 'var(--accent3)');
  }
}


// showApiKeyStatus(message, colour)
// Updates the small status text below the API key input.
function showApiKeyStatus(message, colour) {
  const statusEl = document.getElementById('api-key-status');
  statusEl.textContent = message;
  statusEl.style.color = colour;
}


// getApiKey()
// Returns the current API key from the input field.
// Returns null if no key is set.
function getApiKey() {
  const key = document.getElementById('cerebras-api-key').value.trim();
  return key || null;
}


/* ================================================================
   askCerebrasAI()
   The main AI function. When the user clicks "Suggest with AI":
     1. Reads URL and Title from the form
     2. Calls the Cerebras API with a carefully crafted prompt
     3. Parses the JSON response
     4. Displays the suggestion in the modal
     5. Stores the suggestion in `lastAiSuggestion` for Apply button

   Cerebras uses the same API format as OpenAI, so it's easy
   to understand if you've seen the OpenAI API before.
================================================================ */
async function askCerebrasAI() {
  // ── Get form values ──────────────────────────────────────────
  const url   = document.getElementById('inp-url').value.trim();
  const title = document.getElementById('inp-title').value.trim();

  // ── Validate — need at least something to work with ──────────
  if (!url && !title) {
    showAiError('Please enter a URL or title first, then ask AI to suggest.');
    return;
  }

  // ── Check for API key ─────────────────────────────────────────
  const apiKey = getApiKey();
  if (!apiKey) {
    showAiError('No API key found. Please add your Cerebras API key in the sidebar first.\nGet a free key at cloud.cerebras.ai');
    return;
  }

  // ── Set loading state ─────────────────────────────────────────
  setAiLoading(true);
  hideAiResult();
  hideAiError();

  // ── Build the prompt ──────────────────────────────────────────
  // We tell the AI exactly what format to respond in (JSON).
  // Being very specific in the prompt gives better, consistent results.
const prompt = `You are a helpful assistant that categorizes study resources.

Given this study resource URL: ${url || 'not provided'}

Please suggest:
1. ONE concise, descriptive TITLE (10-60 characters, optimized for study resources).
2. ONE short CATEGORY (1-3 words). Examples: "DSA", "Machine Learning", "Web Dev", "System Design", "Database", "Computer Networks", "Math", "Physics", "Python", "JavaScript"
3. THREE to FIVE relevant TAGS (single words or hyphen-joined, all lowercase). Examples: "algorithms", "binary-search", "neural-networks", "css-grid"

Respond ONLY with valid JSON. No explanations, no markdown. Just raw JSON:
{"title": "Suggested Title", "category": "Category", "tags": ["tag1", "tag2", "tag3"]}`;


  // ── Call the Cerebras API ─────────────────────────────────────
  // Cerebras uses the OpenAI-compatible chat completions format.
  // The API endpoint is: https://api.cerebras.ai/v1/chat/completions
  try {
    const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',

      // Headers tell the server:
      //   Content-Type → we're sending JSON
      //   Authorization → our API key (Bearer token format)
      headers: {
        'Content-Type':  'application/json',
        'Authorization': 'Bearer ' + apiKey
      },

      // Body is the actual request data, converted to a JSON string
      body: JSON.stringify({
        model: 'llama3.1-8b', // Cerebras's fast model
        max_tokens: 200,   // limit response length (we only need a short JSON)
        temperature: 0.3,  // lower = more predictable/consistent output
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    // ── Check if the HTTP request itself succeeded ────────────────
    // response.ok is true for status codes 200-299
    if (!response.ok) {
      // Get the error details from the response body
      const errorData = await response.json();
      const errorMsg  = errorData?.error?.message || 'Unknown API error';

      // Handle specific error codes with helpful messages
      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your Cerebras API key in the sidebar.');
      } else if (response.status === 429) {
        throw new Error('Rate limit reached. Please wait a moment and try again.');
      } else {
        throw new Error('API error (' + response.status + '): ' + errorMsg);
      }
    }

    // ── Parse the response body ────────────────────────────────────
    const data = await response.json();

    // The AI's actual text response is nested here:
    // data.choices[0].message.content
    const rawText = data.choices[0].message.content.trim();

    // ── Parse the JSON from the AI's response ─────────────────────
    // The AI was told to return only JSON, but sometimes it adds
    // markdown code fences like ```json … ``` — we strip those.
    const cleanText   = rawText.replace(/```json|```/g, '').trim();
    const suggestion  = JSON.parse(cleanText);

    // ── Validate the parsed object has what we expect ─────────────
    if (!suggestion.title || !suggestion.category || !Array.isArray(suggestion.tags)) {
      throw new Error('AI returned an unexpected format. Please try again.');
    }

    // ── Store and display the suggestion ──────────────────────────
    lastAiSuggestion = suggestion; // saved for the Apply button
    showAiResult(suggestion);

  } catch (error) {
    // ── Handle any errors (network, API, JSON parse, etc.) ─────────
    let friendlyMessage = error.message;

    // Extra hint for network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      friendlyMessage = 'Network error — please check your internet connection.';
    }

    showAiError(friendlyMessage);
    console.error('Cerebras AI error:', error); // for debugging in DevTools
  }

  // ── Always turn off loading state when done ────────────────────
  setAiLoading(false);
}


/* ================================================================
   applyAiSuggestion()
   Called when the user clicks "✓ Apply Suggestions".
   Fills the form fields with the stored AI suggestion.
================================================================ */
function applyAiSuggestion() {
  if (!lastAiSuggestion) return;

// ── Fill in Title ────────────────────────────────────────────
  const titleField = document.getElementById('inp-title');
  titleField.value = lastAiSuggestion.title || titleField.value;

  // ── Fill in Category ─────────────────────────────────────────
  document.getElementById('inp-cat').value = lastAiSuggestion.category;

  // ── Fill in Tags ──────────────────────────────────────────────
  // Add each AI-suggested tag to formTags (if not already there)
  lastAiSuggestion.tags.forEach(function(tag) {
    const cleanTag = tag.toLowerCase().trim();
    if (cleanTag && !formTags.includes(cleanTag)) {
      formTags.push(cleanTag);
    }
  });

  // Re-render the tag pills in the form
  renderFormTags(); // defined in modal.js

  // Show success feedback
  showToast('AI suggestions applied! ✦', 'success'); // defined in actions.js

  // Hide the result panel (it's been applied)
  hideAiResult();
}


/* ================================================================
   UI HELPER FUNCTIONS
   Small functions that show/hide parts of the AI section in the modal.
================================================================ */

// setAiLoading(isLoading)
// Shows a spinner + "Thinking…" text when loading.
// Restores the normal button when done.
function setAiLoading(isLoading) {
  const btn     = document.getElementById('ai-suggest-btn');
  const btnIcon = document.getElementById('ai-btn-icon');
  const btnText = document.getElementById('ai-btn-text');

  if (isLoading) {
    btn.disabled = true; // prevent double-clicks

    // Replace the sparkle icon with a spinning circle
    btnIcon.innerHTML = '<span class="ai-spinner"></span>';
    btnText.textContent = 'Thinking…';
  } else {
    btn.disabled = false;

    // Restore the original button content
    btnIcon.innerHTML   = '✦';
    btnText.textContent = 'Suggest with AI';
  }
}


// showAiResult(suggestion)
// Builds and shows the AI suggestion box below the button.
// suggestion → { title: "...", category: "DSA", tags: ["algorithms", "graphs"] }
function showAiResult(suggestion) {
  const resultEl   = document.getElementById('ai-result');
  const contentEl  = document.getElementById('ai-result-content');

  // Build title HTML
  const titleHTML = `<div class="ai-title-chip">${suggestion.title}</div>`;

  // Build category HTML
  const catHTML = `<span class="ai-cat-chip">📁 ${suggestion.category}</span>`;

  // Build tags HTML
  const tagsHTML = suggestion.tags.map(function(tag) {
    return `<span class="ai-tag-chip">#${tag}</span>`;
  }).join('');

  // Inject full suggestion HTML
  contentEl.innerHTML = `
    ${titleHTML}
    ${catHTML}
    <div class="ai-tags-row">${tagsHTML}</div>
  `;

  resultEl.style.display = 'block';
}


// hideAiResult()
// Hides the result box.
function hideAiResult() {
  document.getElementById('ai-result').style.display = 'none';
  lastAiSuggestion = null;
}


// showAiError(message)
// Shows an error message below the AI button.
function showAiError(message) {
  const errorEl = document.getElementById('ai-error');
  errorEl.textContent = '⚠ ' + message;
  errorEl.style.display = 'block';
}


// hideAiError()
// Hides the error message.
function hideAiError() {
  const errorEl = document.getElementById('ai-error');
  errorEl.style.display = 'none';
  errorEl.textContent = '';
}
