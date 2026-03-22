/*
  js/app.js  (v2)
  ─────────────────────────────────────────────────────────────
  Entry point — the last script to run.
  Boots the app in 3 steps:

    1. seedSampleData() — add demo resources on first launch
    2. loadApiKey()     — restore saved Cerebras key from localStorage
    3. renderAll()      — draw the complete UI

  Everything after this is event-driven:
    • User types → oninput="renderAll()"
    • User clicks → specific action functions in actions.js / modal.js
*/

seedSampleData(); // data.js
loadApiKey();     // ai.js
renderAll();      // render.js
