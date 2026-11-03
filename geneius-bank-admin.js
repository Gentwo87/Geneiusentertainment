
/*
  Geneius Entertainment
  Bank Details & Deposit Verification
  Admin add-on
*/

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const db = createClient(
  "https://gtzneetxgefimvadwqew.supabase.co",
  "sb_publishable_tv5_T8hCxDhCmCehDZFWXA_BUgkTIO0"
);

const panel = document.getElementById("notificationsPanel");

if (panel) {
  const root = document.createElement("section");
  root.id = "geBankPanel";

  root.innerHTML = `
    <style>
      #geBankPanel {
        margin-top: 22px;
        padding-top: 18px;
        border-top: 1px solid #755e3b;
      }

      #geBankPanel .geBankCard {
        border: 1px solid #655139;
        border-radius: 12px;
        padding: 14px;
        margin: 10px 0;
        background: #18181d;
      }

      #geBankPanel label {
        display: block;
        margin: 10px 0;
        color: #dbc28b;
      }

      #geBankPanel input,
      #geBankPanel textarea {
        display: block;
        width: 100%;
        box-sizing: border-box;
        padding: 10px;
        background: #111;
        color: white;
        border: 1px solid #76634b;
        border-radius: 7px;
      }

      #geBankPanel button {
        padding: 9px 14px;
        margin: 5px 5px 5px 0;
        border: 1px solid #ad884d;
        border-radius: 8px;
        background: #392c1b;
        color: #f8e0aa;
        cursor: pointer;
      }

      #geBankPanel button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      #geBankPanel .geSmall {
        color: #bcb3a6;
        font-size: 13px;
      }

      #geBankPanel #geBankStatus {
        color: #e8c47a;
      }
    </style>

    <h2>Bank Details &amp; Deposit Verification</h2>

    <p class="geSmall">
      Manage your bank details and verify customer
      deposit payments.
    </p>

    <button id="geBankRefresh" type="button">
      Refresh payments
    </button>

    <p id="geBankStatus" role="status"></p>

    <div class="geBankCard">
      <h3>Bank transfer settings</h3>

      <label for="geBankName">
        Account holder name
      </label>
      <input
        id="geBankName"
        autocomplete="off"
      >

      <label for="geBankSort">
        Sort code (6 digits)
      </label>
      <input
        id="geBankSort"
        inputmode="numeric"
        maxlength="8"
        autocomplete="off"
      >

      <label for="geBankNumber">
        Account number (8 digits)
      </label>
      <input
        id="geBankNumber"
        inputmode="numeric"
        maxlength="8"
        autocomplete="off"
      >

      <label for="geBankInstructions">
        Additional payment instructions
      </label>
      <textarea
        id="geBankInstructions"
        rows="2"
      ></textarea>

      <button id="geBankSave" type="button">
        Save bank details
      </button>
    </div>

    <h3>Payments awaiting verification</h3>

    <div id="geBankClaims"></div>

    <p class="geSmall">
      Confirming a deposit records payment verification.
      Calendar booking confirmation is a separate
      integration.
    </p>
  `;

  panel.append(root);

  const $ = id => root.querySelector("#" + id);

  const status = message => {
    $("geBankStatus").textContent = message;
  };

  const clean = value => String(value ?? "");

  async function load() {
    status("Loading bank settings and payment claims...");

    const {
      data: { session },
      error: sessionError
    } = await db.auth.getSession();

    if (sessionError || !session) {
      status(
        "Please sign in to admin, then click Refresh payments."
      );
      return;
    }

    const admin = await db.rpc("is_booking_admin");

    if (admin.error || admin.data !== true) {
      status("Admin permission required.");
      return;
    }

    const [settings, offers, enquiries] = await Promise.all([
      db
        .from("geneius_bank_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle(),

      db
        .from("geneius_booking_offers")
        .select(
          "id,enquiry_id,status,deposit_pence," +
          "payment_claimed_at,payment_reference," +
          "deposit_deadline"
        )
        .eq("status", "payment_pending")
        .order("payment_claimed_at", {
          ascending: false
        }),

      db
        .from("agency_enquiries")
        .select("id,customer_name,event_date")
    ]);

    for (const result of [settings, offers, enquiries]) {
      if (result.error) {
        status("Database error: " + result.error.message);
        return;
      }
    }

    $("geBankName").value =
      clean(settings.data?.account_name);

    $("geBankSort").value =
      clean(settings.data?.sort_code);

    $("geBankNumber").value =
      clean(settings.data?.account_number);

    $("geBankInstructions").value =
      clean(settings.data?.payment_instructions);

    const names = new Map(
      (enquiries.data || []).map(e => [e.id, e])
    );

    const list = $("geBankClaims");
    list.replaceChildren();

    for (const offer of offers.data || []) {
      const enquiry = names.get(offer.enquiry_id) || {};

      const card = document.createElement("div");
      card.className = "geBankCard";

      const title = document.createElement("strong");
      title.textContent =
        `${enquiry.customer_name || "Customer"} · ` +
        `${enquiry.event_date || "Date TBC"}`;

      const detail = document.createElement("p");

      const amount =
        (Number(offer.deposit_pence || 0) / 100)
          .toFixed(2);

      const claimed = offer.payment_claimed_at
        ? new Date(
            offer.payment_claimed_at
          ).toLocaleString("en-GB")
        : "—";

      const deadline = offer.deposit_deadline
        ? new Date(
            offer.deposit_deadline
          ).toLocaleString("en-GB")
        : "—";

      detail.textContent =
        `Deposit £${amount} · ` +
        `Reference ${offer.payment_reference || "—"} · ` +
        `Declared ${claimed} · ` +
        `Deadline ${deadline}`;

      const note = document.createElement("textarea");
      note.rows = 2;
      note.placeholder = "Optional verification note";

      const yes = document.createElement("button");
      yes.type = "button";
      yes.textContent = "Confirm deposit received";

      const no = document.createElement("button");
      no.type = "button";
      no.textContent =
        "Not received — return to awaiting payment";

      const message = document.createElement("p");
      message.setAttribute("role", "status");

      async function verify(paymentReceived) {
        if (
          paymentReceived &&
          !window.confirm(
            "Have you checked your bank account " +
            "and verified receipt of this deposit?"
          )
        ) {
          return;
        }

        yes.disabled = true;
        no.disabled = true;

        const result = await db.rpc(
          "geneius_admin_verify_bank_payment",
          {
            p_offer_id: offer.id,
            p_confirm: paymentReceived,
            p_note: note.value
          }
        );

        if (result.error) {
          message.textContent = result.error.message;
          yes.disabled = false;
          no.disabled = false;
          return;
        }

        await load();
      }

      yes.onclick = () => verify(true);
      no.onclick = () => verify(false);

      card.append(
        title,
        detail,
        note,
        yes,
        no,
        message
      );

      list.append(card);
    }

    if (!offers.data?.length) {
      list.textContent =
        "No customer payment claims awaiting verification.";
    }

    status("Ready.");
  }

  $("geBankSave").onclick = async () => {
    const account_name =
      $("geBankName").value.trim();

    const sort_code =
      $("geBankSort").value.replace(/\D/g, "");

    const account_number =
      $("geBankNumber").value.replace(/\D/g, "");

    if (
      !account_name ||
      !/^[0-9]{6}$/.test(sort_code) ||
      !/^[0-9]{8}$/.test(account_number)
    ) {
      status(
        "Enter an account name, a 6-digit sort code " +
        "and an 8-digit account number."
      );
      return;
    }

    const button = $("geBankSave");
    button.disabled = true;

    status("Saving bank details...");

    const result = await db
      .from("geneius_bank_settings")
      .upsert(
        {
          id: 1,
          account_name,
          sort_code,
          account_number,
          payment_instructions:
            $("geBankInstructions").value,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: "id"
        }
      );

    button.disabled = false;

    status(
      result.error
        ? "Save failed: " + result.error.message
        : "Bank details saved successfully."
    );
  };

  $("geBankRefresh").onclick = load;

  setTimeout(load, 1000);
}
