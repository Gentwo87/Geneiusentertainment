/*
 Geneius — Admin Contract Records (read-only)
 Uses the existing authenticated booking admin workspace and its RLS.
 No contract signature or payment status is invented by this screen.
*/
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const db = createClient(
  "https://gtzneetxgefimvadwqew.supabase.co",
  "sb_publishable_tv5_T8hCxDhCmCehDZFWXA_BUgkTIO0"
);

const host = document.getElementById("geneiusContractsApp");

if (host) {
  const style = document.createElement("style");
  style.textContent = `
    #geneiusContractsApp .ge-contract-actions {display:flex;flex-wrap:wrap;gap:10px;margin:14px 0}
    #geneiusContractsApp .ge-contract-item {border:1px solid #514536;border-radius:12px;padding:16px;margin:12px 0;background:#151519}
    #geneiusContractsApp .ge-contract-meta {color:#c2b7a6;font-size:13px;line-height:1.6}
    #geneiusContractsApp .ge-contract-terms {white-space:pre-wrap;overflow-wrap:anywhere;max-height:210px;overflow:auto;border:1px solid #48403a;border-radius:8px;padding:12px;background:#0d0d10}
    #geneiusContractsApp .ge-contract-item h3 {margin:0 0 8px}
  `;
  document.head.appendChild(style);
  host.replaceChildren();
  const intro = document.createElement("p");
  intro.className = "muted";
  intro.textContent = "Existing offer agreements and their recorded statuses. This is a read-only view; a status is not proof of a separate artist signature.";
  const controls = document.createElement("div");
  controls.className = "ge-contract-actions";
  const refresh = document.createElement("button");
  refresh.type = "button";
  refresh.textContent = "Refresh contract records";
  const filter = document.createElement("select");
  filter.setAttribute("aria-label", "Filter contract records");
  filter.style.maxWidth = "230px";
  for (const [value,label] of [["all","All offers"],["sent","Sent"],["accepted","Accepted"],["confirmed","Confirmed"],["draft","Draft"]]) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    filter.append(option);
  }
  controls.append(refresh, filter);
  const status = document.createElement("p");
  status.setAttribute("role","status");
  const list = document.createElement("div");
  host.append(intro,controls,status,list);
  let offers = [], enquiries = [];
  const money = pence => Number.isFinite(Number(pence))
    ? new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(Number(pence)/100)
    : "Not specified";
  const dateText = value => {
    if (!value) return "Not specified";
    const d = new Date(value + "T12:00:00");
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"});
  };
  function node(tag,cls,text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = String(text);
    return n;
  }
  function printRecord(offer,enquiry) {
    const w = window.open("","_blank");
    if (!w) { status.textContent = "Allow pop-ups to print this contract."; return; }
    const doc = w.document;
    doc.title = "Geneius booking agreement";
    const css = doc.createElement("style");
    css.textContent = "body{font:14px/1.55 Arial,sans-serif;color:#171717;margin:35px;max-width:850px}h1{font-size:24px}h2{font-size:18px;margin-top:24px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}dl{display:grid;grid-template-columns:180px 1fr;gap:8px}dt{font-weight:bold}p{margin:7px 0}@media print{body{margin:12mm}}";
    doc.head.append(css);
    doc.body.append(node("h1","","Geneius Entertainment & Management"),node("h2","","Booking offer and agreement record"));
    const dl = doc.createElement("dl");
    const details = [
      ["Customer",enquiry?.customer_name || "Not specified"],
      ["Event date",dateText(enquiry?.event_date)],
      ["Venue",offer.venue || "Not specified"],
      ["Performance times",[offer.start_time,offer.end_time].filter(Boolean).join(" – ") || "Not specified"],
      ["Fee",money(offer.price_pence)],
      ["Deposit",money(offer.deposit_pence)],
      ["Offer revision",offer.revision || 1],
      ["Offer status",offer.status || "Unknown"],
      ["Sent",offer.sent_at ? new Date(offer.sent_at).toLocaleString("en-GB") : "Not recorded"]
    ];
    for (const [key,value] of details) {
      dl.append(node("dt","",key),node("dd","",value));
    }
    doc.body.append(dl,node("h2","","Agreed / proposed terms"),node("pre","",offer.contract_terms || "No terms stored for this offer."));
    doc.body.append(node("p","","Record generated for administrator reference. This document alone does not establish a customer or performer signature."));
    w.focus();
    w.print();
  }
  function render() {
    list.replaceChildren();
    const chosen = filter.value;
    const visible = offers.filter(o => chosen === "all" || (o.status || "").toLowerCase() === chosen);
    status.textContent = visible.length + " offer agreement record(s).";
    if (!visible.length) {list.append(node("p","muted","No matching contract records."));return;}
    const byId = new Map(enquiries.map(e => [e.id,e]));
    for (const offer of visible) {
      const e = byId.get(offer.enquiry_id);
      const card = node("article","ge-contract-item");
      card.append(node("h3","",e?.customer_name || "Customer enquiry"),
        node("div","ge-contract-meta",
          dateText(e?.event_date) + " · " + (offer.venue || "Venue TBC") +
          " · " + money(offer.price_pence) + " · Status: " + (offer.status || "Unknown") +
          " · Revision " + (offer.revision || 1)));
      const terms = node("div","ge-contract-terms",offer.contract_terms || "No contract text recorded.");
      const actions = node("div","ge-contract-actions");
      const print = node("button","secondary","Print / Save as PDF");
      print.type = "button";
      print.onclick = () => printRecord(offer,e);
      actions.append(print);
      card.append(terms,actions);
      list.append(card);
    }
  }
  async function load() {
    status.textContent = "Loading contract records…";
    refresh.disabled = true;
    try {
      const auth = await db.auth.getSession();
      if (auth.error || !auth.data.session) throw new Error("Administrator sign-in required.");
      const admin = await db.rpc("is_booking_admin");
      if (admin.error || admin.data !== true) throw new Error("Administrator permission required.");
      const results = await Promise.all([
        db.from("geneius_booking_offers").select("*").order("created_at",{ascending:false}).limit(250),
        db.from("agency_enquiries").select("id,customer_name,event_date").limit(250)
      ]);
      const failure = results.find(r => r.error);
      if (failure) throw failure.error;
      offers = results[0].data || [];
      enquiries = results[1].data || [];
      render();
    } catch (error) {
      status.textContent = "Unable to load contract records: " + error.message;
      list.replaceChildren();
    } finally {refresh.disabled = false;}
  }
  refresh.onclick = load;
  filter.onchange = render;
  load();
}
