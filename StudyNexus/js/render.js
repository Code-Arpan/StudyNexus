/*
  ╔══════════════════════════════════════════════════════════════╗
  ║                      js/render.js                            ║
  ║                                                              ║
  ║  This file is responsible for DISPLAYING things on screen.   ║
  ║  It reads the data from data.js and builds HTML strings      ║
  ║  that it then injects into the page.                         ║
  ║                                                              ║
  ║  Functions in this file:                                     ║
  ║    getFilteredResources() → applies all active filters       ║
  ║    renderResources()      → builds and shows the cards       ║
  ║    buildGridCard(r, delay)→ returns HTML for a grid card     ║
  ║    buildListCard(r, delay)→ returns HTML for a list card     ║
  ║    renderSidebar()        → updates sidebar category buttons ║
  ║    renderStats()          → updates the 4 stat numbers       ║
  ║    renderTagBar()         → renders the tag filter pills     ║
  ║    renderAll()            → calls all render functions       ║
  ╚══════════════════════════════════════════════════════════════╝
*/


/* ================================================================
   getFilteredResources()
   Returns a filtered + searched subset of the `resources` array.
   It applies three filters in sequence:
     1. Category / Starred filter (from sidebar)
     2. Tag filter (from tag bar)
     3. Text search (from search input)
================================================================ */
function getFilteredResources() {
  // Read the search text. .toLowerCase() makes comparison case-insensitive.
  const query = document.getElementById('search-input').value.toLowerCase();

  // .filter() returns a new array containing only items where the
  // function returns true. We run each resource through 3 checks.
  return resources.filter(function(r) {

    // ── Check 1: Category / Starred filter ──────────────────────
    if (currentFilter === 'starred' && !r.starred) {
      return false; // exclude: not starred
    }
    if (
      currentFilter !== 'all' &&
      currentFilter !== 'starred' &&
      r.category !== currentFilter
    ) {
      return false; // exclude: wrong category
    }

    // ── Check 2: Tag filter ─────────────────────────────────────
    if (activeTag) {
      // (r.tags || []) safely handles resources with no tags array
      const hasTag = (r.tags || []).includes(activeTag);
      if (!hasTag) return false; // exclude: doesn't have this tag
    }

    // ── Check 3: Search text ────────────────────────────────────
    if (query) {
      // Combine all searchable fields into one long string
      const searchableText = [
        r.title,
        r.url,
        r.category || '',
        (r.tags || []).join(' ') // ["dsa", "graphs"] → "dsa graphs"
      ].join(' ').toLowerCase();

      // .includes() checks if the query appears anywhere in the string
      if (!searchableText.includes(query)) return false; // no match
    }

    // ── Passed all checks — include this resource ────────────────
    return true;
  });
}


/* ================================================================
   renderResources()
   Builds and displays the resource cards in the main content area.
   It uses innerHTML to inject raw HTML strings (built by
   buildGridCard and buildListCard).
================================================================ */
function renderResources() {
  const list = getFilteredResources();
  const container = document.getElementById('resources-container');

  // ── Update heading count ────────────────────────────────────
  const itemWord = list.length === 1 ? 'item' : 'items'; // "1 item" vs "2 items"
  document.getElementById('page-count').textContent = list.length + ' ' + itemWord;

  // ── Update page title ───────────────────────────────────────
  const titleMap = { all: 'All Resources', starred: '★ Starred' };
  // Use the map, or fall back to the category name itself
  document.getElementById('page-title').textContent = titleMap[currentFilter] || currentFilter;

  // ── Show empty state if nothing matches ─────────────────────
  if (list.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-emoji">📭</span>
        <h3>Nothing here yet!</h3>
        <p>Try a different search or filter, or add a new resource above.</p>
      </div>
    `;
    return; // stop here — nothing more to do
  }

  // ── Set container class based on current view ───────────────
  // This changes the CSS grid layout (style.css)
  container.className = (currentView === 'grid') ? 'resources-grid' : 'resources-list';

  // ── Build all card HTML strings and join them ───────────────
  // .map() transforms each resource into an HTML string
  // .join('') combines all strings into one big string
  container.innerHTML = list.map(function(resource, index) {
    // Stagger: each card appears 60ms after the previous one
    const delay = index * 60;

    if (currentView === 'grid') {
      return buildGridCard(resource, delay);
    } else {
      return buildListCard(resource, delay);
    }
  }).join('');
}


/* ================================================================
   buildGridCard(resource, delay)
   Returns an HTML string for a single grid-view card.
   Parameters:
     resource → the resource object from the `resources` array
     delay    → animation delay in milliseconds (for stagger effect)
================================================================ */
function buildGridCard(resource, delay) {
  // Get this resource's category colour theme
  const colorTheme = resource.category ? getCatColor(resource.category) : null;

  // Get favicon URL and fallback letter
  const faviconUrl = getFavicon(resource.url);
  const fallbackLetter = getDomainLetter(resource.url);

  // ── Build the favicon HTML ──────────────────────────────────
  // If we have a favicon URL, use an <img> tag.
  // onerror: if the image fails to load, show the fallback letter instead.
  const faviconHTML = faviconUrl
    ? `<img src="${faviconUrl}" onerror="this.parentElement.textContent='${fallbackLetter}'" alt="">`
    : fallbackLetter;

  // ── Build the category badge HTML ───────────────────────────
  const categoryHTML = (resource.category && colorTheme)
    ? `<span class="cat-badge" style="
        background: ${colorTheme.bg};
        color: ${colorTheme.color};
        border: 1px solid ${colorTheme.border};
      ">${resource.category}</span>`
    : '';

  // ── Build the tags HTML (show max 3 tags) ───────────────────
  // .slice(0, 3) keeps only the first 3 tags
  const tagsHTML = (resource.tags || []).slice(0, 3).map(function(tag) {
    // onclick filters the whole page by this tag
    return `<span class="tag-badge" onclick="filterByTag('${tag}')">#${tag}</span>`;
  }).join('');

  // ── Importance emoji ─────────────────────────────────────────
  const impEmoji =
    resource.importance === 'critical'  ? '🔥' :
    resource.importance === 'important' ? '⭐' : '';

  // ── Return the full card HTML string ─────────────────────────
  // Template literals (backticks) let us embed variables with ${}
  return `
    <div class="card ${resource.starred ? 'starred' : ''}"
         style="animation-delay: ${delay}ms">

      <!-- Top row: favicon | title & url | star/delete buttons -->
      <div class="card-top">

        <div class="favicon-box">
          ${faviconHTML}
        </div>

        <div class="card-title-area">
          <div class="card-title" title="${resource.title}">
            ${resource.title}
          </div>
          <div class="card-url">
            ${resource.url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 45)}
          </div>
        </div>

        <!-- Hidden until card is hovered (see style.css .card-actions) -->
        <div class="card-actions">
          <button class="icon-btn ${resource.starred ? 'starred' : ''}"
                  onclick="toggleStar('${resource.id}')"
                  title="Star this resource">★</button>
          <button class="icon-btn del"
                  onclick="deleteResource('${resource.id}')"
                  title="Delete this resource">✕</button>
        </div>

      </div>

      <!-- Bottom row: category badge + tags + open link -->
      <div class="card-meta">
        ${categoryHTML}
        ${tagsHTML}
        ${impEmoji ? `<span style="font-size:13px">${impEmoji}</span>` : ''}
        <!-- target="_blank" opens in a new tab -->
        <!-- rel="noopener" is a security best-practice for target="_blank" -->
        <a class="open-btn" href="${resource.url}" target="_blank" rel="noopener">
          ↗ Open
        </a>
      </div>

    </div>
  `;
}


/* ================================================================
   buildListCard(resource, delay)
   Returns an HTML string for a single list-view card.
   List cards are a horizontal strip (not a tall box).
================================================================ */
function buildListCard(resource, delay) {
  const colorTheme = resource.category ? getCatColor(resource.category) : null;
  const faviconUrl = getFavicon(resource.url);
  const fallbackLetter = getDomainLetter(resource.url);

  const faviconHTML = faviconUrl
    ? `<img src="${faviconUrl}" onerror="this.parentElement.textContent='${fallbackLetter}'" alt="">`
    : fallbackLetter;

  const categoryHTML = (resource.category && colorTheme)
    ? `<span class="cat-badge" style="
        background: ${colorTheme.bg};
        color: ${colorTheme.color};
        border: 1px solid ${colorTheme.border};
        white-space: nowrap;
      ">${resource.category}</span>`
    : '';

  // Show only 2 tags in list view (less space available)
  const tagsHTML = (resource.tags || []).slice(0, 2).map(function(tag) {
    return `<span class="tag-badge">#${tag}</span>`;
  }).join('');

  return `
    <div class="list-card ${resource.starred ? 'starred' : ''}"
         style="animation-delay: ${delay}ms">

      <!-- Small favicon box -->
      <div class="favicon-box" style="width:32px; height:32px; flex-shrink:0">
        ${faviconHTML}
      </div>

      <!-- Title + URL (takes remaining horizontal space) -->
      <div class="card-title-area">
        <div class="card-title">${resource.title}</div>
        <div class="card-url">
          ${resource.url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 55)}
        </div>
      </div>

      ${categoryHTML}
      ${tagsHTML}

      <!-- Actions always visible in list view -->
      <div class="card-actions">
        <button class="icon-btn ${resource.starred ? 'starred' : ''}"
                onclick="toggleStar('${resource.id}')">★</button>
        <!-- Link styled as an icon button -->
        <a class="icon-btn"
           href="${resource.url}"
           target="_blank"
           rel="noopener"
           style="text-decoration:none">↗</a>
        <button class="icon-btn del"
                onclick="deleteResource('${resource.id}')">✕</button>
      </div>

    </div>
  `;
}


/* ================================================================
   renderSidebar()
   Rebuilds the category navigation buttons in the sidebar.
   Also updates the count badges and the category autocomplete list.
================================================================ */
function renderSidebar() {
  // Get all unique category names from the resources array.
  // new Set() removes duplicates.
  // [...Set] converts the Set back to a plain array.
  // .filter(Boolean) removes any falsy values (null, undefined, "")
  const categories = [...new Set(resources.map(r => r.category).filter(Boolean))];

  const catNav = document.getElementById('cat-nav');

  // Build one button per category
  catNav.innerHTML = categories.map(function(cat) {
    const colorTheme = getCatColor(cat);
    const count = resources.filter(r => r.category === cat).length;
    const isActive = (currentFilter === cat) ? 'active' : '';

    return `
      <button class="nav-btn ${isActive}" onclick="setFilter('${cat}', this)">
        <!-- Coloured dot (uses the category's theme colour) -->
        <span class="cat-dot" style="background: ${colorTheme.color}"></span>
        ${cat}
        <span class="nav-badge">${count}</span>
      </button>
    `;
  }).join('');

  // ── Update count badges ────────────────────────────────────────
  document.getElementById('count-all').textContent = resources.length;
  document.getElementById('count-starred').textContent =
    resources.filter(r => r.starred).length;

  // ── Update datalist for category autocomplete in the form ──────
  const catList = document.getElementById('cat-list');
  catList.innerHTML = categories.map(c => `<option value="${c}">`).join('');
}


/* ================================================================
   renderStats()
   Updates the 4 big number cards at the top of the page.
================================================================ */
function renderStats() {
  // Total resources
  document.getElementById('stat-total').textContent = resources.length;

  // Unique categories count
  const uniqueCats = new Set(resources.map(r => r.category).filter(Boolean));
  document.getElementById('stat-cats').textContent = uniqueCats.size;

  // Starred count
  document.getElementById('stat-starred').textContent =
    resources.filter(r => r.starred).length;

  // Unique tags count
  // .flatMap() is like .map() but flattens one level of nesting.
  // e.g. [['a','b'], ['c']] → ['a', 'b', 'c']
  const allTags = resources.flatMap(r => r.tags || []);
  const uniqueTags = new Set(allTags);
  document.getElementById('stat-tags').textContent = uniqueTags.size;
}


/* ================================================================
   renderTagBar()
   Renders clickable tag pills above the resource cards.
   Clicking a pill filters resources to only show those with that tag.
================================================================ */
function renderTagBar() {
  // Collect all unique tags from all resources
  const allTags = [...new Set(resources.flatMap(r => r.tags || []))];
  const bar = document.getElementById('tag-bar');

  // Hide the tag bar if there are no tags at all
  if (allTags.length === 0) {
    bar.innerHTML = '';
    return;
  }

  // "All" pill + one pill per tag
  bar.innerHTML =
    // "All" pill — active when no tag filter is selected
    `<button class="tag-pill ${!activeTag ? 'active' : ''}" onclick="filterByTag(null)">
       All
     </button>` +
    allTags.map(function(tag) {
      const isActive = (activeTag === tag) ? 'active' : '';
      return `<button class="tag-pill ${isActive}" onclick="filterByTag('${tag}')">#${tag}</button>`;
    }).join('');
}


/* ================================================================
   renderAll()
   The master render function. Call this whenever data changes.
   It refreshes every part of the UI in the correct order.
================================================================ */
function renderAll() {
  renderStats();     // update the 4 number cards
  renderSidebar();   // update category nav buttons
  renderTagBar();    // update tag filter pills
  renderResources(); // build and show the resource cards
}
