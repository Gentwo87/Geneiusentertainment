
/*
  GENEIUS ENTERTAINMENT & MANAGEMENT
  Central Public Website Engine

  Pages:
  - Homepage
  - Explore Artists
  - Explore Shows
  - Artist profiles
  - Show posters
  - Customer enquiries
  - Optional DJ packages
  - Genie lamp video navigation

  Data source: Supabase
*/

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ==========================================
   CONFIGURATION
========================================== */

const CONFIG = {
  url: "https://gtzneetxgefimvadwqew.supabase.co",
  key: "sb_publishable_tv5_T8hCxDhCmCehDZFWXA_BUgkTIO0",
  email: "contact@geneiusentertainment.com",
  gemLogo: "GEMlogo.png",
  genieLogo: "logo.png"
};

const db = createClient(CONFIG.url, CONFIG.key);

/* ==========================================
   HELPERS
========================================== */

const $ = (selector, root = document) =>
  root.querySelector(selector);

function el(tag, className = "", content) {
  const node = document.createElement(tag);

  if (className) node.className = className;

  if (content !== undefined) {
    node.textContent = content;
  }

  return node;
}

function truncate(value, length = 160) {
  const text = String(value || "");

  if (text.length <= length) return text;

  return text.slice(0, length - 1).trim() + "…";
}

function safeUrl(value) {
  if (!value) return "";

  try {
    const url = new URL(value, location.href);

    if (
      url.protocol === "https:" ||
      url.protocol === "http:"
    ) {
      return url.href;
    }
  } catch (error) {
    return "";
  }

  return "";
}

function uniqueById(items) {
  const seen = new Set();

  return items.filter(item => {
    if (!item || seen.has(item.id)) return false;

    seen.add(item.id);
    return true;
  });
}

/* ==========================================
   APPLICATION STATE
========================================== */

const state = {
  artists: [],
  shows: [],
  offers: [],
  packages: [],
  actNames: new Map(),
  query: "",
  filter: "all"
};

/* ==========================================
   WEBSITE STYLING
========================================== */

const styles = `
:root {
  color-scheme: dark;

  --bg: #080808;
  --panel: #141312;
  --panel2: #1b1813;

  --gold: #d6ac56;
  --gold2: #f5d995;

  --ink: #f7f2e9;
  --muted: #b5aa9b;

  --line: #473b29;
}

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;

  background:
    radial-gradient(
      ellipse at 50% -12%,
      #3a2a12 0%,
      #100d0a 35%,
      #080808 67%
    );

  color: var(--ink);

  font-family:
    Inter,
    system-ui,
    -apple-system,
    Segoe UI,
    sans-serif;

  min-height: 100vh;
}

a {
  color: inherit;
  text-decoration: none;
}

button,
input,
select,
textarea {
  font: inherit;
}

button {
  cursor: pointer;
}

.ge-wrap {
  max-width: 1190px;
  margin: auto;
  padding: 0 22px;
}

/* NAVIGATION */

.ge-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  min-height: 100px;
}

.ge-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex-shrink: 0;
}


.ge-brand-image {
  display: block;
  width: clamp(125px, 17vw, 200px);
  height: 90px;
  object-fit: contain;

  transform: translate(15px, 22px) scale(1.65);
  transform-origin: center;
}

}

}

.ge-brand-lamp {
  display: block;
  width: 65px;
  height: 85px;
  object-fit: contain;
}

.ge-logo {
  font-family: Georgia, serif;
  letter-spacing: .08em;
  color: var(--gold2);
  font-size: clamp(17px, 2.4vw, 25px);
  font-weight: bold;
}

.ge-logo small {
  display: block;
  font: 10px system-ui;
  letter-spacing: .18em;
  text-align: center;
  color: var(--muted);
  margin-top: 4px;
}

.ge-links {
  display: flex;
  gap: 20px;
  align-items: center;
  flex-wrap: wrap;
}

.ge-links a {
  font-size: 13px;
  color: #e5d7c0;
}

.ge-links a:hover,
.ge-links a[aria-current="page"] {
  color: var(--gold2);
}

/* BUTTONS */

.ge-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  background:
    linear-gradient(
      115deg,
      #9b7029,
      #f1d48d,
      #b48331
    );

  border: 1px solid #d9b76b;
  color: #191207;
  font-weight: 750;

  border-radius: 999px;
  padding: 12px 21px;
  min-height: 44px;
}

.ge-button.secondary {
  background: transparent;
  color: var(--gold2);
  border-color: #7e6238;
}

.ge-button:hover {
  filter: brightness(1.08);
}

.ge-button:disabled {
  opacity: .5;
  cursor: not-allowed;
}

/* HOMEPAGE */

.ge-hero {
  text-align: center;
  padding: 76px 0 52px;
}

.ge-eyebrow {
  color: var(--gold);
  text-transform: uppercase;
  letter-spacing: .32em;
  font-size: 11px;
  font-weight: 700;
}

.ge-hero h1 {
  font:
    normal
    clamp(42px, 7vw, 88px)/1.06
    Georgia,
    serif;

  letter-spacing: -.04em;
  margin: 20px auto;
  max-width: 960px;
}

.ge-hero h1 em {
  color: var(--gold2);
  font-style: normal;
}

.ge-lead {
  max-width: 640px;
  margin: 0 auto;
  color: #cbbfae;
  font-size: clamp(15px, 1.8vw, 19px);
  line-height: 1.65;
}

.ge-actions {
  display: flex;
  gap: 14px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 32px;
}

/* GENIE VIDEOS */

.ge-video-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  margin: 25px 0 75px;
}

.ge-video-card {
  position: relative;
  display: block;
  overflow: hidden;
  min-height: 310px;

  border: 1px solid #5b4729;
  border-radius: 22px;

  background:
    radial-gradient(
      circle at 50% 40%,
      #5c3d16,
      #130e09 62%
    );

  transition:
    transform .2s,
    border-color .2s;
}

.ge-video-card:hover {
  transform: translateY(-3px);
  border-color: var(--gold);
}

.ge-video-card video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: .75;
}

.ge-video-fallback {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #a77e38;
  font: 90px Georgia, serif;
  opacity: .23;
}

.ge-video-label {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 55px 25px 25px;

  background:
    linear-gradient(
      transparent,
      #080808ee
    );

  font:
    clamp(25px, 3vw, 40px)
    Georgia,
    serif;
}

.ge-video-label small {
  display: block;
  color: #d4c1a0;
  font: 12px system-ui;
  margin-top: 8px;
  letter-spacing: .07em;
}

/* SECTIONS */

.ge-section {
  padding: 28px 0 75px;
}

.ge-section-title {
  font:
    normal
    clamp(30px, 4vw, 47px)
    Georgia,
    serif;

  margin: 0 0 12px;
}

.ge-section-intro {
  color: var(--muted);
  max-width: 690px;
  line-height: 1.6;
  margin: 0 0 28px;
}

/* SEARCH */

.ge-toolbar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin: 26px 0;
}

.ge-input {
  background: #171511;
  border: 1px solid #5c4c35;
  border-radius: 12px;
  padding: 13px 15px;
  color: #fff;
  min-height: 46px;
  width: 100%;
}

.ge-toolbar .ge-input {
  flex: 1;
  min-width: 210px;
}

.ge-toolbar select {
  width: auto;
  min-width: 160px;
}

/* CARDS */

.ge-grid {
  display: grid;

  grid-template-columns:
    repeat(
      auto-fill,
      minmax(240px, 1fr)
    );

  gap: 20px;
}

.ge-card {
  background:
    linear-gradient(
      160deg,
      #211b14,
      #111010
    );

  border: 1px solid #443725;
  border-radius: 17px;
  overflow: hidden;

  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.ge-card-image {
  aspect-ratio: 4 / 3;

  background:
    radial-gradient(
      circle,
      #3c2c16,
      #15120e
    );

  display: grid;
  place-items: center;

  color: #b58a46;
  font: 68px Georgia, serif;
  overflow: hidden;
}

.ge-card-image.show-poster {
  aspect-ratio: 3 / 4;
}

.ge-card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ge-card-image.show-poster img {
  object-fit: contain;
}

.ge-card-body {
  padding: 20px;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 10px;
}

.ge-card h3 {
  font: normal 26px Georgia, serif;
  margin: 0;
}

.ge-card p {
  color: var(--muted);
  line-height: 1.55;
  font-size: 14px;
  margin: 0;
}

.ge-tags {
  color: var(--gold2);
  font-size: 12px;
  line-height: 1.6;
}

.ge-card .ge-button {
  margin-top: auto;
  align-self: flex-start;
  font-size: 13px;
}

/* STATUS */

.ge-status {
  color: var(--muted);
  padding: 20px 0;
}

.ge-empty {
  border: 1px dashed #54432c;
  border-radius: 12px;
  padding: 24px;
  color: var(--muted);
}

/* FOOTER */

.ge-footer {
  border-top: 1px solid #352c20;
  padding: 25px 0;
  color: #a79a89;
  font-size: 12px;

  display: flex;
  gap: 20px;
  justify-content: space-between;
  flex-wrap: wrap;
}

/* MODALS */

.ge-dialog {
  width: min(760px, calc(100% - 24px));
  max-height: min(90vh, 900px);
  overflow: auto;

  background: #14110e;
  color: var(--ink);

  border: 1px solid #8b6a35;
  border-radius: 20px;
  padding: 0;
  box-shadow: 0 24px 100px #000c;
}

.ge-dialog::backdrop {
  background: #000b;
}

.ge-dialog-content {
  padding: 25px;
}

.ge-dialog-head {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 20px;
}

.ge-dialog h2 {
  font: normal 36px Georgia, serif;
  margin: 5px 0 12px;
}

.ge-close {
  background: #30271d;
  border: 1px solid #655033;
  color: #fff;
  border-radius: 50%;
  width: 38px;
  height: 38px;
  flex: none;
}

.ge-detail-image {
  max-height: 400px;
  width: 100%;
  object-fit: contain;
  border-radius: 12px;
  margin: 12px 0;
}

/* ENQUIRY FORM */

.ge-form {
  display: grid;
  gap: 14px;
  margin-top: 18px;
}

.ge-form label {
  display: grid;
  gap: 6px;
  color: #e5d6be;
  font-size: 13px;
}

.ge-form textarea {
  min-height: 90px;
  resize: vertical;
}

.ge-note {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.5;
}

.ge-msg {
  color: #f2d58b;
  min-height: 20px;
}

.ge-show-choices {
  display: grid;
  gap: 8px;
}

.ge-show-option {
  display: flex !important;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border: 1px solid #54432c;
  border-radius: 10px;
}

.ge-show-option img {
  width: 53px;
  height: 68px;
  object-fit: contain;
  border-radius: 5px;
}

.ge-show-option span {
  flex: 1;
}

.ge-show-option input {
  width: 18px;
  height: 18px;
  accent-color: #d6ac56;
}

/* MOBILE */

@media (max-width: 650px) {

  .ge-nav {
    align-items: flex-start;
    flex-direction: column;
    padding: 18px 0;
    gap: 17px;
  }

  .ge-brand {
    gap: 8px;
  }

  .ge-brand-image {
    width: 145px;
    height: 70px;
  }

  .ge-brand-lamp {
    width: 50px;
    height: 65px;
  }

  .ge-links {
    gap: 13px;
  }

  .ge-hero {
    padding: 45px 0 35px;
  }

  .ge-video-grid {
    grid-template-columns: 1fr;
  }

  .ge-video-card {
    min-height: 260px;
  }

  .ge-dialog-content {
    padding: 18px;
  }
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }

  .ge-video-card {
    transition: none;
  }
}
`;

function injectStyle() {
  const style = el("style");
  style.textContent = styles;
  document.head.append(style);
}

/* ==========================================
   NAVIGATION
========================================== */

function nav(active) {
  const header = el("header");

  header.innerHTML = `
    <div class="ge-wrap ge-nav">

      <a
        class="ge-brand"
        href="index.html"
        aria-label="Geneius Entertainment & Management — Home"
      >
        <img
          class="ge-brand-lamp"
          src="${CONFIG.genieLogo}"
          alt=""
          onerror="this.style.display='none'"
        >

        <img
          class="ge-brand-image"
          src="${CONFIG.gemLogo}"
          alt="Geneius Entertainment & Management"
          onerror="this.style.display='none';this.nextElementSibling.style.display='block'"
        >

        <span class="ge-logo" style="display:none">
          GENEIUS
          <small>ENTERTAINMENT &amp; MANAGEMENT</small>
        </span>
      </a>

      <nav class="ge-links" aria-label="Main navigation">

        <a
          href="index.html"
          ${active === "home" ? 'aria-current="page"' : ""}
        >
          Home
        </a>

        <a
          href="acts.html"
          ${active === "artists" ? 'aria-current="page"' : ""}
        >
          Explore Artists
        </a>

        <a
          href="explore-shows.html"
          ${active === "shows" ? 'aria-current="page"' : ""}
        >
          Explore Shows
        </a>

        <a href="contact.html">
          Contact
        </a>

        <a href="admin.html">
          Admin
        </a>

      </nav>

    </div>
  `;

  return header;
}

function footer() {
  const footerNode = el(
    "footer",
    "ge-wrap ge-footer"
  );

  const copyright = el(
    "span",
    "",
    `© ${new Date().getFullYear()} Geneius Entertainment & Management`
  );

  const contact = el("span");

  contact.append(
    document.createTextNode(
      "Your all-in-one entertainment agency · "
    )
  );

  const emailLink = el(
    "a",
    "",
    CONFIG.email
  );

  emailLink.href = `mailto:${CONFIG.email}`;

  contact.append(emailLink);

  footerNode.append(
    copyright,
    contact
  );

  return footerNode;
}

/* ==========================================
   IMAGES AND CARDS
========================================== */

function imageBox(url, label, isPoster = false) {
  const box = el(
    "div",
    isPoster
      ? "ge-card-image show-poster"
      : "ge-card-image"
  );

  const imageUrl = safeUrl(url);

  if (imageUrl) {
    const image = el("img");

    image.src = imageUrl;
    image.alt = label;
    image.loading = "lazy";

    image.onerror = () => {
      box.replaceChildren(
        el("span", "", "✦")
      );
    };

    box.append(image);
  } else {
    box.append(
      el("span", "", "✦")
    );
  }

  return box;
}

function card(
  title,
  description,
  image,
  tags,
  buttonText,
  onClick,
  isPoster = false
) {
  const article = el(
    "article",
    "ge-card"
  );

  article.append(
    imageBox(image, title, isPoster)
  );

  const body = el(
    "div",
    "ge-card-body"
  );

  body.append(
    el("h3", "", title),
    el("p", "", truncate(description, 175))
  );

  if (tags && tags.length) {
    body.append(
      el(
        "div",
        "ge-tags",
        tags.join(" · ")
      )
    );
  }

  const button = el(
    "button",
    "ge-button secondary",
    buttonText
  );

  button.type = "button";
  button.addEventListener("click", onClick);

  body.append(button);
  article.append(body);

  return article;
}

/* ==========================================
   ARTIST AND SHOW RELATIONSHIPS
========================================== */

function offeringsFor(actId) {
  return uniqueById(
    state.shows.filter(show => {
      const originalLink =
        show.act_id === actId;

      const additionalLink =
        state.offers.some(offer =>
          offer.act_id === actId &&
          offer.show_id === show.id
        );

      return originalLink || additionalLink;
    })
  );
}

function artistsFor(showId) {
  const show = state.shows.find(
    item => item.id === showId
  );

  if (!show) return [];

  return state.artists.filter(artist => {
    const originalLink =
      artist.act_id === show.act_id;

    const additionalLink =
      state.offers.some(offer =>
        offer.act_id === artist.act_id &&
        offer.show_id === showId
      );

    return originalLink || additionalLink;
  });
}

function actIdsForShow(show) {
  const ids = new Set();

  if (show.act_id) {
    ids.add(show.act_id);
  }

  state.offers.forEach(offer => {
    if (offer.show_id === show.id) {
      ids.add(offer.act_id);
    }
  });

  return [...ids];
}

function performerNamesForShow(show) {
  const names = artistsFor(show.id)
    .map(artist => artist.display_name);

  actIdsForShow(show).forEach(id => {
    const name = state.actNames.get(id);

    if (name && !names.includes(name)) {
      names.push(name);
    }
  });

  return names;
}

/* ==========================================
   SEARCH FILTERS
========================================== */

function filteredArtists() {
  const query = state.query;

  return state.artists.filter(artist => {
    const shows = offeringsFor(artist.act_id);

    const searchableText = [
      artist.display_name,
      artist.biography,
      ...(artist.tags || []),
      ...shows.map(show => show.name)
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      searchableText.includes(query);

    const matchesCategory =
      state.filter === "all" ||
      (artist.tags || []).some(tag =>
        tag.toLowerCase().includes(state.filter)
      );

    return matchesSearch && matchesCategory;
  });
}

function filteredShows() {
  const query = state.query;

  return state.shows.filter(show => {
    const searchableText = [
      show.name,
      show.description,
      ...performerNamesForShow(show)
    ]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(query);
  });
}

/* ==========================================
   SUPABASE DATA LOADING
========================================== */

async function load() {
  const [
    artistResult,
    showResult
  ] = await Promise.all([
    db
      .from("agency_act_profiles")
      .select(
        "act_id,display_name,biography,tags,images"
      )
      .eq("published", true),

    db
      .from("agency_shows")
      .select(
        "id,act_id,name,description,poster_url,published"
      )
      .eq("published", true)
  ]);

  if (artistResult.error) {
    throw new Error(
      "Artist profiles: " +
      artistResult.error.message
    );
  }

  if (showResult.error) {
    throw new Error(
      "Published shows: " +
      showResult.error.message
    );
  }

  state.artists = artistResult.data || [];
  state.shows = showResult.data || [];

  const [
    offeringsResult,
    packagesResult,
    actsResult
  ] = await Promise.all([
    db
      .from("agency_show_offerings")
      .select("show_id,act_id"),

    db
      .from("agency_packages")
      .select(
        "id,name,description,dj_act_id,vocal_act_id"
      )
      .eq("published", true),

    db
      .from("acts")
      .select("id,name")
  ]);

  if (offeringsResult.error) {
    console.warn(
      "Show offerings unavailable:",
      offeringsResult.error.message
    );

    state.offers = [];
  } else {
    state.offers = offeringsResult.data || [];
  }

  if (packagesResult.error) {
    console.warn(
      "Packages unavailable:",
      packagesResult.error.message
    );

    state.packages = [];
  } else {
    state.packages = packagesResult.data || [];
  }

  state.actNames = new Map();

  if (actsResult.error) {
    console.warn(
      "Act names unavailable:",
      actsResult.error.message
    );
  } else {
    (actsResult.data || []).forEach(act => {
      state.actNames.set(
        act.id,
        act.name
      );
    });
  }

  console.info(
    "Geneius catalogue loaded:",
    state.artists.length,
    "artists,",
    state.shows.length,
    "shows"
  );
}

/* ==========================================
   MODAL SYSTEM
========================================== */

function createDialog() {
  const dialog = el(
    "dialog",
    "ge-dialog"
  );

  dialog.id = "ge-dialog";

  document.body.append(dialog);

  dialog.addEventListener("click", event => {
    if (event.target === dialog) {
      dialog.close();
    }
  });

  return dialog;
}

function detailHead(title) {
  const header = el(
    "div",
    "ge-dialog-head"
  );

  header.append(
    el("h2", "", title)
  );

  const close = el(
    "button",
    "ge-close",
    "×"
  );

  close.type = "button";

  close.setAttribute(
    "aria-label",
    "Close"
  );

  close.onclick = () => {
    $("#ge-dialog").close();
  };

  header.append(close);

  return header;
}

function addImage(root, url, alt) {
  const imageUrl = safeUrl(url);

  if (!imageUrl) return;

  const image = el(
    "img",
    "ge-detail-image"
  );

  image.src = imageUrl;
  image.alt = alt;

  root.append(image);
}

/* ==========================================
   ARTIST DETAILS
========================================== */

function showArtist(artist) {
  const dialog = $("#ge-dialog");

  dialog.replaceChildren();

  const content = el(
    "div",
    "ge-dialog-content"
  );

  content.append(
    detailHead(artist.display_name)
  );

  addImage(
    content,
    artist.images?.[0],
    artist.display_name
  );

  content.append(
    el(
      "p",
      "ge-section-intro",
      artist.biography ||
      "Explore this artist's available shows."
    )
  );

  const shows = offeringsFor(artist.act_id);

  content.append(
    el("h3", "", "Available shows")
  );

  if (!shows.length) {
    content.append(
      el(
        "p",
        "ge-note",
        "Contact us to discuss performance options."
      )
    );
  } else {
    const grid = el(
      "div",
      "ge-grid"
    );

    shows.forEach(show => {
      grid.append(
        card(
          show.name,
          show.description,
          show.poster_url,
          [],
          "View show",
          () => showShow(show),
          true
        )
      );
    });

    content.append(grid);
  }

  const enquiry = el(
    "button",
    "ge-button",
    "Enquire about " + artist.display_name
  );

  enquiry.style.marginTop = "20px";

  enquiry.onclick = () => {
    showEnquiry(artist);
  };

  content.append(enquiry);

  dialog.append(content);
  dialog.showModal();
}

/* ==========================================
   SHOW DETAILS
========================================== */

function showShow(show) {
  const dialog = $("#ge-dialog");

  dialog.replaceChildren();

  const content = el(
    "div",
    "ge-dialog-content"
  );

  content.append(
    detailHead(show.name)
  );

  addImage(
    content,
    show.poster_url,
    show.name + " show poster"
  );

  content.append(
    el(
      "p",
      "ge-section-intro",
      show.description ||
      "Contact us to find out more about this show."
    )
  );

  content.append(
    el("h3", "", "Available from")
  );

  const artists = artistsFor(show.id);

  if (artists.length) {
    const grid = el(
      "div",
      "ge-grid"
    );

    artists.forEach(artist => {
      grid.append(
        card(
          artist.display_name,
          artist.biography,
          artist.images?.[0],
          [],
          "Enquire",
          () => showEnquiry(artist, show.id)
        )
      );
    });

    content.append(grid);
  } else {
    const names = performerNamesForShow(show);

    if (names.length) {
      content.append(
        el(
          "p",
          "ge-section-intro",
          names.join(", ")
        )
      );
    }

    const enquiryLink = el(
      "a",
      "ge-button",
      "Enquire about this show"
    );

    const subject =
      "Enquiry: " + show.name;

    enquiryLink.href =
      "mailto:" +
      CONFIG.email +
      "?subject=" +
      encodeURIComponent(subject);

    content.append(enquiryLink);
  }

  dialog.append(content);
  dialog.showModal();
}

/* ==========================================
   CUSTOMER ENQUIRIES
========================================== */

function showEnquiry(
  artist,
  preselectShowId = null
) {
  const dialog = $("#ge-dialog");

  dialog.replaceChildren();

  const content = el(
    "div",
    "ge-dialog-content"
  );

  content.append(
    detailHead(
      "Enquire: " + artist.display_name
    )
  );

  content.append(
    el(
      "p",
      "ge-note",
      "This is an enquiry, not a confirmed booking. " +
      "We will check availability before confirming."
    )
  );

  const form = el(
    "form",
    "ge-form"
  );

  function field(
    label,
    type,
    required = true
  ) {
    const wrapper = el(
      "label",
      "",
      label
    );

    const input = el(
      "input",
      "ge-input"
    );

    input.type = type;
    input.required = required;

    wrapper.append(input);
    form.append(wrapper);

    return input;
  }

  const name = field(
    "Your name",
    "text"
  );

  name.maxLength = 150;

  const email = field(
    "Email address",
    "email"
  );

  email.maxLength = 254;

  const date = field(
    "Event date",
    "date",
    false
  );

  const availableShows = offeringsFor(
    artist.act_id
  );

  const selectedShows = new Set();

  if (
    preselectShowId &&
    availableShows.some(
      show => show.id === preselectShowId
    )
  ) {
    selectedShows.add(preselectShowId);
  }

  if (availableShows.length) {
    form.append(
      el(
        "strong",
        "",
        "Choose up to 2 shows"
      )
    );

    const choices = el(
      "div",
      "ge-show-choices"
    );

    availableShows.forEach(show => {
      const label = el(
        "label",
        "ge-show-option"
      );

      const checkbox = el("input");

      checkbox.type = "checkbox";
      checkbox.value = show.id;

      checkbox.checked =
        selectedShows.has(show.id);

      checkbox.onchange = () => {
        if (
          checkbox.checked &&
          selectedShows.size >= 2
        ) {
          checkbox.checked = false;
          return;
        }

        if (checkbox.checked) {
          selectedShows.add(show.id);
        } else {
          selectedShows.delete(show.id);
        }
      };

      label.append(checkbox);

      const posterUrl = safeUrl(
        show.poster_url
      );

      if (posterUrl) {
        const image = el("img");

        image.src = posterUrl;
        image.alt = "";

        label.append(image);
      }

      label.append(
        el("span", "", show.name)
      );

      choices.append(label);
    });

    form.append(choices);
  }

  /* PERFORMANCE LENGTH */

  const durationLabel = el(
    "label",
    "",
    "Performance length"
  );

  const duration = el(
    "select",
    "ge-input"
  );

  const durationOptions = [
    ["45", "45 minutes per show"],
    ["60", "60 minutes per show"],
    ["90", "One show — 90 minutes"],
    ["120", "One show — 120 minutes"]
  ];

  durationOptions.forEach(([value, text]) => {
    const option = el(
      "option",
      "",
      text
    );

    option.value = value;

    duration.append(option);
  });

  durationLabel.append(duration);
  form.append(durationLabel);

  /* OPTIONAL DJ PACKAGE */

  const djOptions = state.packages.filter(
    pkg => pkg.vocal_act_id === artist.act_id
  );

  let djSelect = null;

  if (djOptions.length) {
    const label = el(
      "label",
      "",
      "Optional DJ accompaniment"
    );

    djSelect = el(
      "select",
      "ge-input"
    );

    const none = el(
      "option",
      "",
      "No DJ required"
    );

    none.value = "";

    djSelect.append(none);

    djOptions.forEach(pkg => {
      const option = el(
        "option",
        "",
        pkg.name
      );

      option.value = pkg.id;

      djSelect.append(option);
    });

    label.append(djSelect);
    form.append(label);
  }

  /* EVENT NOTES */

  const notesLabel = el(
    "label",
    "",
    "Event details / questions"
  );

  const notes = el(
    "textarea",
    "ge-input"
  );

  notes.maxLength = 3000;

  notesLabel.append(notes);
  form.append(notesLabel);

  /* SUBMISSION */

  const message = el(
    "div",
    "ge-msg"
  );

  message.setAttribute(
    "role",
    "status"
  );

  const submit = el(
    "button",
    "ge-button",
    "Send enquiry"
  );

  submit.type = "submit";

  form.append(submit, message);

  form.onsubmit = async event => {
    event.preventDefault();

    const minutes = Number(
      duration.value
    );

    if (
      availableShows.length &&
      selectedShows.size === 0
    ) {
      message.textContent =
        "Please select at least one show.";

      return;
    }

    if (
      minutes > 60 &&
      selectedShows.size !== 1
    ) {
      message.textContent =
        "For a full-length performance, " +
        "please select one show.";

      return;
    }

    const packageId =
      djSelect?.value || null;

    const payload = {
      customer_name: name.value.trim(),
      customer_email: email.value.trim(),

      event_date: date.value || null,

      notes: notes.value.trim(),

      request_type:
        packageId ? "package" : "artist",

      act_id:
        packageId ? null : artist.act_id,

      package_id: packageId,

      show_ids: [...selectedShows],

      minutes_per_show: minutes,

      status: "new"
    };

    submit.disabled = true;

    message.textContent = "Sending…";

    const { error } = await db
      .from("agency_enquiries")
      .insert(payload);

    submit.disabled = false;

    if (error) {
      console.error(
        "Enquiry submission failed:",
        error
      );

      message.textContent =
        "Could not send your enquiry. " +
        "Please email " +
        CONFIG.email;

      return;
    }

    form.replaceWith(
      el(
        "p",
        "ge-status",
        "Thank you. Your enquiry has been sent. " +
        "We will be in touch to discuss availability."
      )
    );
  };

  content.append(form);

  dialog.append(content);
  dialog.showModal();
}

/* ==========================================
   SECTION HEADERS
========================================== */

function sectionHeader(title, intro) {
  const header = el("div");

  header.append(
    el("h1", "ge-section-title", title),
    el("p", "ge-section-intro", intro)
  );

  return header;
}

/* ==========================================
   SEARCH TOOLBAR
========================================== */

function toolbar(type, render) {
  const wrapper = el(
    "div",
    "ge-toolbar"
  );

  const search = el(
    "input",
    "ge-input"
  );

  search.type = "search";

  search.placeholder =
    type === "artists"
      ? "Search artists, styles or shows…"
      : "Search 60s, Motown, ABBA, Christmas…";

  search.setAttribute(
    "aria-label",
    "Search"
  );

  search.oninput = () => {
    state.query = search.value
      .toLowerCase()
      .trim();

    render();
  };

  wrapper.append(search);

  if (type === "artists") {
    const select = el(
      "select",
      "ge-input"
    );

    const categories = [
      ["all", "All artists"],
      ["singer", "Singers"],
      ["duo", "Duos"],
      ["dj", "DJs"],
      ["band", "Bands"],
      ["tribute", "Tributes"]
    ];

    categories.forEach(([value, text]) => {
      const option = el(
        "option",
        "",
        text
      );

      option.value = value;
      select.append(option);
    });

    select.onchange = () => {
      state.filter = select.value;
      render();
    };

    wrapper.append(select);
  }

  return wrapper;
}

/* ==========================================
   EXPLORE ARTISTS / EXPLORE SHOWS
========================================== */

function renderDirectory(type, main) {
  main.replaceChildren();

  const isArtists = type === "artists";

  main.append(
    sectionHeader(
      isArtists
        ? "Explore Artists"
        : "Explore Shows",

      isArtists
        ? "Discover exceptional performers and explore the shows they offer."
        : "Find your perfect soundtrack, then choose the artist who brings it to life."
    )
  );

  const grid = el(
    "div",
    "ge-grid"
  );

  const count = el(
    "div",
    "ge-status"
  );

  function render() {
    grid.replaceChildren();

    const items = isArtists
      ? filteredArtists()
      : filteredShows();

    count.textContent =
      `${items.length} ` +
      (isArtists ? "artist" : "show") +
      (items.length === 1 ? "" : "s");

    items.forEach(item => {
      if (isArtists) {
        const shows = offeringsFor(
          item.act_id
        );

        grid.append(
          card(
            item.display_name,
            item.biography,
            item.images?.[0],

            shows
              .map(show => show.name)
              .slice(0, 4),

            "View artist",

            () => showArtist(item)
          )
        );
      } else {
        const performerNames =
          performerNamesForShow(item);

        grid.append(
          card(
            item.name,
            item.description,
            item.poster_url,

            performerNames,

            "Explore show",

            () => showShow(item),

            true
          )
        );
      }
    });

    if (!items.length) {
      grid.append(
        el(
          "div",
          "ge-empty",
          isArtists
            ? "No artists match your search."
            : "No published shows found. Check that your shows are published in admin."
        )
      );
    }
  }

  main.append(
    toolbar(type, render),
    count,
    grid
  );

  render();
}

/* ==========================================
   HOMEPAGE
========================================== */

function home(main) {
  const hero = el(
    "section",
    "ge-hero"
  );

  hero.innerHTML = `
    <div class="ge-eyebrow">
      Geneius Entertainment &amp; Management
    </div>

    <h1>
      Entertainment with a touch of
      <em>magic.</em>
    </h1>

    <p class="ge-lead">
      Discover unforgettable singers,
      DJs, duos, bands and spectacular
      themed shows.

      Your perfect event starts here.
    </p>

    <div class="ge-actions">

      <a
        class="ge-button"
        href="acts.html"
      >
        Explore Artists
      </a>

      <a
        class="ge-button secondary"
        href="explore-shows.html"
      >
        Explore Shows
      </a>

    </div>
  `;

  main.append(hero);

  /* GENIE LAMP VIDEOS */

  const videoGrid = el(
    "div",
    "ge-video-grid"
  );

  const videos = [
    [
      "Explore Artists",
      "acts.html",
      "videos/ArtistsLamp.mp4",
      "Meet the talent behind the magic"
    ],
    [
      "Explore Shows",
      "explore-shows.html",
      "videos/ShowsLamp.mp4",
      "Find a show for every occasion"
    ]
  ];

  videos.forEach(
    ([name, url, videoPath, subtitle]) => {
      const link = el(
        "a",
        "ge-video-card"
      );

      link.href = url;

      const fallback = el(
        "div",
        "ge-video-fallback",
        "✦"
      );

      link.append(fallback);

      const video = el("video");

      video.autoplay = true;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;

      video.setAttribute(
        "aria-hidden",
        "true"
      );

      const source = el("source");

      source.src = videoPath;
      source.type = "video/mp4";

      video.append(source);
      link.append(video);

      const label = el(
        "div",
        "ge-video-label",
        name
      );

      label.append(
        el("small", "", subtitle)
      );

      link.append(label);

      videoGrid.append(link);
    }
  );

  main.append(videoGrid);

  /* FEATURED ARTISTS */

  const section = el(
    "section",
    "ge-section"
  );

  section.append(
    sectionHeader(
      "Discover the possibilities",
      "Real artists, real shows, and a personalised entertainment experience."
    )
  );

  const grid = el(
    "div",
    "ge-grid"
  );

  state.artists
    .slice(0, 4)
    .forEach(artist => {
      const shows = offeringsFor(
        artist.act_id
      );

      grid.append(
        card(
          artist.display_name,
          artist.biography,
          artist.images?.[0],

          shows
            .map(show => show.name)
            .slice(0, 3),

          "View artist",

          () => showArtist(artist)
        )
      );
    });

  if (!state.artists.length) {
    grid.append(
      el(
        "div",
        "ge-empty",
        "Our artist catalogue is being prepared."
      )
    );
  }

  section.append(grid);
  main.append(section);
}

/* ==========================================
   APPLICATION STARTUP
========================================== */

async function boot() {
  injectStyle();

  const page =
    document.body.dataset.geneiusPage ||
    "home";

  document.body.prepend(
    nav(page)
  );

  const main = el(
    "main",
    "ge-wrap"
  );

  main.id = "ge-main";

  document.body.append(
    main,
    footer()
  );

  createDialog();

  if (page === "home") {
    home(main);
  } else {
    main.classList.add("ge-section");

    main.append(
      el(
        "p",
        "ge-status",
        "Loading artists and shows…"
      )
    );
  }

  try {
    await load();

    main.replaceChildren();

    if (page === "home") {
      home(main);
    } else if (
      page === "artists" ||
      page === "shows"
    ) {
      renderDirectory(page, main);
    } else {
      home(main);
    }
  } catch (error) {
    console.error(
      "Geneius catalogue load failed:",
      error
    );

    main.replaceChildren(
      el(
        "div",
        "ge-empty",
        "We could not load the live catalogue. " +
        "Please try again shortly or email " +
        CONFIG.email
      )
    );
  }
}

boot();
