
/*
 Geneius Entertainment
 Booking Enquiries & Contracts — Admin Add-on

 Requires the Geneius Booking Review SQL setup.
 This file does not replace the existing admin calendar.
*/

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const db = createClient(
  "https://gtzneetxgefimvadwqew.supabase.co",
  "sb_publishable_tv5_T8hCxDhCmCehDZFWXA_BUgkTIO0"
);

const esc = s => String(s ?? "").replace(
  /[&<>"']/g,
  c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]
);

const money = p => "£" + (Number(p || 0) / 100).toFixed(2);

const panel = document.getElementById("notificationsPanel");

if (panel) {
  const root = document.createElement("div");
  root.id = "geneiusBookingReview";

  root.innerHTML = `
    <style>
      #geneiusBookingReview { margin-top:20px; } #geReviewList{display:grid;gap:12px} #geneiusBookingReview .ge-review-card{border-left:4px solid #6c5939} #geneiusBookingReview .ge-review-card.ge-new{border-left-color:#f0c66d;background:#272116} #geneiusBookingReview .ge-review-card.ge-payment{border-left-color:#70c9b7;background:#162523} #geneiusBookingReview .ge-review-card.ge-confirmed{border-left-color:#79ba8d} #geneiusBookingReview .ge-inbox-toolbar{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0} #geneiusBookingReview .ge-inbox-toolbar input{flex:2;min-width:190px} #geneiusBookingReview .ge-inbox-toolbar select{flex:1;min-width:130px} #geneiusBookingReview .ge-review-card .ge-preview{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#c7b9a5} #geneiusBookingReview .ge-review-card .ge-meta{font-size:12px;color:#e4c78b}
      #geneiusBookingReview button {
        margin:4px;
        padding:10px 14px;
        border-radius:9px;
        background:#3a3022;
        color:#f4dfb0;
        border:1px solid #a8874e;
      }
      #geneiusBookingReview input,
      #geneiusBookingReview textarea,
      #geneiusBookingReview select {
        width:100%;
        background:#17171c;
        color:white;
        border:1px solid #5d5140;
        border-radius:9px;
        padding:10px;
      }
      #geneiusBookingReview label {
        display:block;
        margin:12px 0 5px;
        color:#dfc895;
      }
      #geneiusBookingReview .ge-review-card {
        padding:16px;
        margin:12px 0;
        border:1px solid #665139;
        border-radius:14px;
        background:#17171c;
      }
      #geneiusBookingReview .ge-review-grid {
        display:grid;
        grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
        gap:12px;
      }
      #geneiusBookingReview .ge-review-muted {
        color:#b6b2ac;
      }
      #geneiusBookingReview .ge-review-actions {
        display:flex;
        gap:8px;
        flex-wrap:wrap;
      }
    </style>

    <h2>Booking Enquiries &amp; Contracts</h2>
    <p class="ge-review-muted">
      Review requests, prepare quotations and create
      private customer review links.
    </p>
    <button type="button" id="geReviewRefresh">
      Refresh enquiries
    </button>
    <p id="geReviewStatus" role="status"></p>
    <div class="ge-inbox-toolbar"><input id="geReviewSearch" placeholder="Search customer, act or message" aria-label="Search requests"><select id="geReviewFilter" aria-label="Filter requests"><option value="all">All requests</option><option value="new">New enquiries</option><option value="payment_pending">Payments to verify</option><option value="accepted">Accepted quotes</option><option value="sent">Quotes sent</option><option value="paid">Deposits verified</option></select></div><div id="geReviewList"></div>
    <div id="geReviewEditor"></div>
  `;

  panel.append(root);

  const $ = s => root.querySelector(s);

  let enquiries = [];
  let offers = [];
  let acts = [];
  let shows = [];
  let packages = [];

  const status = text => {
    $("#geReviewStatus").textContent = text;
  };

  async function load() {
    status("Loading…");

    const { data: { session } } = await db.auth.getSession();

    if (!session) {
      status("Sign in to admin first, then refresh.");
      return;
    }

    const admin = await db.rpc("is_booking_admin");

    if (admin.error || admin.data !== true) {
      status("Admin permission required.");
      return;
    }

    const results = await Promise.all([
      db.from("agency_enquiries")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(150),

      db.from("geneius_booking_offers")
        .select("*")
        .order("created_at", { ascending: false }),

      db.from("acts").select("id,name"),
      db.from("agency_shows").select("id,name"),
      db.from("agency_packages").select("id,name")
    ]);

    const failed = results.find(r => r.error);

    if (failed) {
      status("Cannot load: " + failed.error.message);
      return;
    }

    [enquiries, offers, acts, shows, packages] =
      results.map(r => r.data || []);

    renderList();
    status(enquiries.length + " enquiries loaded.");
  }

  function actName(id) {
    return acts.find(a => a.id === id)?.name ||
      id || "Not selected";
  }

  function showNames(ids) {
    return (ids || [])
      .map(id => shows.find(s => s.id === id)?.name || id)
      .join(", ") || "Not selected";
  }

  function renderList() {
    const list = $("#geReviewList");
    list.replaceChildren();
    const term = ($("#geReviewSearch").value || "").toLowerCase().trim();
    const filter = $("#geReviewFilter").value;
    const latestOffer = e => offers.filter(o => o.enquiry_id === e.id)
      .sort((a,b) => (b.revision || 0) - (a.revision || 0))[0];
    let shown = 0;
    enquiries.forEach(e => {
      const offer = latestOffer(e);
      const searchable = [e.customer_name,e.customer_email,e.notes,e.request_type,actName(e.act_id),e.event_date].join(" ").toLowerCase();
      if(term && !searchable.includes(term)) return;
      if(filter !== "all" && !(filter === "new" ? e.status === "new" : offer?.status === filter)) return;
      shown++;
      const div = document.createElement("article");
      div.className = "ge-review-card" + (e.status === "new" ? " ge-new" : offer?.status === "payment_pending" ? " ge-payment" : offer?.status === "paid" ? " ge-confirmed" : "");
      const title = document.createElement("h3");
      title.textContent = e.customer_name || "Customer";
      const meta = document.createElement("p");
      meta.className = "ge-meta";
      meta.textContent = [e.status === "new" ? "● NEW REQUEST" : "Request: " + e.status,
        "Offer: " + (offer?.status || "Not quoted"),e.event_date || "Date TBC",actName(e.act_id)].join(" · ");
      const preview = document.createElement("p");
      preview.className = "ge-preview";
      preview.textContent = e.notes || e.customer_email || "No message supplied";
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Open request & quotation";
      button.onclick = () => edit(e);
      div.append(title,meta,preview,button);
      list.append(div);
    });
    if(!shown) list.textContent = "No requests match this filter.";
  }

  const defaultTerms = `
This quotation is subject to the agreed performance
details. The booking is not confirmed until the
required deposit has been received.

After accepting this agreement, the customer has
24 hours to pay the deposit.

If payment is not received within this period,
the provisional reservation may expire and the
date may become available to other customers.

Cancellation, rescheduling and refund arrangements
must be agreed in writing.
  `.trim();

  function edit(e) {
    const existing = offers.find(o => o.enquiry_id === e.id);
    const box = $("#geReviewEditor");

    box.innerHTML = `
      <div class="ge-review-card">
        <h2>Review: ${esc(e.customer_name)}</h2>

        <p>
          <b>Email:</b> ${esc(e.customer_email)}<br>
          <b>Date:</b> ${esc(e.event_date || "TBC")}<br>
          <b>Act:</b> ${esc(actName(e.act_id))}<br>
          <b>Shows:</b> ${esc(showNames(e.show_ids))}<br>
          <b>Type:</b> ${esc(e.request_type)}<br>
          <b>Package:</b>
          ${esc(packages.find(p => p.id === e.package_id)?.name || "None")}
          <br>
          <b>Duration:</b>
          ${esc(e.minutes_per_show || "Not specified")}
          minutes per show
        </p>

        <p><b>Customer notes:</b></p>
        <p style="white-space:pre-wrap">
          ${esc(e.notes || "None")}
        </p>

        <div class="ge-review-grid">
          <div>
            <label>Performance price (£)</label>
            <input id="gePrice" type="number"
              min="0" step="0.01"
              value="${existing ? existing.price_pence / 100 : ""}">
          </div>

          <div>
            <label>Deposit (%)</label>
            <select id="geDepositPct">
              <option>10</option>
              <option>20</option>
              <option selected>25</option>
              <option>30</option>
              <option>50</option>
            </select>
          </div>

          <div>
            <label>Venue / location</label>
            <input id="geVenue"
              value="${esc(existing?.venue || "")}">
          </div>

          <div>
            <label>Start time</label>
            <input id="geStart" type="time"
              value="${esc(existing?.start_time || "")}">
          </div>

          <div>
            <label>End time</label>
            <input id="geEnd" type="time"
              value="${esc(existing?.end_time || "")}">
          </div>
        </div>

        <label>Amendments</label>
        <textarea id="geAmend" rows="3">${esc(existing?.amendments || "")}</textarea>

        <label>Message to customer</label>
        <textarea id="geMessage" rows="3">${esc(
          existing?.admin_message ||
          "Thank you for your enquiry. Please review your booking offer and contract."
        )}</textarea>

        <label>Contract terms</label>
        <textarea id="geTerms" rows="7">${esc(
          existing?.contract_terms || defaultTerms
        )}</textarea>

        <p id="geTotals"></p>

        <div class="ge-review-actions">
          <button id="geSaveDraft">Save draft</button>
          <button id="geSendOffer">Create customer review link</button>
        </div>

        <p id="geEditorStatus" role="status"></p>
        <div id="geLinkArea"></div>
      </div>
    `;

    const val = id => box.querySelector("#" + id).value;
    const total = () => Math.round(Number(val("gePrice")) * 100);

    const calc = () => {
      const p = total();
      const d = Math.round(p * Number(val("geDepositPct")) / 100);

      box.querySelector("#geTotals").textContent =
        "Total " + money(p) +
        " · Deposit " + money(d) +
        " · Balance " + money(p - d);
    };

    box.querySelector("#gePrice").oninput = calc;
    box.querySelector("#geDepositPct").onchange = calc;

    if (existing) {
      const pct = existing.price_pence
        ? Math.round(
            existing.deposit_pence / existing.price_pence * 100
          )
        : 25;

      box.querySelector("#geDepositPct").value = String(pct);

      if (!box.querySelector("#geDepositPct").value) {
        box.querySelector("#geDepositPct").value = "25";
      }
    }

    calc();

    async function save(send) {
      const msg = box.querySelector("#geEditorStatus");
      const p = total();

      if (!Number.isSafeInteger(p) || p <= 0) {
        msg.textContent = "Enter a valid price.";
        return;
      }

      if (!val("geTerms").trim()) {
        msg.textContent = "Contract terms are required.";
        return;
      }

      const deposit = Math.round(
        p * Number(val("geDepositPct")) / 100
      );

      const bytes = new Uint8Array(32);
      crypto.getRandomValues(bytes);

      const token = Array.from(
        bytes,
        b => b.toString(16).padStart(2, "0")
      ).join("");

      const tokenHash = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(token)
      );

      const hash = Array.from(
        new Uint8Array(tokenHash),
        b => b.toString(16).padStart(2, "0")
      ).join("");

      const payload = {
        enquiry_id: e.id,
        price_pence: p,
        deposit_pence: deposit,
        venue: val("geVenue"),
        start_time: val("geStart"),
        end_time: val("geEnd"),
        amendments: val("geAmend"),
        admin_message: val("geMessage"),
        contract_terms: val("geTerms"),
        status: send ? "sent" : "draft",
        sent_at: send ? new Date().toISOString() : null
      };

      const revisions = offers.filter(
        o => o.enquiry_id === e.id
      );

      payload.revision =
        Math.max(0, ...revisions.map(o => o.revision)) + 1;

      payload.customer_token_hash = hash;

      const result = await db
        .from("geneius_booking_offers")
        .insert(payload)
        .select("id")
        .single();

      if (result.error) {
        msg.textContent =
          "Save failed: " + result.error.message;
        return;
      }

      msg.textContent = send
        ? "Offer saved. Copy the customer link. Automatic emails are not configured yet."
        : "Draft saved. Refresh to see it.";

      if (send) {
        const link = new URL(
          "booking-offer.html",
          location.href
        );

        link.searchParams.set("token", token);

        const area = box.querySelector("#geLinkArea");
        area.replaceChildren();

        const paragraph = document.createElement("p");
        paragraph.textContent =
          "Private customer link (copy now):";

        const input = document.createElement("input");
        input.value = link.href;
        input.readOnly = true;

        const copy = document.createElement("button");
        copy.textContent = "Copy customer link";

        copy.onclick = async () => {
          await navigator.clipboard.writeText(link.href);
          copy.textContent = "Copied";
        };

        area.append(paragraph, input, copy);
      }

      await load();
    }

    box.querySelector("#geSaveDraft").onclick =
      () => save(false);

    box.querySelector("#geSendOffer").onclick =
      () => save(true);

    box.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  $("#geReviewRefresh").onclick = load;
  $("#geReviewSearch").oninput = renderList;
  $("#geReviewFilter").onchange = renderList;
  load();
}
