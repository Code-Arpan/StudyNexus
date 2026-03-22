/*
  ╔══════════════════════════════════════════════════════════════╗
  ║                     js/actions.js                            ║
  ║                                                              ║
  ║  User action handlers — what happens when someone clicks     ║
  ║  a button, selects a filter, or changes the view.            ║
  ║                                                              ║
  ║  Functions:                                                  ║
  ║    toggleStar(id)       → star/unstar a resource             ║
  ║    deleteResource(id)   → remove a resource permanently      ║
  ║    setFilter(f, btn)    → change the active sidebar filter   ║
  ║    filterByTag(tag)     → filter by a specific tag           ║
  ║    setView(view)        → switch between grid and list       ║
  ║    showToast(msg, type) → show a temporary pop-up message    ║
  ║    editCategory(id)     → edit resource category             ║
  ╚══════════════════════════════════════════════════════════════╝
*/


/* ================================================================
   toggleStar(id)
   Flips the `starred` boolean on a resource and re-renders.

   How it works:
     .find() searches the `resources` array for the item where
     r.id === id. It returns the object itself (not a copy), so
     we can modify it directly.
================================================================ */
function toggleStar(id) {
  // Find the resource with matching id
  const resource = resources.find(function(r) {
    return r.id === id;
  });

  if (resource) {
    resource.starred = !resource.starred; // flip true → false or false → true
    saveData();  // save to localStorage (data.js)
    renderAll(); // re-draw everything (render.js)

    // Show a toast message with the new state
    if (resource.starred) {
      showToast('★ Added to Starred!', 'success');
    } else {
      showToast('Removed from Starred', 'error');
    }
  }
}


/* ================================================================
   deleteResource(id)
   Removes a resource from the array permanently.

   How it works:
     .filter() creates a NEW array that keeps only the resources
     where the id does NOT match the one we want to delete.
     We then replace `resources` with this new array.
================================================================ */
function deleteResource(id) {
  // Keep every resource EXCEPT the one with this id
  resources = resources.filter(function(r) {
    return r.id !== id; // true = keep, false = remove
  });

  saveData();
  renderAll();
  showToast('Resource deleted', 'error');
}


/* ================================================================
   editCategory(id)
   Opens quick category edit for resource. Uses prompt() for simplicity.
================================================================ */
function editCategory(id) {
  const resource = resources.find(r => r.id === id);
  if (!resource) return;

  const newCategory = prompt('New category:', resource.category);
  if (newCategory !== null && newCategory.trim() !== resource.category) {
    resource.category = newCategory.trim();
    getCatColor(resource.category); // assign new color
    saveData();
    renderAll();
    showToast('Category updated!', 'success');
  }
}


/* ================================================================
   setFilter(filter, buttonElement)
   Changes the active category/library filter (sidebar navigation).

   Parameters:
     filter        → 'all', 'starred', or a category name string
     buttonElement → the <button> that was clicked (so we can
                     highlight it with the "active" class)
================================================================ */
function setFilter(filter, buttonElement) {
  currentFilter = filter; // update the global state (data.js)
  activeTag = null;        // reset any active tag filter

  // ── Remove "active" class from every nav button ─────────────
  // querySelectorAll returns a NodeList (like an array) of all
  // elements matching the CSS selector '.nav-btn'
  document.querySelectorAll('.nav-btn').forEach(function(btn) {
    btn.classList.remove('active');
  });

  // ── Add "active" class to the clicked button ─────────────────
  if (buttonElement) {
    buttonElement.classList.add('active');
  }

  renderAll();
}


/* ================================================================
   filterByTag(tag)
   Sets or clears the active tag filter.

   Parameters:
     tag → the tag string to filter by, or null to show all tags
================================================================ */
function filterByTag(tag) {
  activeTag = tag; // null = no filter
  renderAll();
}


/* ================================================================
   setView(view)
   Switches between 'grid' and 'list' display modes.

   Parameters:
     view → 'grid' | 'list'
================================================================ */
function setView(view) {
  currentView = view; // update global state (data.js)

  // Toggle the "active" class on the two view buttons
  // classList.toggle(class, condition):
  //   adds the class if condition is true
  //   removes the class if condition is false
  document.getElementById('btn-grid').classList.toggle('active', view === 'grid');
  document.getElementById('btn-list').classList.toggle('active', view === 'list');

  // Only need to re-render the cards, not the whole page
  renderResources();
}


/* ================================================================
   showToast(message, type)
   Shows a temporary notification in the bottom-right corner.
   It automatically disappears after ~3 seconds.

   Parameters:
     message → the text to show
     type    → 'success' (green) | 'error' (red)
================================================================ */
function showToast(message, type) {
  const container = document.getElementById('toast-container');

  // ── Create the toast element ─────────────────────────────────
  const toast = document.createElement('div');
  // Set its CSS class (type is either 'success' or 'error')
  toast.className = 'toast ' + (type || 'success');

  // Pick the icon
  const icon = (type === 'error') ? '✕' : '✓';

  // Set the inner HTML
  toast.innerHTML = '<span>' + icon + '</span> ' + message;

  // Add it to the container (it appears on screen)
  container.appendChild(toast);

  // ── Auto-remove after 3 seconds ──────────────────────────────
  // setTimeout(fn, ms) runs fn after ms milliseconds

  setTimeout(function() {
    // First: add the removing class to play the fade-out animation
    // (toastFade is defined in animations.css)
    toast.classList.add('removing');

    // Then: after the animation finishes (300ms), remove from DOM
    setTimeout(function() {
      toast.remove();
    }, 300);

  }, 2700); // 2700ms + 300ms = 3 seconds total
}

