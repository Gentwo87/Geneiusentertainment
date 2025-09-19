/* main.js — Acts page renderer & filters
   Requires window.TALENT from talent.js
*/
(function () {
  const talent = (window.TALENT || []).slice();

  // Build a unique, sorted tag list to render chips
  const tagSet = new Set();
  talent.forEach(t => (t.tags || []).forEach(tag => tagSet.add(tag)));
  const ALL_TAGS = ["all", ...Array.from(tagSet).sort()];

  const els = {
    q: document.getElementById("q"),
    filters: document.getElementById("filters"),
    results: document.getElementById("results"),
    empty: document.getElementById("empty"),
  };

  if (!els.results) return; // not on acts.html

  // Render filter chips
  let activeTags = new Set(["all"]);
  els.filters.innerHTML = ALL_TAGS
    .map(tag => `<button class="chip ${tag==="all"?"active":""}" data-filter="${tag}">${tag}</button>`)
    .join("");

  els.filters.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-filter]");
    if (!btn) return;
    const tag = btn.getAttribute("data-filter");

    if (tag === "all") {
      activeTags = new Set(["all"]);
      Array.from(els.filters.querySelectorAll(".chip")).forEach(c => c.classList.toggle("active", c.dataset.filter==="all"));
    } else {
      activeTags.delete("all");
      btn.classList.toggle("active");
      const on = btn.classList.contains("active");
      if (on) activeTags.add(tag); else activeTags.delete(tag);
      if (activeTags.size === 0) activeTags = new Set(["all"]);
      // keep visual state of "all"
      const allBtn = els.filters.querySelector('[data-filter="all"]');
      allBtn.classList.toggle("active", activeTags.has("all"));
    }
    apply();
  });

  els.q.addEventListener("input", apply);

  function apply() {
    const q = els.q.value.trim().toLowerCase();

    const filtered = talent.filter(t => {
      // tag match
      const tags = (t.tags || []).map(x => x.toLowerCase());
      const tagOK = activeTags.has("all") || Array.from(activeTags).every(tag => tags.includes(tag.toLowerCase()));

      // text match (name or tags)
      const textOK =
        !q ||
        t.name.toLowerCase().includes(q) ||
        tags.some(tag => tag.includes(q));

      return tagOK && textOK;
    });

    render(filtered);
  }

  function render(list) {
    els.results.innerHTML = list.map(cardHTML).join("");
    els.empty.hidden = list.length !== 0;
  }

  function cardHTML(t) {
    return `
      <article class="card">
        <img src="${t.img}" alt="${t.name}">
        <div class="meta">
          <div class="name">${t.name}</div>
          <p class="bio">${t.bio || ""}</p>
        </div>
      </article>
    `;
  }

  // initial paint
  render(talent);
})();
