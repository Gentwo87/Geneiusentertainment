
/*
 Geneius Entertainment
 Booking Management Admin Add-on

 This is an admin management foundation.
 It does not automatically change calendar bookings,
 send emails, or transfer money.
*/

import { createClient } from
  "https://esm.sh/@supabase/supabase-js@2";

const db = createClient(
  "https://gtzneetxgefimvadwqew.supabase.co",
  "sb_publishable_tv5_T8hCxDhCmCehDZFWXA_BUgkTIO0"
);

const host = document.getElementById("notificationsPanel");

if (host) {
  const root = document.createElement("section");
  root.id = "geManagement";
  host.append(root);

  root.innerHTML = `
    <style>
      #geManagement {
        margin-top:24px;
        border-top:1px solid #80683d;
        padding-top:20px;
      }
      #geManagement .ge-card {
        padding:15px;
        margin:12px 0;
        border:1px solid #665339;
        border-radius:12px;
        background:#19191e;
      }
      #geManagement label {
        display:block;
        margin:10px 0 5px;
        color:#e2c88f;
      }
      #geManagement input,
      #geManagement select,
      #geManagement textarea {
        display:block;
        width:100%;
        padding:10px;
        color:white;
        background:#111116;
        border:1px solid #79684f;
        border-radius:7px;
      }
      #geManagement button {
        margin:6px 5px 6px 0;
        padding:10px;
        border-radius:7px;
        border:1px solid #b39253;
        color:#ffe2a7;
        background:#3a2d1b;
      }
      #geManagement .ge-grid {
        display:grid;
        grid-template-columns:
          repeat(auto-fit,minmax(190px,1fr));
        gap:12px;
      }
      #geManagement .ge-note {
        color:#c2b8a7;
        font-size:13px;
      }
      #geManagement .ge-status {
        min-height:20px;
        color:#f1d491;
      }
    </style>

    <h2>Booking Management</h2>

    <p class="ge-note">
      Configure payment terms, record cancellation
      requests and refunds, draft replacement proposals,
      and manage contract templates.
    </p>

    <button id="gmRefresh">Refresh bookings</button>
    <p id="gmStatus" class="ge-status"
       role="status"></p>

    <div class="ge-card">
      <label>Booking offer</label>
      <select id="gmOffer"></select>
      <div id="gmOfferInfo" class="ge-note"></div>
    </div>

    <div class="ge-card">
      <h3>Deposit & payment terms</h3>

      <div class="ge-grid">
        <div>
          <label>Deposit type</label>
          <select id="gmMode">
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed amount (£)</option>
            <option value="none">No deposit</option>
            <option value="full">Full payment</option>
          </select>
        </div>

        <div>
          <label>Value (% or £)</label>
          <input id="gmValue" type="number"
                 min="0" step="0.01" value="25">
        </div>

        <div>
          <label>Payment deadline (hours)</label>
          <input id="gmHours" type="number"
                 min="1" max="720" value="24">
        </div>
      </div>

      <p class="ge-note">
        Existing accepted contracts must not be
        silently changed. Issue a revised offer
        for customer approval.
      </p>

      <button id="gmSaveTerms">
        Save deposit settings
      </button>
    </div>

    <div class="ge-card">
      <h3>Cancellation record</h3>

      <label>Requested by</label>
      <select id="gmCancelBy">
        <option value="client">Client</option>
        <option value="agency">Agency</option>
        <option value="act">Act / performer</option>
      </select>

      <label>Reason</label>
      <textarea id="gmCancelReason"
                rows="2"></textarea>

      <div class="ge-grid">
        <div>
          <label>Proposed cancellation fee (£)</label>
          <input id="gmFee" type="number"
                 min="0" step="0.01" value="0">
        </div>

        <div>
          <label>Amount waived (£)</label>
          <input id="gmWaive" type="number"
                 min="0" step="0.01" value="0">
        </div>
      </div>

      <label>Explanation of charge</label>
      <textarea id="gmFeeReason"
                rows="2"></textarea>

      <button id="gmCancel">
        Record cancellation request
      </button>

      <p class="ge-note">
        This records a request only. It does not
        cancel a live calendar booking.
      </p>
    </div>

    <div class="ge-card">
      <h3>Refund record</h3>

      <div class="ge-grid">
        <div>
          <label>Amount (£)</label>
          <input id="gmRefund" type="number"
                 min="0.01" step="0.01">
        </div>

        <div>
          <label>Bank transfer reference</label>
          <input id="gmRefundRef">
        </div>
      </div>

      <label>Refund reason</label>
      <textarea id="gmRefundReason"
                rows="2"></textarea>

      <button id="gmRefundPlan">
        Record planned refund
      </button>

      <p class="ge-note">
        This does not transfer money.
        Only mark a refund completed after
        verifying the bank transfer.
      </p>
    </div>

    <div class="ge-card">
      <h3>Replacement act proposal</h3>

      <label>Alternative act</label>
      <select id="gmAct"></select>

      <label>Proposed total fee (£) — optional</label>
      <input id="gmNewPrice" type="number"
             min="0" step="0.01">

      <label>Reason and changes</label>
      <textarea id="gmReplacementReason"
                rows="2"></textarea>

      <button id="gmReplacement">
        Save replacement draft
      </button>

      <p class="ge-note">
        Customer approval and availability checking
        are required before changing a booking.
      </p>
    </div>

    <div class="ge-card">
      <h3>Contract templates</h3>

      <label>Template title</label>
      <input id="gmTitle"
        value="Geneius Entertainment Client Booking Terms">

      <label>Version</label>
      <input id="gmVersion" type="number"
             min="1" value="1">

      <label>Contract text</label>
      <textarea id="gmContract" rows="9"
        placeholder="Paste reviewed client terms here">
      </textarea>

      <button id="gmContractSave">
        Save contract template
      </button>

      <p class="ge-note">
        Saving a template does not rewrite
        previously accepted agreements.
      </p>
    </div>
  `;

  const el = id => root.querySelector("#" + id);
  const val = id => el(id).value.trim();

  const status = message => {
    el("gmStatus").textContent = message;
  };

  let offers = [];
  let enquiries = [];
  let acts = [];

  function pence(value, allowZero = true) {
    const n = Number(value);

    if (
      value === "" ||
      !Number.isFinite(n) ||
      n < 0 ||
      (!allowZero && n === 0) ||
      Math.round(n * 100) > Number.MAX_SAFE_INTEGER
    ) {
      throw Error("Enter a valid amount");
    }

    return Math.round(n * 100);
  }

  const selected = () =>
    offers.find(o => o.id === val("gmOffer"));

  async function load() {
    status("Loading...");

    const auth = await db.auth.getSession();

    if (!auth.data.session) {
      status(
        "Sign into the admin dashboard, " +
        "then click Refresh bookings."
      );
      return;
    }

    const admin = await db.rpc("is_booking_admin");

    if (admin.error || admin.data !== true) {
      status("Admin access required.");
      return;
    }

    const results = await Promise.all([
      db.from("geneius_booking_offers")
        .select(
          "id,enquiry_id,status,price_pence," +
          "deposit_pence,created_at"
        )
        .order("created_at", { ascending:false })
        .limit(200),

      db.from("agency_enquiries")
        .select("id,customer_name,event_date"),

      db.from("acts")
        .select("id,name"),

      db.from("geneius_offer_payment_terms")
        .select("*")
    ]);

    const error = results.find(r => r.error)?.error;

    if (error) {
      status(error.message);
      return;
    }

    [offers, enquiries, acts] =
      results.slice(0,3).map(r => r.data || []);

    const terms = results[3].data || [];
    const previous = val("gmOffer");

    el("gmOffer").replaceChildren();

    for (const offer of offers) {
      const enquiry =
        enquiries.find(e => e.id === offer.enquiry_id) || {};

      const option = document.createElement("option");

      option.value = offer.id;
      option.textContent =
        `${enquiry.customer_name || "Customer"} — ` +
        `${enquiry.event_date || "Date TBC"} — ` +
        `${offer.status} — ` +
        `£${(offer.price_pence / 100).toFixed(2)}`;

      el("gmOffer").append(option);
    }

    if (offers.some(o => o.id === previous)) {
      el("gmOffer").value = previous;
    }

    el("gmAct").replaceChildren();

    for (const act of acts) {
      const option = document.createElement("option");

      option.value = act.id;
      option.textContent = act.name;

      el("gmAct").append(option);
    }

    function update() {
      const offer = selected();

      el("gmOfferInfo").textContent = offer
        ? `Offer status: ${offer.status} | ` +
          `Quoted £${(offer.price_pence / 100).toFixed(2)} | ` +
          `Original deposit £${(offer.deposit_pence / 100).toFixed(2)}`
        : "No offers found";

      const term = terms.find(
        t => t.offer_id === offer?.id
      );

      el("gmMode").value =
        term?.deposit_mode || "percentage";

      el("gmValue").value =
        term?.deposit_value ?? 25;

      el("gmHours").value =
        term?.deadline_hours ?? 24;
    }

    el("gmOffer").onchange = update;
    update();

    status(`${offers.length} offers loaded.`);
  }

  async function write(table, data, success) {
    if (!selected()) {
      status("Select an offer first.");
      return;
    }

    status("Saving...");

    const result = await db.from(table).insert(data);

    status(
      result.error
        ? `Save failed: ${result.error.message}`
        : success
    );
  }

  el("gmSaveTerms").onclick = async () => {
    try {
      const offer = selected();

      if (!offer) {
        throw Error("Select an offer.");
      }

      if (!["draft","sent"].includes(offer.status)) {
        throw Error(
          "Offer already accepted. " +
          "Create a revised agreement instead."
        );
      }

      const mode = val("gmMode");
      const n = Number(val("gmValue"));
      const hours = Number(val("gmHours"));

      if (
        !Number.isFinite(n) ||
        n < 0 ||
        (mode === "percentage" && n > 100) ||
        !Number.isInteger(hours) ||
        hours < 1 ||
        hours > 720
      ) {
        throw Error("Invalid deposit value or deadline.");
      }

      const result = await db
        .from("geneius_offer_payment_terms")
        .upsert({
          offer_id: offer.id,
          deposit_mode: mode,
          deposit_value: n,
          deadline_hours: hours,
          updated_at: new Date().toISOString()
        }, {
          onConflict:"offer_id"
        });

      status(
        result.error
          ? result.error.message
          : "Payment terms saved. Customer pages " +
            "do not yet use these settings."
      );
    } catch (error) {
      status(error.message);
    }
  };

  el("gmCancel").onclick = async () => {
    try {
      const fee = pence(val("gmFee"));
      const waived = pence(val("gmWaive"));

      if (waived > fee) {
        throw Error("Waiver cannot exceed the fee.");
      }

      if (!val("gmCancelReason")) {
        throw Error("Enter the cancellation reason.");
      }

      await write(
        "geneius_booking_cancellations",
        {
          offer_id: selected()?.id,
          requested_by: val("gmCancelBy"),
          reason: val("gmCancelReason"),
          fee_pence: fee,
          waived_pence: waived,
          fee_reason: val("gmFeeReason"),
          status:"requested"
        },
        "Cancellation request recorded. " +
        "Calendar remains unchanged."
      );
    } catch (error) {
      status(error.message);
    }
  };

  el("gmRefundPlan").onclick = async () => {
    try {
      const amount = pence(val("gmRefund"), false);

      if (!val("gmRefundReason")) {
        throw Error("Enter a refund reason.");
      }

      await write(
        "geneius_refund_records",
        {
          offer_id: selected()?.id,
          amount_pence: amount,
          reason: val("gmRefundReason"),
          transfer_reference: val("gmRefundRef"),
          status:"planned"
        },
        "Planned refund recorded. " +
        "No bank transfer has been made."
      );
    } catch (error) {
      status(error.message);
    }
  };

  el("gmReplacement").onclick = async () => {
    try {
      if (!val("gmAct")) {
        throw Error("Choose an act.");
      }

      if (!val("gmReplacementReason")) {
        throw Error("Explain the replacement.");
      }

      const price = val("gmNewPrice")
        ? pence(val("gmNewPrice"))
        : null;

      await write(
        "geneius_replacement_proposals",
        {
          offer_id: selected()?.id,
          replacement_act_id: val("gmAct"),
          proposed_price_pence: price,
          explanation: val("gmReplacementReason"),
          status:"draft"
        },
        "Replacement draft saved. " +
        "No customer or calendar changes."
      );
    } catch (error) {
      status(error.message);
    }
  };

  el("gmContractSave").onclick = async () => {
    const title = val("gmTitle");
    const version = Number(val("gmVersion"));
    const terms = val("gmContract");

    if (
      !title ||
      !Number.isInteger(version) ||
      version < 1 ||
      !terms
    ) {
      status(
        "Enter a title, version and complete contract terms."
      );
      return;
    }

    const result = await db
      .from("geneius_contract_templates")
      .insert({
        title,
        version,
        terms_text:terms,
        is_active:false
      });

    status(
      result.error
        ? result.error.message
        : "Contract template saved as inactive. " +
          "Accepted contracts remain unchanged."
    );
  };

  el("gmRefresh").onclick = load;

  // Wait briefly for the existing admin login to initialise.
  setTimeout(load, 1000);
}
