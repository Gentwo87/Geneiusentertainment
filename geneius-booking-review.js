
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
    <div id="gePaymentAlerts" role="status" aria-live="polite"></div>
    <div class="ge-inbox-toolbar"><select id="geTestView" aria-label="Filter real or test enquiries"><option value="all">Real &amp; test</option><option value="real">Real only</option><option value="test">Test only</option></select><select id="geArchiveView" aria-label="Show active or archived enquiries"><option value="active">Active enquiries</option><option value="archived">Archived enquiries</option><option value="all">All enquiries</option></select><input id="geReviewSearch" placeholder="Search customer, act or message" aria-label="Search requests"><select id="geReviewFilter" aria-label="Filter requests"><option value="all">All requests</option><option value="new">New enquiries</option><option value="payment_pending">Payments to verify</option><option value="accepted">Accepted quotes</option><option value="sent">Quotes sent</option><option value="paid">Deposits verified</option></select></div><div id="geReviewList"></div>
    <div id="geReviewEditor"></div>
  `;

  panel.append(root);

  const $ = s => root.querySelector(s);

  let enquiries = [];
  let offers = [];
  let acts = [];
  let shows = [];
  let packages = [];
  let archivedIds = new Set();
  let testIds = new Set();
  let testAvailable = false;
  let archiveAvailable = false;

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

    const archiveResult = await db.rpc("geneius_admin_list_archives");
    archiveAvailable = !archiveResult.error;
    archivedIds = new Set((archiveResult.data || []).map(a => a.enquiry_id));
    $("#geArchiveView").disabled = !archiveAvailable;
    if (!archiveAvailable) {
      $("#geArchiveView").title = "Archive requires supabase/enquiry-archive.sql";
      status("Archive not installed. Enquiries loaded normally.");
    }
    const tests = await db.rpc("geneius_admin_list_test_labels");
    testAvailable = !tests.error;
    testIds = new Set((tests.data || []).map(t => t.enquiry_id));
    $("#geTestView").disabled = !testAvailable;
    if (!testAvailable) $("#geTestView").title = "Run supabase/test-labels-draft-cleanup.sql first";
    const paymentOffers = offers.filter(o => o.status === "payment_pending");
    const alerts = $("#gePaymentAlerts");
    alerts.replaceChildren();
    if (paymentOffers.length) {
      const notice = document.createElement("div");
      notice.className = "ge-review-card ge-payment";
      const heading = document.createElement("h3");
      heading.textContent = "Payment declarations awaiting your confirmation: " + paymentOffers.length;
      const info = document.createElement("p");
      info.textContent = "Customers have reported bank transfers. Check your bank before confirming; these are not confirmed bookings.";
      const jump = document.createElement("button");
      jump.type = "button";
      jump.textContent = "Show payments to verify";
      jump.onclick = () => {
        $("#geArchiveView").value = "all";
        $("#geTestView").value = "all";
        $("#geReviewSearch").value = "";
        $("#geReviewFilter").value = "payment_pending";
        renderList();
        $("#geReviewList").scrollIntoView({ behavior: "smooth" });
      };
      notice.append(heading, info, jump);
      alerts.append(notice);
    }
    renderList();
    if (archiveAvailable) status(enquiries.length + " enquiries loaded (" + archivedIds.size + " archived).");
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
    const orderedEnquiries = [...enquiries].sort((a,b) => {
      const priority = e => latestOffer(e)?.status === "payment_pending" ? 1 : 0;
      return priority(b) - priority(a);
    });
    orderedEnquiries.forEach(e => {
      const offer = latestOffer(e);
      const isArchived = archivedIds.has(e.id);
      const isTest = testIds.has(e.id);
      const testView = $("#geTestView").value;
      if (testAvailable && testView === "real" && isTest) return;
      if (testAvailable && testView === "test" && !isTest) return;
      const archiveView = $("#geArchiveView").value;
      if (archiveAvailable && archiveView === "active" && isArchived) return;
      if (archiveAvailable && archiveView === "archived" && !isArchived) return;
      const searchable = [e.customer_name,e.customer_email,e.notes,e.request_type,actName(e.act_id),e.event_date].join(" ").toLowerCase();
      if(term && !searchable.includes(term)) return;
      if(filter !== "all" && !(filter === "new" ? e.status === "new" : offer?.status === filter)) return;
      shown++;
      const div = document.createElement("article");
      div.className = "ge-review-card" + (e.status === "new" ? " ge-new" : offer?.status === "payment_pending" ? " ge-payment" : offer?.status === "paid" ? " ge-confirmed" : "");
      const title = document.createElement("h3");
      title.textContent = (offer?.status === "payment_pending" ? "💳 PAYMENT REPORTED · " : "") + (isTest ? "🧪 TEST · " : "") + (e.customer_name || "Customer");
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
      if (testAvailable) {
        const testButton = document.createElement("button");
        testButton.type = "button";
        testButton.textContent = isTest ? "Remove test label" : "Mark as test";
        testButton.title = "Labels are for admin organisation only; test records still use the live booking system";
        testButton.onclick = async () => {
          if (!window.confirm(isTest ? "Remove test label?" : "Mark this enquiry as test? This does NOT isolate it from live calendar or customer actions.")) return;
          const result = await db.rpc("geneius_admin_mark_test",{p_enquiry_id:e.id,p_is_test:!isTest});
          if(result.error){status(result.error.message);return}
          if(isTest)testIds.delete(e.id);else testIds.add(e.id);
          renderList();status("Test label updated. This is not a sandbox.");
        };
        div.append(testButton);
      }
      if (offer?.status === "draft" && !offers.some(o=>o.enquiry_id===e.id && o.status!=="draft")) {
        const draftButton = document.createElement("button");
        draftButton.type = "button";
        draftButton.textContent = "Delete unsent draft";
        draftButton.title = "Remove an unsent draft quote, not the enquiry";
        draftButton.onclick = async () => {
          if(!window.confirm("Delete this unsent draft quote permanently?"))return;
          if(window.prompt("Type DELETE DRAFT to confirm:")!=="DELETE DRAFT")return;
          const result=await db.rpc("geneius_admin_delete_unsent_draft",{p_offer_id:offer.id});
          if(result.error||result.data!==true){status("Draft deletion refused: "+(result.error?.message||"Not deleted"));return}
          $("#geReviewEditor").replaceChildren();await load();status("Unsent draft deleted. Enquiry retained.");
        };
        div.append(draftButton);
      }
      if (archiveAvailable) {
        const archiveButton = document.createElement("button");
        archiveButton.type = "button";
        archiveButton.textContent = isArchived ? "Restore to active" : "Archive enquiry";
        archiveButton.title = isArchived ? "Show this enquiry in the active inbox" : "Hide this enquiry from the active inbox without deleting its booking history";
        archiveButton.onclick = async () => {
          if (!window.confirm(isArchived ? "Restore this enquiry to the active inbox?" : "Archive this enquiry? It will remain available under Archived enquiries.")) return;
          archiveButton.disabled = true;
          const result = await db.rpc("geneius_admin_set_enquiry_archive", {
            p_enquiry_id: e.id, p_archived: !isArchived, p_reason: null
          });
          if (result.error || result.data !== true) {
            status("Archive action failed: " + (result.error?.message || "Unknown error"));
            archiveButton.disabled = false;
            return;
          }
          if (isArchived) archivedIds.delete(e.id);
          else archivedIds.add(e.id);
          renderList();
          status(isArchived ? "Enquiry restored." : "Enquiry archived. No booking or contract data was deleted.");
        };
        div.append(archiveButton);
      }
      // Only untouched enquiries with no offers are eligible. The database
      // independently verifies status and all linked records before deleting.
      if (e.status === "new" && !offers.some(o => o.enquiry_id === e.id)) {
        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "Delete unused enquiry";
        remove.title = "Permanent deletion — only for unused or test enquiries";
        remove.style.cssText = "border-color:#a76b62;color:#f2b9af;background:#33201f";
        remove.onclick = async () => {
          const name = e.customer_name || "this enquiry";
          if (!window.confirm("Permanently delete the unused enquiry for " + name + "? This cannot be undone.")) return;
          const typed = window.prompt("Type DELETE to permanently remove this unused enquiry:");
          if (typed !== "DELETE") return;
          remove.disabled = true;
          const result = await db.rpc("geneius_admin_delete_unused_enquiry", {p_enquiry_id:e.id});
          if (result.error || result.data !== true) {
            status("Delete refused: " + (result.error?.message || "Record was not deleted") +
              ". Ensure the safe-enquiry-delete SQL has been installed.");
            remove.disabled = false;
            return;
          }
          $("#geReviewEditor").replaceChildren();
          await load();
          status("Unused enquiry permanently deleted.");
        };
        div.append(remove);
      }
      list.append(div);
    });
    if(!shown) list.textContent = "No requests match this filter.";
  }

  $("#geArchiveView").addEventListener("change", renderList);
  $("#geTestView").addEventListener("change", renderList);
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
          <button id="geSendOffer">Create Customer Review Link</button>
        </div>

        <p id="geEditorStatus" role="status"></p>
        <div id="geLinkArea"></div>
      </div>
    `;

    const pendingOffer = offers.filter(o => o.enquiry_id === e.id && o.status === "payment_pending")
      .sort((a,b) => (b.revision || 0) - (a.revision || 0))[0];
    if (pendingOffer) {
      const actions = box.querySelector(".ge-review-actions");
      const verify = document.createElement("button");
      verify.type = "button";
      verify.textContent = "Verify Payment & Confirm Booking";
      verify.title = "Only use after checking that the bank transfer has arrived.";
      verify.onclick = async () => {
        const confirmation = window.prompt(
          "Check your bank account first. Type CONFIRM PAID to verify payment, add this booking to the calendar and block the performers:"
        );
        if (confirmation !== "CONFIRM PAID") return;
        verify.disabled = true;
        const message = box.querySelector("#geEditorStatus");
        message.textContent = "Verifying booking and calendar availability…";
        try {
          const response = await db.rpc("geneius_admin_verify_payment_and_confirm", {
            p_offer_id: pendingOffer.id
          });
          if (response.error) throw response.error;
          message.textContent = "Payment verified. Booking confirmed and added to the calendar.";
          await load();
        } catch (error) {
          message.textContent = "Confirmation NOT completed: " + error.message;
          verify.disabled = false;
        }
      };
      actions.append(verify);
    }

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
        ? "Offer link created. Click Email Offer to Customer to send it directly."
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

        const email = document.createElement("button");
        email.type = "button";
        email.textContent = "Email Offer to Customer";
        email.title = "Send this private booking link directly using Geneius email.";
        email.onclick = async () => {
          if (!e.customer_email) {
            msg.textContent = "This enquiry has no customer email address.";
            return;
          }
          email.disabled = true;
          email.textContent = "Sending…";
          msg.textContent = "Sending offer to " + e.customer_email + "…";
          try {
            const { data: { session } } = await db.auth.getSession();
            if (!session) {
              msg.textContent = "Email NOT sent: admin session expired. Sign in again.";
              return;
            }
            const response = await fetch(
              "https://gtzneetxgefimvadwqew.supabase.co/functions/v1/send-offer-email",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "apikey": "sb_publishable_tv5_T8hCxDhCmCehDZFWXA_BUgkTIO0",
                  "Authorization": "Bearer " + session.access_token
                },
                body: JSON.stringify({ offer_id: result.data.id, token })
              }
            );
            const outcome = await response.json().catch(() => ({}));
            msg.textContent = response.ok && outcome.sent
              ? "Offer emailed to " + outcome.email + ". The customer can review their contract using the private link."
              : "Email NOT sent: " + (outcome.error || "Email service unavailable") + ". You can copy the private link.";
          } catch (error) {
            msg.textContent = "Email NOT sent: " + error.message + ". You can copy the private link.";
          } finally {
            email.disabled = false;
            email.textContent = "Email Offer to Customer";
          }
        };
        area.append(paragraph, input, copy, email);
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
