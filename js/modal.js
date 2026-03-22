/*
  ╔══════════════════════════════════════════════════════════════╗
  ║                     js/modal.js                              ║
  ║                                                              ║
  ║  Everything related to the "Add Resource" modal popup.       ║
  ║                                                              ║
  ║  Functions:                                                  ║
  ║    openModal()         → show the modal                      ║
  ║    closeModal()        → hide the modal + reset form         ║
  ║    closeIfOverlay(e)   → close only if user clicked backdrop ║
  ║    addResource()       → validate form + save new resource   ║
  ║    resetForm()         → clear all form fields               ║
  ║    autoFillTitle()     → suggest title from URL domain       ║
  ║    focusTagInput()     → focus the hidden tags text input    ║
  ║    onTagKey(e)         → handle Enter/comma/Backspace in tags ║
  ║    removeFormTag(i)    → remove a specific tag pill          ║
  ║    renderFormTags()    → re-draw the tag pills in the form   ║
  ╚══════════════════════════════════════════════════════════════╝
*/


/* ================================================================
   openModal()
   Shows the modal by adding the "open" class to the overlay.
   CSS in modal.css uses this class to make the overlay visible.
================================================================ */
function openModal() {
  document.getElementById('modal-overlay').classList.add('open');

  // Auto-focus the URL input so the user can start typing immediately
  document.getElementById('inp-url').focus();
}


/* ================================================================
   closeModal()
   Hides the modal and resets all form fields to empty.
================================================================ */
function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  resetForm();

  // Also hide any AI result or error from the previous session
  document.getElementById('ai-result').style.display = 'none';
  document.getElementById('ai-error').style.display  = 'none';
}


/* ================================================================
   closeIfOverlay(event)
   Called when the user clicks anywhere on the modal-overlay div.
   We only want to close if they clicked the DARK BACKDROP, not
   the modal box itself.

   How event.target works:
     event.target → the specific element that was clicked.
     If the user clicked the overlay background, target === the overlay.
     If the user clicked inside the modal box, target === something else.
================================================================ */
function closeIfOverlay(event) {
  const overlay = document.getElementById('modal-overlay');
  if (event.target === overlay) {
    closeModal();
  }
}

// Close modal when the Escape key is pressed (nice UX!)
document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    closeModal();
  }
});


/* ================================================================
   addResource()
   Called when the "Save Resource →" button is clicked.
   Validates the form, builds a resource object, and saves it.
================================================================ */
function addResource() {
  // ── Read form values ─────────────────────────────────────────
  // .trim() removes any leading/trailing spaces the user may have typed
  const url        = document.getElementById('inp-url').value.trim();
  const title      = document.getElementById('inp-title').value.trim();
  const category   = document.getElementById('inp-cat').value.trim();
  const importance = document.getElementById('inp-importance').value;

  // ── Validate required fields ─────────────────────────────────
  if (!url || !title || !category) {
    showToast('Please fill in URL, title & category!', 'error');
    return; // stop execution — don't save anything
  }

  // ── Validate the URL format ───────────────────────────────────
  // "new URL(url)" throws a TypeError if the URL is malformed.
  // We catch that error and show a message instead of crashing.
  try {
    new URL(url); // will throw if invalid
  } catch (error) {
    showToast('Please enter a valid URL (e.g. https://example.com)', 'error');
    return;
  }

  // ── Build the new resource object ────────────────────────────
  const newResource = {
    id:         Date.now().toString(), // unique ID — current timestamp as string
    url:        url,
    title:      title,
    category:   category,
    importance: importance,
    tags:       [...formTags],  // copy the formTags array (data.js)
    starred:    false,
    addedAt:    Date.now()       // timestamp for sorting
  };

  // ── Assign a colour to this category if it's new ─────────────
  getCatColor(category); // defined in data.js

  // ── Add to the front of the array (so it appears first) ──────
  // .unshift() adds an item to the START of an array (unlike .push which adds to end)
  resources.unshift(newResource);

  saveData();   // persist to localStorage
  renderAll();  // refresh the UI
  closeModal(); // hide the form
  showToast('Resource saved! 🎉', 'success');
}


/* ================================================================
   resetForm()
   Clears all form inputs back to their default/empty state.
   Called by closeModal() after every save or dismiss.
================================================================ */
function resetForm() {
  document.getElementById('inp-url').value        = '';
  document.getElementById('inp-title').value      = '';
  document.getElementById('inp-cat').value        = '';
  document.getElementById('inp-importance').value = 'normal';

  // Clear the tags array and re-render the (now empty) tags area
  formTags = []; // defined in data.js
  renderFormTags();
}


/* ================================================================
   autoFillTitle()
   When the user types a URL, we guess a title from the domain name.
   We use "debouncing" — we wait 400ms after the last keystroke
   before running, so it doesn't fire on every single character.

   Example:
     "https://youtube.com" → "Youtube Resource"
     "https://docs.python.org" → "Docs Resource"
================================================================ */
let autoFillTimer; // stores the timer ID so we can cancel and restart it

function autoFillTitle() {
  // Cancel any pending timer (the user is still typing)
  clearTimeout(autoFillTimer);

  // Start a new timer that fires 400ms after the user stops typing
  autoFillTimer = setTimeout(function() {
    const url        = document.getElementById('inp-url').value.trim();
    const titleField = document.getElementById('inp-title');

    // Don't overwrite a title the user already typed
    if (!url || titleField.value) return;

    try {
      const hostname = new URL(url).hostname;         // "www.youtube.com"
      const domain   = hostname.replace('www.', '');   // "youtube.com"
      const name     = domain.split('.')[0];            // "youtube"

      // Capitalise first letter: "youtube" → "Youtube"
      const capitalized = name.charAt(0).toUpperCase() + name.slice(1);

      titleField.value = capitalized + ' Resource';    // "Youtube Resource"
    } catch {
      // URL isn't valid yet — do nothing
    }

  }, 400); // wait 400ms
}


/* ================================================================
   TAG INPUT FUNCTIONS
   The tags area looks like a text box but actually contains:
     - One <span class="form-tag-pill"> per tag already added
     - One <input class="tags-text-input"> for typing new tags
================================================================ */

// focusTagInput()
// Clicking anywhere in the tags area calls this to focus the hidden input.
function focusTagInput() {
  document.getElementById('tag-input').focus();
}


// onTagKey(event)
// Handles keyboard input inside the tag text input.
// Enter or comma → add the current text as a new tag
// Backspace on empty input → remove the last tag
function onTagKey(event) {

  // ── Add a new tag ─────────────────────────────────────────────
  if (event.key === 'Enter' || event.key === ',') {

    // preventDefault() stops Enter from submitting a form,
    // and stops comma from being typed into the input
    event.preventDefault();

    // Get the text, remove any trailing comma
    const rawValue = event.target.value.trim();
    const tagValue = rawValue.replace(',', '').trim();

    // Only add if not empty AND not already in the list
    if (tagValue && !formTags.includes(tagValue)) {
      formTags.push(tagValue);
      renderFormTags();
    }

    // Clear the text input ready for the next tag
    event.target.value = '';
  }

  // ── Remove the last tag with Backspace ────────────────────────
  if (event.key === 'Backspace' && event.target.value === '' && formTags.length > 0) {
    formTags.pop();    // remove the last element from the array
    renderFormTags();
  }
}


// removeFormTag(index)
// Removes a specific tag by its position in the formTags array.
// Called when the user clicks the × on a tag pill.
function removeFormTag(index) {
  // .splice(start, deleteCount) modifies the array in place
  // It removes 1 item at position `index`
  formTags.splice(index, 1);
  renderFormTags();
}


// renderFormTags()
// Re-draws all the tag pills inside the tags input area.
// Called after any change to the formTags array.
function renderFormTags() {
  const area  = document.getElementById('tags-area');
  const input = document.getElementById('tag-input'); // the text input

  // Clear the entire area (removes old pills + the input)
  area.innerHTML = '';

  // Add one pill per tag
  formTags.forEach(function(tag, index) {
    const pill = document.createElement('span');
    pill.className = 'form-tag-pill';

    // The × button calls removeFormTag with this pill's index
    pill.innerHTML = '#' + tag +
      ' <span class="form-tag-remove" onclick="removeFormTag(' + index + ')">×</span>';

    area.appendChild(pill);
  });

  // Always put the text input back at the end
  area.appendChild(input);

  // Keep focus so user can keep typing
  input.focus();
}
