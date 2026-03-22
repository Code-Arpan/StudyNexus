/*
  js/render.js  (v2)
  Builds and displays all cards, sidebar, stats, tag bar.

  NEW in v2:
    • Cards distinguish URL vs File resources
    • File cards show file icon, type badge, file size
    • Open File button creates a Blob URL and opens in new tab
    • Type-filter sidebar ("By Type") section
    • Edit button (✏) on every card opens the edit modal
    • Category badge is clickable to quick-filter
*/

/* ── getFilteredResources ────────────────────────────────── */
function getFilteredResources() {
  const query = document.getElementById('search-input').value.toLowerCase();

  return resources.filter(function(r) {

    // 1. Starred / category filter
    if (currentFilter === 'starred' && !r.starred) return false;
    if (currentFilter !== 'all' && currentFilter !== 'starred' && r.category !== currentFilter) return false;

    // 2. File-type filter (PDF, Video, Image, etc.)
    if (currentTypeFilter) {
      const label = r.type === 'file' ? getFileTypeLabel(r.fileType) : 'URL';
      if (label !== currentTypeFilter) return false;
    }

    // 3. Tag filter
    if (activeTag && !(r.tags || []).includes(activeTag)) return false;

    // 4. Search text
    if (query) {
      const haystack = [
        r.title || '',
        r.type === 'url' ? (r.url || '') : (r.fileName || ''),
        r.category || '',
        (r.tags || []).join(' ')
      ].join(' ').toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    return true;
  });
}


/* ── renderResources ──────────────────────────────────────── */
function renderResources() {
  const list      = getFilteredResources();
  const container = document.getElementById('resources-container');

  document.getElementById('page-count').textContent =
    list.length + (list.length === 1 ? ' item' : ' items');

  const titleMap = { all: 'All Resources', starred: '★ Starred' };
  document.getElementById('page-title').textContent =
    currentTypeFilter
      ? currentTypeFilter + ' Files'
      : (titleMap[currentFilter] || currentFilter);

  if (list.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-emoji">📭</span>
        <h3>Nothing here yet!</h3>
        <p>Add a web URL or upload a local file to get started.</p>
      </div>`;
    return;
  }

  container.className = (currentView === 'grid') ? 'resources-grid' : 'resources-list';

  container.innerHTML = list.map(function(resource, index) {
    const delay = index * 60;
    return currentView === 'grid'
      ? buildGridCard(resource, delay)
      : buildListCard(resource, delay);
  }).join('');
}


/* ── buildIconHTML ────────────────────────────────────────────
   Returns the HTML for the icon box shown on a card.
   URL resources → favicon image (falls back to domain letter).
   File resources → emoji icon with coloured background.
──────────────────────────────────────────────────────────── */
function buildIconHTML(r) {
  if (r.type === 'file') {
    const icon  = getFileIcon(r.fileType);
    const label = getFileTypeLabel(r.fileType);

    // Pick a background colour matching the file-type badge
    const bgMap = {
      'PDF':'rgba(255,107,107,0.12)', 'PPT':'rgba(255,140,105,0.12)',
      'DOC':'rgba(86,180,255,0.12)',  'Excel':'rgba(86,217,160,0.12)',
      'Image':'rgba(196,86,255,0.12)','Video':'rgba(255,217,61,0.12)',
      'Audio':'rgba(123,104,238,0.12)','Archive':'rgba(255,175,86,0.12)',
    };
    const bg = bgMap[label] || 'rgba(255,255,255,0.06)';

    return `<div class="file-icon-box" style="background:${bg}">${icon}</div>`;
  }

  // URL resource — try Google favicon, fallback to first letter
  const faviconUrl    = getFavicon(r.url);
  const fallbackLetter = getDomainLetter(r.url);

  return `<div class="favicon-box">
    ${faviconUrl
      ? `<img src="${faviconUrl}" onerror="this.parentElement.textContent='${fallbackLetter}'" alt="">`
      : fallbackLetter
    }
  </div>`;
}


/* ── buildOpenButton ─────────────────────────────────────────
   URL resources → <a href="..."> that opens the link in a new tab.
   File resources → <button> that calls openFile(id) in actions.js,
                    which reconstructs the file from base64 and opens it.
──────────────────────────────────────────────────────────── */
function buildOpenButton(r) {
  if (r.type === 'url') {
    return `<a class="open-btn" href="${r.url}" target="_blank" rel="noopener">↗ Open</a>`;
  }

  // File resource with actual data stored
  if (r.fileData) {
    return `<button class="open-btn" onclick="openFile('${r.id}')">↗ Open File</button>`;
  }

  // Demo seed data — no actual file stored
  return `<button class="open-btn" style="opacity:0.4;cursor:not-allowed" title="Demo — no real file">📄 Demo</button>`;
}


/* ── buildGridCard ───────────────────────────────────────── */
function buildGridCard(r, delay) {
  const cc          = r.category ? getCatColor(r.category) : null;
  const iconHTML    = buildIconHTML(r);
  const openBtn     = buildOpenButton(r);
  const impEmoji    = r.importance === 'critical' ? '🔥' : r.importance === 'important' ? '⭐' : '';

  // Subtitle line under the title (URL or filename)
  const subtitle = r.type === 'url'
    ? r.url.replace(/^https?:\/\/(www\.)?/,'').slice(0, 45)
    : (r.fileName || '') + (r.fileSize ? '  ·  ' + formatFileSize(r.fileSize) : '');

  const catHTML = cc
    ? `<span class="cat-badge"
         style="background:${cc.bg};color:${cc.color};border:1px solid ${cc.border}"
         onclick="setFilter('${r.category}', null)"
         title="Filter by ${r.category}"
       >${r.category}</span>`
    : '';

  // File-type badge shown on file resources
  const typeBadge = r.type === 'file'
    ? (function() {
        const label = getFileTypeLabel(r.fileType);
        return `<span class="file-type-badge" style="${getFileTypeBadgeStyle(label)}">${label}</span>`;
      })()
    : '';

  const tagsHTML = (r.tags || []).slice(0, 3).map(function(tag) {
    return `<span class="tag-badge" onclick="filterByTag('${tag}')">#${tag}</span>`;
  }).join('');

  return `
    <div class="card ${r.starred ? 'starred' : ''}" style="animation-delay:${delay}ms">
      <div class="card-top">
        ${iconHTML}
        <div class="card-title-area">
          <div class="card-title" title="${r.title}">${r.title}</div>
          <div class="card-url">${subtitle}</div>
        </div>
        <div class="card-actions">
          <button class="icon-btn ${r.starred ? 'starred' : ''}"
                  onclick="toggleStar('${r.id}')" title="Star">★</button>
          <button class="icon-btn edit"
                  onclick="openEditModal('${r.id}')" title="Edit">✏</button>
          <button class="icon-btn del"
                  onclick="deleteResource('${r.id}')" title="Delete">✕</button>
        </div>
      </div>
      <div class="card-meta">
        ${catHTML}
        ${typeBadge}
        ${tagsHTML}
        ${impEmoji ? `<span style="font-size:13px">${impEmoji}</span>` : ''}
        ${openBtn}
      </div>
    </div>`;
}


/* ── buildListCard ───────────────────────────────────────── */
function buildListCard(r, delay) {
  const cc       = r.category ? getCatColor(r.category) : null;
  const iconHTML = buildIconHTML(r);
  const openBtn  = buildOpenButton(r);

  const subtitle = r.type === 'url'
    ? r.url.replace(/^https?:\/\/(www\.)?/,'').slice(0, 55)
    : (r.fileName || '') + (r.fileSize ? ' · ' + formatFileSize(r.fileSize) : '');

  const catHTML = cc
    ? `<span class="cat-badge"
         style="background:${cc.bg};color:${cc.color};border:1px solid ${cc.border};white-space:nowrap"
         onclick="setFilter('${r.category}', null)"
       >${r.category}</span>`
    : '';

  const typeBadge = r.type === 'file'
    ? (function() {
        const label = getFileTypeLabel(r.fileType);
        return `<span class="file-type-badge" style="${getFileTypeBadgeStyle(label)}">${label}</span>`;
      })()
    : '';

  const tagsHTML = (r.tags || []).slice(0, 2).map(t => `<span class="tag-badge">#${t}</span>`).join('');

  return `
    <div class="list-card ${r.starred ? 'starred' : ''}" style="animation-delay:${delay}ms">
      <div style="width:32px;height:32px;flex-shrink:0">${iconHTML.replace('38px','32px').replace('38px','32px')}</div>
      <div class="card-title-area">
        <div class="card-title">${r.title}</div>
        <div class="card-url">${subtitle}</div>
      </div>
      ${catHTML}
      ${typeBadge}
      ${tagsHTML}
      <div class="card-actions">
        <button class="icon-btn ${r.starred ? 'starred' : ''}" onclick="toggleStar('${r.id}')">★</button>
        <button class="icon-btn edit" onclick="openEditModal('${r.id}')">✏</button>
        ${openBtn}
        <button class="icon-btn del" onclick="deleteResource('${r.id}')">✕</button>
      </div>
    </div>`;
}


/* ── renderSidebar ───────────────────────────────────────── */
function renderSidebar() {
  // ── Category nav ──
  const cats  = [...new Set(resources.map(r => r.category).filter(Boolean))];
  const catNav = document.getElementById('cat-nav');
  catNav.innerHTML = cats.map(function(cat) {
    const cc    = getCatColor(cat);
    const count = resources.filter(r => r.category === cat).length;
    return `
      <button class="nav-btn ${currentFilter === cat ? 'active' : ''}"
              onclick="setFilter('${cat}', this)">
        <span class="cat-dot" style="background:${cc.color}"></span>
        ${cat}
        <span class="nav-badge">${count}</span>
      </button>`;
  }).join('');

  // ── Type nav  ← NEW ──
  // Collect all distinct file-type labels present in data
  const fileResources = resources.filter(r => r.type === 'file');
  const typeLabels    = [...new Set(fileResources.map(r => getFileTypeLabel(r.fileType)))];

  const typeNav = document.getElementById('type-nav');

  // Also include 'URL' as a type option if any URL resources exist
  const urlCount = resources.filter(r => r.type === 'url').length;
  const urlBtn   = urlCount > 0
    ? `<button class="nav-btn ${currentTypeFilter === 'URL' ? 'active' : ''}"
               onclick="setTypeFilter('URL', this)">
         <span>🔗</span> Web URLs
         <span class="nav-badge">${urlCount}</span>
       </button>`
    : '';

  typeNav.innerHTML = urlBtn + typeLabels.map(function(label) {
    const count = fileResources.filter(r => getFileTypeLabel(r.fileType) === label).length;
    const icon  = { PDF:'📕', PPT:'📊', DOC:'📝', Excel:'📈', Image:'🖼️', Video:'🎬', Audio:'🎵', Archive:'📦', Text:'📃', CSV:'📋' }[label] || '📄';
    return `
      <button class="nav-btn ${currentTypeFilter === label ? 'active' : ''}"
              onclick="setTypeFilter('${label}', this)">
        <span>${icon}</span> ${label}
        <span class="nav-badge">${count}</span>
      </button>`;
  }).join('');

  // ── Count badges ──
  document.getElementById('count-all').textContent     = resources.length;
  document.getElementById('count-starred').textContent = resources.filter(r => r.starred).length;

  // ── Datalists for autocomplete in both modals ──
  const opts = cats.map(c => `<option value="${c}">`).join('');
  document.getElementById('cat-list').innerHTML      = opts;
  document.getElementById('edit-cat-list').innerHTML = opts;
}


/* ── renderStats ─────────────────────────────────────────── */
function renderStats() {
  document.getElementById('stat-total').textContent   = resources.length;
  document.getElementById('stat-cats').textContent    = new Set(resources.map(r => r.category).filter(Boolean)).size;
  document.getElementById('stat-starred').textContent = resources.filter(r => r.starred).length;
  const allTags = resources.flatMap(r => r.tags || []);
  document.getElementById('stat-tags').textContent    = new Set(allTags).size;
}


/* ── renderTagBar ────────────────────────────────────────── */
function renderTagBar() {
  const allTags = [...new Set(resources.flatMap(r => r.tags || []))];
  const bar     = document.getElementById('tag-bar');
  if (!allTags.length) { bar.innerHTML = ''; return; }

  bar.innerHTML =
    `<button class="tag-pill ${!activeTag ? 'active' : ''}" onclick="filterByTag(null)">All</button>` +
    allTags.map(tag =>
      `<button class="tag-pill ${activeTag === tag ? 'active' : ''}" onclick="filterByTag('${tag}')">#${tag}</button>`
    ).join('');
}


/* ── renderAll ───────────────────────────────────────────── */
function renderAll() {
  renderStats();
  renderSidebar();
  renderTagBar();
  renderResources();
}
