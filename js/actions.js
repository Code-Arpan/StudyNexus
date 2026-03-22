/*
  js/actions.js  (v2)
  User action handlers.

  NEW in v2:
    • openFile(id)           → opens a stored file in a new tab via Blob URL
    • setTypeFilter(t, btn)  → filters by file type (PDF, Video, etc.)
    • openEditModal(id)      → populates and shows the edit modal
    • closeEditModal()       → hides the edit modal
    • closeEditIfOverlay(e)  → closes edit modal if backdrop was clicked
    • saveEditResource()     → saves changes from the edit form
    • focusEditTagInput()    → focuses the edit modal's tag input
    • onEditTagKey(e)        → handles Enter/comma/Backspace in edit tag input
    • renderEditTags()       → redraws tag pills in the edit modal
*/

/* ── toggleStar ──────────────────────────────────────────── */
function toggleStar(id) {
  const r = resources.find(r => r.id === id);
  if (r) {
    r.starred = !r.starred;
    saveData();
    renderAll();
    showToast(r.starred ? '★ Added to Starred!' : 'Removed from Starred',
              r.starred ? 'success' : 'error');
  }
}

/* ── deleteResource ───────────────────────────────────────── */
function deleteResource(id) {
  resources = resources.filter(r => r.id !== id);
  saveData();
  renderAll();
  showToast('Resource deleted', 'error');
}

/* ── setFilter ────────────────────────────────────────────── */
function setFilter(filter, buttonElement) {
  currentFilter     = filter;
  activeTag         = null;
  currentTypeFilter = null; // clear type filter when switching category

  // De-highlight all nav buttons
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  if (buttonElement) buttonElement.classList.add('active');

  renderAll();
}

/* ── setTypeFilter  ← NEW ─────────────────────────────────────
   Filters resources to show only a specific file type.
   Clicking the same type again clears the filter (toggle).
──────────────────────────────────────────────────────────── */
function setTypeFilter(typeLabel, buttonElement) {
  // Toggle — clicking the active filter clears it
  if (currentTypeFilter === typeLabel) {
    currentTypeFilter = null;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  } else {
    currentTypeFilter = typeLabel;
    currentFilter     = 'all'; // reset category filter
    activeTag         = null;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    if (buttonElement) buttonElement.classList.add('active');
  }
  renderAll();
}

/* ── filterByTag ──────────────────────────────────────────── */
function filterByTag(tag) {
  activeTag = tag;
  renderAll();
}

/* ── setView ──────────────────────────────────────────────── */
function setView(view) {
  currentView = view;
  document.getElementById('btn-grid').classList.toggle('active', view === 'grid');
  document.getElementById('btn-list').classList.toggle('active', view === 'list');
  renderResources();
}

/* ── openFile  ← NEW ──────────────────────────────────────────
   File resources store their content as a base64 string (fileData).
   To "open" the file, we:
     1. Decode the base64 back into binary (atob)
     2. Create a Blob (a raw file object in memory)
     3. Create a temporary URL for that Blob
     4. Open the URL in a new browser tab
     5. The browser handles it — PDFs open in the viewer, images display, etc.
──────────────────────────────────────────────────────────── */
function openFile(id) {
  const r = resources.find(r => r.id === id);
  if (!r || !r.fileData) {
    showToast('File data not available', 'error');
    return;
  }

  try {
    // atob() converts base64 → binary string
    const binaryString = atob(r.fileData);

    // Convert binary string to a Uint8Array (array of byte numbers)
    // This is what the Blob constructor needs
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i); // charCodeAt returns the byte value 0-255
    }

    // Create a Blob — like a file object in the browser's memory
    const blob = new Blob([bytes], { type: r.fileType });

    // Create a temporary URL pointing to the Blob
    const blobUrl = URL.createObjectURL(blob);

    // Open it in a new tab (browser handles the rendering)
    window.open(blobUrl, '_blank');

    // Clean up the URL after a short delay to free memory
    // (5 seconds is enough time for the new tab to start loading)
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);

  } catch (err) {
    showToast('Could not open file: ' + err.message, 'error');
    console.error('openFile error:', err);
  }
}


/* ── EDIT MODAL FUNCTIONS  ← NEW ─────────────────────────────

   The edit modal lets users change:
     • Title
     • Category  ← the main new feature
     • Importance
     • Tags

   It does NOT let users change the URL or the file itself
   (that would be a different resource entirely).
──────────────────────────────────────────────────────────── */

/* openEditModal(id)
   Finds the resource, fills the edit form fields, then shows the modal. */
function openEditModal(id) {
  const r = resources.find(r => r.id === id);
  if (!r) return;

  // Store the ID in the hidden field so saveEditResource() knows what to update
  document.getElementById('edit-resource-id').value = id;

  // ── Fill the preview row ──
  // Shows a small preview of what's being edited (icon + URL/filename)
  const icon     = r.type === 'file' ? getFileIcon(r.fileType) : '🔗';
  const subtitle = r.type === 'url'
    ? r.url.replace(/^https?:\/\/(www\.)?/,'').slice(0, 60)
    : r.fileName + (r.fileSize ? ' · ' + formatFileSize(r.fileSize) : '');

  document.getElementById('edit-resource-preview').innerHTML = `
    <span class="edit-preview-icon">${icon}</span>
    <span class="edit-preview-url">${subtitle}</span>`;

  // ── Fill form fields with current values ──
  document.getElementById('edit-inp-title').value       = r.title || '';
  document.getElementById('edit-inp-cat').value         = r.category || '';
  document.getElementById('edit-inp-importance').value  = r.importance || 'normal';

  // ── Set up the tags ──
  editTags = [...(r.tags || [])]; // copy the current tags array
  renderEditTags();

  // ── Show the modal ──
  document.getElementById('edit-modal-overlay').classList.add('open');
  document.getElementById('edit-inp-title').focus();
}

/* closeEditModal() */
function closeEditModal() {
  document.getElementById('edit-modal-overlay').classList.remove('open');
  editTags = [];
}

/* closeEditIfOverlay(event) — close if backdrop was clicked */
function closeEditIfOverlay(event) {
  if (event.target === document.getElementById('edit-modal-overlay')) {
    closeEditModal();
  }
}

/* saveEditResource()
   Reads the edit form and updates the resource in the array. */
function saveEditResource() {
  const id       = document.getElementById('edit-resource-id').value;
  const title    = document.getElementById('edit-inp-title').value.trim();
  const category = document.getElementById('edit-inp-cat').value.trim();
  const importance = document.getElementById('edit-inp-importance').value;

  // Validate
  if (!title || !category) {
    showToast('Title and category are required', 'error');
    return;
  }

  // Find and update the resource
  const r = resources.find(r => r.id === id);
  if (!r) { showToast('Resource not found', 'error'); return; }

  // Apply changes
  r.title      = title;
  r.category   = category;   // ← this is the key "change category" feature
  r.importance = importance;
  r.tags       = [...editTags];

  // Ensure the new category has a colour assigned
  getCatColor(category);

  saveData();
  renderAll();
  closeEditModal();
  showToast('Resource updated! ✓', 'success');
}

/* ── Edit modal tag input ─────────────────────────────────── */

function focusEditTagInput() {
  document.getElementById('edit-tag-input').focus();
}

function onEditTagKey(event) {
  if (event.key === 'Enter' || event.key === ',') {
    event.preventDefault();
    const value = event.target.value.trim().replace(',', '').trim();
    if (value && !editTags.includes(value)) {
      editTags.push(value);
      renderEditTags();
    }
    event.target.value = '';
  }
  if (event.key === 'Backspace' && event.target.value === '' && editTags.length > 0) {
    editTags.pop();
    renderEditTags();
  }
}

function removeEditTag(index) {
  editTags.splice(index, 1);
  renderEditTags();
}

function renderEditTags() {
  const area  = document.getElementById('edit-tags-area');
  const input = document.getElementById('edit-tag-input');
  area.innerHTML = '';
  editTags.forEach(function(tag, index) {
    const pill = document.createElement('span');
    pill.className = 'form-tag-pill';
    pill.innerHTML = '#' + tag + ' <span class="form-tag-remove" onclick="removeEditTag(' + index + ')">×</span>';
    area.appendChild(pill);
  });
  area.appendChild(input);
  input.focus();
}

/* ── showToast ────────────────────────────────────────────── */
function showToast(message, type) {
  const container = document.getElementById('toast-container');
  const toast     = document.createElement('div');
  toast.className = 'toast ' + (type || 'success');
  toast.innerHTML = '<span>' + (type === 'error' ? '✕' : '✓') + '</span> ' + message;
  container.appendChild(toast);
  setTimeout(function() {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, 2700);
}
