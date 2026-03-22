/*
  ╔══════════════════════════════════════════════════════════════╗
  ║                       js/app.js                              ║
  ║                                                              ║
  ║  This is the ENTRY POINT — the last file to run.             ║
  ║  It boots up the whole application.                          ║
  ║                                                              ║
  ║  By the time this file runs, all other JS files are already  ║
  ║  loaded (data.js, render.js, actions.js, modal.js, ai.js)    ║
  ║  so we can safely call any function defined in those files.  ║
  ╚══════════════════════════════════════════════════════════════╝
*/


/*
  HOW THE APP STARTS — Step by step:

  Step 1: data.js already ran when the browser loaded it.
          This means:
            • `resources` array was loaded from localStorage (or set to [])
            • `currentFilter`, `currentView`, etc. are initialized

  Step 2: seedSampleData() checks if `resources` is empty.
          If yes → it fills it with 6 example resources.
          If no  → it does nothing (user has their own data).

  Step 3: loadApiKey() checks localStorage for a saved Cerebras key.
          If found → fills in the sidebar input and shows "✓ Key loaded".

  Step 4: renderAll() draws the entire UI for the first time:
            • renderStats()     → the 4 stat number cards
            • renderSidebar()   → category nav buttons
            • renderTagBar()    → clickable tag filter pills
            • renderResources() → the resource cards grid/list
*/

// ── Boot sequence ──────────────────────────────────────────────

// 1. Add sample data if the user has no saved resources
seedSampleData(); // defined in data.js

// 2. Restore the Cerebras API key from localStorage if saved
loadApiKey();     // defined in ai.js

// 3. Render the complete UI
renderAll();      // defined in render.js


/*
  That's it! The app is now running. All further changes to the UI
  happen reactively:
    • User types in search → oninput="renderAll()" in index.html
    • User clicks a filter → setFilter() in actions.js → renderAll()
    • User adds a resource → addResource() in modal.js → renderAll()
    • User stars/deletes   → toggleStar()/deleteResource() → renderAll()
*/
