/*
  js/modal.js  (v2)
  Add Resource modal: tab switching, file upload handling, form logic.

  NEW in v2:
    • switchTab('url' | 'file')  → shows the right input panel
    • onDragOver / onDragLeave / onFileDrop → drag-and-drop support
    • onFileSelected(event)      → handles <input type="file"> change
    • clearFile()                → removes the selected file
    • readFileAsBase64(file)     → converts File object → base64 string (Promise)
    • addResource()              → now handles both URL and File types
    • autoFillTitle()            → still used for URL tab
*/

/* ── Current tab state ───────────────────────────────────── */
// Tracks which tab is active: 'url' or 'file'
let activeTab = 'url';

/* ── openModal / closeModal ───────────────────────────────── */
function openModal() {
  document.getElementById('modal-overlay').classList.add('open');
  // Always start on the URL tab when modal opens
  switchTab('url');
  document.getElementById('inp-url').focus();
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  resetForm();
  document.getElementById('ai-result').style.display = 'none';
  document.getElementById('ai-error').style.display  = 'none';
}

function closeIfOverlay(event) {
  if (event.target === document.getElementById('modal-overlay')) closeModal();
}

// Escape key closes whichever modal is open
document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    closeModal();
    closeEditModal();
  }
});


/* ── switchTab(tab) ← NEW ─────────────────────────────────────
   Shows the correct input panel (URL or File) and hides the other.
   Also updates the visual state of the tab buttons.
──────────────────────────────────────────────────────────── */
function switchTab(tab) {
  activeTab = tab;

  // ── Toggle panel visibility ──
  document.getElementById('url-panel').style.display  = tab === 'url'  ? 'block' : 'none';
  document.getElementById('file-panel').style.display = tab === 'file' ? 'block' : 'none';

  // ── Toggle tab button active state ──
  document.getElementById('tab-url').classList.toggle('active',  tab === 'url');
  document.getElementById('tab-file').classList.toggle('active', tab === 'file');

  // Clear the other input so stale values don't interfere
  if (tab === 'url') {
    clearFile(); // remove any selected file
  } else {
    document.getElementById('inp-url').value = '';
  }
}


/* ── FILE DRAG-AND-DROP HANDLERS ← NEW ───────────────────────

   HTML5 drag-and-drop API:
     ondragover  → fires when a dragged item is over the zone
     ondragleave → fires when the drag leaves the zone
     ondrop      → fires when the user releases the mouse button
──────────────────────────────────────────────────────────── */

function onDragOver(event) {
  // MUST call preventDefault() to allow dropping
  event.preventDefault();
  document.getElementById('file-drop-zone').classList.add('drag-over');
}

function onDragLeave(event) {
  document.getElementById('file-drop-zone').classList.remove('drag-over');
}

function onFileDrop(event) {
  // preventDefault() stops the browser from navigating to the file URL
  event.preventDefault();
  document.getElementById('file-drop-zone').classList.remove('drag-over');

  // dataTransfer.files is the list of dragged files
  const files = event.dataTransfer.files;
  if (files.length > 0) {
    processFile(files[0]); // we only handle one file at a time
  }
}

/* ── onFileSelected(event) ← NEW ─────────────────────────────
   Called when user picks a file via the hidden <input type="file">.
──────────────────────────────────────────────────────────── */
function onFileSelected(event) {
  const files = event.target.files;
  if (files.length > 0) {
    processFile(files[0]);
  }
}


/* ── processFile(file) ← NEW ─────────────────────────────────
   Called by both drag-drop and the file input.
   Stores the file in `selectedFile` and updates the UI.

   `file` is a File object — it has:
     file.name  → "lecture_notes.pdf"
     file.size  → bytes (e.g. 2048000)
     file.type  → MIME type (e.g. "application/pdf")
──────────────────────────────────────────────────────────── */
function processFile(file) {
  selectedFile = file; // store for later use in addResource()

  // ── Update the drop zone UI ──
  const icon = getFileIcon(file.type);
  document.getElementById('file-drop-icon').textContent = icon;
  document.getElementById('file-drop-text').textContent = 'File selected';

  // ── Show the file info row ──
  document.getElementById('file-info-name').textContent = file.name;
  document.getElementById('file-info-size').textContent = formatFileSize(file.size);
  document.getElementById('file-type-icon').textContent = icon;
  document.getElementById('file-info-row').style.display = 'flex';

  // ── Auto-fill the title from the filename ──
  // e.g. "ML_Lecture_Notes_Week3.pdf" → "ML Lecture Notes Week3"
  const titleField = document.getElementById('inp-title');
  if (!titleField.value) {
    // Remove extension: "lecture_notes.pdf" → "lecture_notes"
    const nameWithoutExt = file.name.replace(/\.[^.]+$/, '');
    // Replace underscores and hyphens with spaces: "lecture_notes" → "lecture notes"
    const cleanName = nameWithoutExt.replace(/[_-]+/g, ' ');
    // Capitalise the first letter
    titleField.value = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
  }
}

/* ── clearFile() ← NEW ────────────────────────────────────── */
function clearFile() {
  selectedFile = null;

  // Reset the file input so the same file can be re-selected
  const fileInput = document.getElementById('inp-file');
  if (fileInput) fileInput.value = '';

  // Reset drop zone UI
  document.getElementById('file-drop-icon').textContent = '📂';
  document.getElementById('file-drop-text').textContent = 'Click to browse or drag & drop';
  document.getElementById('file-info-row').style.display = 'none';
}


/* ── readFileAsBase64(file) ← NEW ────────────────────────────
   Converts a File object to a base64-encoded string using
   the FileReader API (built into all modern browsers).

   Returns a Promise — we use async/await in addResource() to wait for it.

   Why base64?
     localStorage can only store strings (text).
     Base64 is a way to encode any binary data as ASCII characters.
     e.g. a PDF's bytes become a long string of letters and numbers.
──────────────────────────────────────────────────────────── */
function readFileAsBase64(file) {
  // Return a Promise so we can use `await` on it
  return new Promise(function(resolve, reject) {
    const reader = new FileReader();

    // readAsDataURL reads the file and encodes it as:
    // "data:application/pdf;base64,JVBERi0xLjQK..."
    reader.readAsDataURL(file);

    // onload fires when reading is complete
    reader.onload = function() {
      // Split at the comma: we only want the base64 part after it
      // "data:application/pdf;base64," + "JVBERi0xLjQK..."
      const base64 = reader.result.split(',')[1];
      resolve(base64); // deliver the result
    };

    // onerror fires if something goes wrong
    reader.onerror = function(error) {
      reject(error);
    };
  });
}


/* ── addResource() ────────────────────────────────────────────
   Called when "Save Resource →" is clicked.
   Now handles both URL resources and File resources.
   File reading is async (returns a Promise), so this function
   is marked `async` and uses `await`.
──────────────────────────────────────────────────────────── */
async function addResource() {
  const title      = document.getElementById('inp-title').value.trim();
  const category   = document.getElementById('inp-cat').value.trim();
  const importance = document.getElementById('inp-importance').value;

  // ── Shared validation ──
  if (!title || !category) {
    showToast('Please fill in title & category!', 'error');
    return;
  }

  // ══════════════════════════════
  //  URL RESOURCE
  // ══════════════════════════════
  if (activeTab === 'url') {
    const url = document.getElementById('inp-url').value.trim();

    if (!url) { showToast('Please enter a URL', 'error'); return; }
    try { new URL(url); } catch { showToast('Please enter a valid URL (include https://)', 'error'); return; }

    const newResource = {
      id:         Date.now().toString(),
      type:       'url',
      url:        url,
      title:      title,
      category:   category,
      importance: importance,
      tags:       [...formTags],
      starred:    false,
      addedAt:    Date.now()
    };

    getCatColor(category);
    resources.unshift(newResource);
    saveData();
    renderAll();
    closeModal();
    showToast('Resource saved! 🎉', 'success');

  // ══════════════════════════════
  //  FILE RESOURCE
  // ══════════════════════════════
  } else {
    if (!selectedFile) {
      showToast('Please select a file first', 'error');
      return;
    }

    // Warn about large files (base64 is ~33% bigger than the original)
    const maxMB = 4; // ~4MB file → ~5.3MB base64 → near localStorage limit
    if (selectedFile.size > maxMB * 1024 * 1024) {
      showToast(`File is larger than ${maxMB}MB. Large files may hit storage limits.`, 'error');
      // We still try to save — the QuotaExceededError handler in data.js will catch it
    }

    // Show a loading state on the button while reading the file
    const btn = document.querySelector('.submit-btn');
    const origText = btn.textContent;
    btn.textContent = 'Reading file…';
    btn.disabled = true;

    try {
      // Read the file as a base64 string (async — waits here until done)
      const base64Data = await readFileAsBase64(selectedFile);

      const newResource = {
        id:         Date.now().toString(),
        type:       'file',
        fileName:   selectedFile.name,
        fileSize:   selectedFile.size,
        fileType:   selectedFile.type,
        fileData:   base64Data,           // the entire file as a base64 string
        title:      title,
        category:   category,
        importance: importance,
        tags:       [...formTags],
        starred:    false,
        addedAt:    Date.now()
      };

      getCatColor(category);
      resources.unshift(newResource);
      saveData(); // may throw QuotaExceededError for very large files
      renderAll();
      closeModal();
      showToast('File saved! 🎉', 'success');

    } catch (err) {
      showToast('Could not read file: ' + err.message, 'error');
      console.error('File read error:', err);
    }

    // Restore button
    btn.textContent = origText;
    btn.disabled = false;
  }
}


/* ── resetForm ────────────────────────────────────────────── */
function resetForm() {
  document.getElementById('inp-url').value        = '';
  document.getElementById('inp-title').value      = '';
  document.getElementById('inp-cat').value        = '';
  document.getElementById('inp-importance').value = 'normal';
  formTags = [];
  renderFormTags();
  clearFile();
  switchTab('url'); // always reset to URL tab
}


/* ── autoFillTitle (URL tab) ──────────────────────────────── */
let autoFillTimer;
function autoFillTitle() {
  clearTimeout(autoFillTimer);
  autoFillTimer = setTimeout(function() {
    const url        = document.getElementById('inp-url').value.trim();
    const titleField = document.getElementById('inp-title');
    if (!url || titleField.value) return;
    try {
      const domain  = new URL(url).hostname.replace('www.', '');
      const name    = domain.split('.')[0];
      titleField.value = name.charAt(0).toUpperCase() + name.slice(1) + ' Resource';
    } catch {}
  }, 400);
}


/* ── Tag input (Add modal) ────────────────────────────────── */
function focusTagInput() { document.getElementById('tag-input').focus(); }

function onTagKey(event) {
  if (event.key === 'Enter' || event.key === ',') {
    event.preventDefault();
    const value = event.target.value.trim().replace(',','').trim();
    if (value && !formTags.includes(value)) { formTags.push(value); renderFormTags(); }
    event.target.value = '';
  }
  if (event.key === 'Backspace' && event.target.value === '' && formTags.length > 0) {
    formTags.pop(); renderFormTags();
  }
}

function removeFormTag(index) { formTags.splice(index, 1); renderFormTags(); }

function renderFormTags() {
  const area  = document.getElementById('tags-area');
  const input = document.getElementById('tag-input');
  area.innerHTML = '';
  formTags.forEach(function(tag, index) {
    const pill = document.createElement('span');
    pill.className = 'form-tag-pill';
    pill.innerHTML = '#' + tag + ' <span class="form-tag-remove" onclick="removeFormTag(' + index + ')">×</span>';
    area.appendChild(pill);
  });
  area.appendChild(input);
  input.focus();
}
