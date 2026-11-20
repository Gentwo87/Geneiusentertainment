# Automatic customer offer emails

This change uses a Supabase Edge Function and Resend. **GitHub merge alone does not deploy the Edge Function.**

## One-time setup
1. In Resend, verify your sending domain `geneiusentertainment.com` (add the DNS records Resend supplies in Namecheap). A verified sending address can be `contact@geneiusentertainment.com` if domain verification permits it.
2. In Supabase project `gtzneetxgefimvadwqew`, go to **Edge Functions → Secrets** and set:
   - `RESEND_API_KEY`: Resend API key (keep secret; never paste into GitHub or chat)
   - `OFFER_FROM_EMAIL`: e.g. `Geneius Entertainment <contact@geneiusentertainment.com>` once the domain is verified.
3. Deploy `supabase/functions/send-offer-email/index.ts` as Edge Function named **send-offer-email**. Keep JWT verification enabled. Ensure the function's CORS origin matches your live website.
4. Merge the website changes **after** the function is deployed. Sign in to admin, create a **disposable** enquiry using your own email, and press Create customer review link. Check the email arrives and the admin displays success.
5. Do not send customer emails while testing with a real customer's address.

## Behaviour and limitations
- The function verifies the logged-in admin through `is_booking_admin`, checks the offer token hash and sends the email using server-side credentials.
- The email contains the event, act, fee, deposit, balance, and private contract link. Full contract terms remain on the private page.
- If email fails, the offer is still saved and the UI shows **email NOT sent**; Copy link remains available.
- **Existing status is still `sent` when the link is generated, even if delivery fails**. This is a known legacy issue and needs a later delivery-status column/queue.
- Email links are sensitive. Do not forward to unrelated people.
- This is automatic **offer** email only; performer notifications and post-payment confirmations remain separate.
- A previous Resend integration may already exist in Supabase; check Edge Functions and Secrets before creating a duplicate provider account.
