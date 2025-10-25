// acts-renderer.js
// Shared renderer for all Acts, Singers, Tributes, Bands, etc.
// Requires: window.TALENT (from talent.js)

(function() {
  const TALENT = window.TALENT || [];
  const grid = document.getElementById('acts-grid');
  if (!grid) return;

  // Default tag from page
  const defaultTag = window.DEFAULT_TAG || 'all';
  let activeTag = defaultTag;
  const input = document.querySelector('#acts-search');
  const chips = [...document.querySelectorAll('.chip')];

  function cardHTML(a) {
    const tags = (a.tags || []).map(t => `<span class="tag">${t}</span>`).join('');
    const imgSrc = a.img || 'logo.png';
    return `
      <div class="card">
        <div class="art gallery" tabindex="0">
          <div class="slides">
            ${(a.gallery || [imgSrc])
              .map(img => `<img src="${img}" alt="${a.name}">`)
              .join('')}
          </div>
          <button class="nav prev" aria-label="Previous">‹</button>
          <button class="nav next" aria-label="Next">›</button>
          <div class="overlay">
            <h3>${a.name}</h3>
            <p>${a.bio || ''}</p>
          </div>
        </div>
        <div class="meta">
          <strong>${a.name}</strong><br>
          ${tags}
        </div>
      </div>
    `;
  }

  function render(list) {
    grid.innerHTML = list.length
      ? list.map(cardHTML).join('')
      : `<div class="empty">No acts match your filters.</div>`;
    setupGalleries();
  }

  function applyFilter() {
    const q = (input?.value || '').toLowerCase();
    const out = TALENT.filter(a => {
      const hay = [a.name, a.bio, ...(a.tags || [])].join(' ').toLowerCase();
      const tagOK = activeTag === 'all' || (a.tags || []).includes(activeTag);
      const qOK = !q || hay.includes(q);
      return tagOK && qOK;
    });
    render(out);
  }

  // Gallery logic
  function setupGalleries() {
    document.querySelectorAll('.gallery').forEach(gallery => {
      const slides = gallery.querySelector('.slides');
      const imgs = [...slides.querySelectorAll('img')];
      const prev = gallery.querySelector('.nav.prev');
      const next = gallery.querySelector('.nav.next');
      let index = 0;

      function show(i) {
        index = (i + imgs.length) % imgs.length;
        slides.style.transform = `translateX(-${index * 100}%)`;
      }
      prev.addEventListener('click', () => show(index - 1));
      next.addEventListener('click', () => show(index + 1));
    });
  }

  // Events
  input?.addEventListener('input', applyFilter);
  chips.forEach(c => c.addEventListener('click', () => {
    chips.forEach(x => x.classList.toggle('active', x === c));
    activeTag = c.dataset.tag;
    applyFilter();
  }));

  // Initial render
  applyFilter();
})();
