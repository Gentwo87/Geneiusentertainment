// Supabase Edge Function: send-offer-email
// Secrets: RESEND_API_KEY, OFFER_FROM_EMAIL (verified sender), SUPABASE_URL,
// SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (managed by Supabase).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = {"Access-Control-Allow-Origin":"https://www.geneiusentertainment.com","Access-Control-Allow-Headers":"authorization,apikey,content-type","Access-Control-Allow-Methods":"POST,OPTIONS"};
const reply=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json"}});
const hex=(bytes:ArrayBuffer)=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("");
const safe=(v:unknown)=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response(null,{headers:cors});
 if(req.method!=="POST")return reply(405,{error:"Method not allowed"});
 try{
  const auth=req.headers.get("Authorization")||"";
  if(!auth.startsWith("Bearer "))return reply(401,{error:"Sign in required"});
  const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!;
  const client=createClient(url,anon,{global:{headers:{Authorization:auth}}});
  const {data:{user},error:userError}=await client.auth.getUser();
  if(userError||!user)return reply(401,{error:"Session expired"});
  const admin=await client.rpc("is_booking_admin");
  if(admin.error||admin.data!==true)return reply(403,{error:"Admin access required"});
  const {offer_id,token}=await req.json();
  if(typeof offer_id!=="string"||!/^[-0-9a-f]{36}$/i.test(offer_id)||typeof token!=="string"||!/^[0-9a-f]{64}$/i.test(token))return reply(400,{error:"Invalid offer"});
  const service=createClient(url,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const {data:offer,error:offerError}=await service.from("geneius_booking_offers").select("id,enquiry_id,customer_token_hash,status,price_pence,deposit_pence,venue,start_time,end_time,contract_terms").eq("id",offer_id).single();
  if(offerError||!offer||offer.status!=="sent")return reply(404,{error:"Offer not available for sending"});
  const digest=hex(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token)));
  if(digest!==offer.customer_token_hash)return reply(403,{error:"Offer token mismatch"});
  const {data:enquiry,error:enquiryError}=await service.from("agency_enquiries").select("customer_name,customer_email,event_date,act_id").eq("id",offer.enquiry_id).single();
  if(enquiryError||!enquiry?.customer_email)return reply(400,{error:"Customer email missing"});
  const {data:act}=await service.from("acts").select("name").eq("id",enquiry.act_id).maybeSingle();
  const key=Deno.env.get("RESEND_API_KEY"),sender=Deno.env.get("OFFER_FROM_EMAIL");
  if(!key||!sender)return reply(503,{error:"Email service not configured: set RESEND_API_KEY and OFFER_FROM_EMAIL"});
  const link="https://www.geneiusentertainment.com/booking-offer.html?token="+token;
  const pounds=(p:number)=>"£"+(Number(p||0)/100).toFixed(2);
  const html=`<div style="font:16px/1.6 Arial,sans-serif;max-width:640px;margin:auto;color:#252525"><h2 style="color:#a77b24">Geneius Entertainment &amp; Management</h2><p>Hello ${safe(enquiry.customer_name||"there")},</p><p>Thank you for your enquiry. Your booking offer is ready to review.</p><p><b>Act:</b> ${safe(act?.name||"To be confirmed")}<br><b>Date:</b> ${safe(enquiry.event_date||"To be confirmed")}<br><b>Venue:</b> ${safe(offer.venue||"To be confirmed")}<br><b>Performance fee:</b> ${pounds(offer.price_pence)}<br><b>Deposit:</b> ${pounds(offer.deposit_pence)}<br><b>Balance:</b> ${pounds(offer.price_pence-offer.deposit_pence)}</p><p><a href="${link}" style="display:inline-block;background:#c89b3c;color:#111;padding:12px 20px;text-decoration:none;border-radius:6px">Review your offer &amp; contract</a></p><p>Please read the full terms and accept through your private link. This email is not confirmation of a booking.</p><p>Geneius Entertainment &amp; Management</p></div>`;
  const sent=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json","Idempotency-Key":"geneius-offer-"+offer.id},body:JSON.stringify({from:sender,to:[enquiry.customer_email],subject:"Your Geneius booking offer — "+(enquiry.event_date||"event"),html})});
  const body=await sent.json().catch(()=>({}));
  if(!sent.ok)return reply(502,{error:"Email provider rejected send: "+(body.message||sent.status)});
  return reply(200,{sent:true,email:enquiry.customer_email,message_id:body.id||null});
 }catch(e){return reply(500,{error:"Email sending failed: "+String(e instanceof Error?e.message:e)})}
});
