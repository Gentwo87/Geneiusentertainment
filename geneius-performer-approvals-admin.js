import {createClient} from "https://esm.sh/@supabase/supabase-js@2";
const db=createClient("https://gtzneetxgefimvadwqew.supabase.co","sb_publishable_tv5_T8hCxDhCmCehDZFWXA_BUgkTIO0");
const host=document.getElementById("gePerformerApprovals");
if(host){
 host.innerHTML=`<h3>Performer approval</h3><p class="muted">Availability is not acceptance. Ask each performer to approve before sending the customer an offer. Newly generated private links are shown once; copy them immediately.</p><label>Customer enquiry<select id="gePaEnquiry"></select></label><button type="button" id="gePaPrepare">Create missing performer requests</button><button type="button" id="gePaRefresh" class="secondary">Refresh responses</button><p id="gePaStatus" role="status"></p><div id="gePaLinks"></div><div id="gePaRows"></div>`;
 const $=id=>host.querySelector("#"+id),message=t=>{$("gePaStatus").textContent=t};
 const option=(value,label)=>{const o=document.createElement("option");o.value=value;o.textContent=label;return o};
 async function loadEnquiries(){
  const r=await db.from("agency_enquiries").select("id,customer_name,event_date").order("created_at",{ascending:false}).limit(150);
  if(r.error)throw r.error;
  $("gePaEnquiry").replaceChildren(...(r.data||[]).map(e=>option(e.id,(e.customer_name||"Customer")+" — "+(e.event_date||"Date TBC"))));
  await loadResponses();
 }
 async function loadResponses(){
  $("gePaRows").replaceChildren();
  const id=$("gePaEnquiry").value;if(!id)return;
  const r=await db.rpc("geneius_admin_list_approvals",{p_enquiry_id:id});
  if(r.error){message(r.error.message+" — Run supabase/performer-approvals.sql if not installed.");return}
  const rows=r.data||[];
  message(rows.length?rows.filter(x=>x.approval_status==="accepted").length+" of "+rows.length+" performer(s) accepted.":"No performer requests yet.");
  for(const a of rows){
   const box=document.createElement("div");box.style.cssText="padding:14px;margin:10px 0;border:1px solid #66583f;border-radius:10px";
   const title=document.createElement("p");title.textContent="Performer "+a.performer_id+" — "+a.approval_status+(a.response_source?" ("+a.response_source+")":"");
   const note=document.createElement("input");note.placeholder="Optional response note";note.setAttribute("aria-label","Performer response note");
   const buttons=document.createElement("div");buttons.style.cssText="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px";
   for(const [value,label] of [["accepted","Accept"],["declined","Decline"],["discuss","Discuss"]]){
    const b=document.createElement("button");b.type="button";b.textContent=label;b.className="secondary";
    b.onclick=async()=>{if(!confirm("Record "+label.toLowerCase()+" for this performer?"))return;b.disabled=true;const result=await db.rpc("geneius_admin_record_approval",{p_approval_id:a.approval_id,p_status:value,p_note:note.value});if(result.error)message(result.error.message);else await loadResponses();b.disabled=false};
    buttons.append(b);
   }
   box.append(title,note,buttons);$("gePaRows").append(box);
  }
 }
 $("gePaPrepare").onclick=async()=>{
  const id=$("gePaEnquiry").value;if(!id)return;
  $("gePaLinks").replaceChildren();
  const r=await db.rpc("geneius_admin_prepare_approvals",{p_enquiry_id:id});
  if(r.error){message(r.error.message);return}
  const created=r.data||[];
  for(const a of created){
   const p=document.createElement("p");
   const url=new URL("./performer-approval.html",location.href);url.searchParams.set("token",a.private_token);
   const label=document.createElement("span");label.textContent="Performer "+a.performer_id+": ";
   const copy=document.createElement("button");copy.type="button";copy.className="secondary";copy.textContent="Copy private approval link";
   copy.onclick=()=>navigator.clipboard.writeText(url.href).then(()=>message("Private link copied. Share only with the intended performer.")).catch(()=>message("Copy failed; please use the displayed link."));
   const link=document.createElement("input");link.readOnly=true;link.value=url.href;link.setAttribute("aria-label","Private performer approval URL");
   p.append(label,copy,link);$("gePaLinks").append(p);
  }
  if(!created.length)message("Requests already exist. Existing links cannot be recovered; use manual approval or implement secure reissue.");
  await loadResponses();
 };
 $("gePaRefresh").onclick=loadResponses;
 $("gePaEnquiry").onchange=()=>{$("gePaLinks").replaceChildren();loadResponses()};
 (async()=>{try{const a=await db.rpc("is_booking_admin");if(a.error||a.data!==true)throw Error("Admin access required");await loadEnquiries()}catch(e){message(e.message)}})();
}
