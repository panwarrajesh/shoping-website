# LocalMart (Steps 1 to 10)

Local marketplace: customers buy from sellers in their own area, sellers sell from their phone.
Stack: React + Redux Toolkit + Tailwind (frontend), Node + Express + Prisma + MySQL (backend).

## What works today
- Login: mobile OTP, password, forgot password, refresh tokens, roles
- Customer: profile, addresses, wishlist, notifications, change password
- Seller: registration (PAN/bank/GST, encrypted), dashboard, settings, store logo
- Products: add/edit/delete with real photos + video (Cloudinary), variants, stock, inventory page
- Customer shopping: home sections, categories, search + filters, product page
- Location: choose city/area/pincode or use GPS; products shown only from sellers who deliver there
- Online payments (Razorpay): UPI / card / net banking. The amount is set by the server, payment is confirmed by signature check + webhook (never by the browser alone), unpaid online orders are cancelled after 30 minutes
- Checkout + Orders: Cash on Delivery or online payment, one order per seller, commission frozen on every order item, tracking timeline for the customer, accept / pack / ship / deliver / cancel for the seller, stock reserved at order time
- Cart: works without login (kept on the device) and merges into the account cart at login; grouped by seller with delivery charges, stock and delivery checks

## Not built yet (next steps)
 Commission (11), Admin panel (12), Reviews (13), Returns/Refunds (14),
Real SMS provider + notifications (15), Security hardening (16), Performance (17), Deployment (19).
Refunds: when a PAID online order is cancelled, a Refund record (status INITIATED) is created, but the money is NOT sent back automatically until Step 14.
Until then refund such orders by hand from the Razorpay dashboard.
Commission is read from the `Commission` table (the seed creates 30% global plus category rules). The admin screen to edit it arrives in Step 12.

## Requirements
Node.js 18 or newer, MySQL 8.

## First-time setup

### 1. Database
Create an empty database:  `CREATE DATABASE localmart;`

### 2. Backend
```
cd backend
cp .env.example .env
```
Open `.env` and fill:
- `DATABASE_URL`  (your MySQL user/password)
- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`  (two long random strings)
- `ENCRYPTION_KEY`  (64 hex chars). Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
  Keep a safe copy. If it is lost or changed, sellers' saved bank/PAN data cannot be read again.
- `CLOUDINARY_*`  (needed only for photo/video upload; everything else works without it)
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`  (needed only for online payment; without them the checkout shows Cash on Delivery only)
- `RAZORPAY_WEBHOOK_SECRET`  (see "Online payments" below)

Then:
```
npm install
npx prisma validate
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```
Check http://localhost:5000/api/health

Already ran the migration in an earlier step? The payment step changed the schema, so run once more:
`npx prisma migrate dev --name payments`

### Online payments (Razorpay)
1. Create a Razorpay account and stay in **Test mode**. Copy the Test API keys (Dashboard > Settings > API Keys) into `.env`.
2. Restart the backend. The checkout page now offers UPI / Card / Net banking. Razorpay's documentation lists test cards and test UPI details.
3. Webhook (recommended, it is the safety net if a customer closes the page right after paying):
   Dashboard > Webhooks > add `https://<your-api-domain>/api/payments/webhook`, tick `payment.captured`, `order.paid`, `payment.failed`,
   set a secret and put the same secret in `RAZORPAY_WEBHOOK_SECRET`. On your own computer Razorpay cannot reach `localhost`
   (a tunnel such as ngrok is needed); without the webhook the normal flow still works because the browser also verifies the payment.
4. Going live needs Razorpay's KYC and live keys. Do that later; nothing in the code changes except the keys.

### 3. Frontend (second terminal)
```
cd frontend
npm install
npm run dev
```
Open http://localhost:5173 (press F12, then the phone icon, to see the mobile view).

## Testing the whole flow
1. Register a customer account. In development the OTP is printed in the backend terminal and shown on screen.
2. Open `/seller/register` and become a seller (a second account is easiest).
3. Approve the seller (no admin panel yet):
   `cd backend && npm run seller:admin -- approve 9876543210`   (use your mobile number)
4. Add a product at `/seller/products/add` (needs Cloudinary keys for photos).
5. Make it visible to customers:
   `npm run product:admin -- list`  then  `npm run product:admin -- approve all`
6. In the customer app choose area "Palwal" (top left). The product appears under "Products near you".
7. Open the product, pick a size/colour and tap Add to Cart (try it once logged out, then log in: the cart is kept). Open the cart from the top right.
8. Cart > Checkout. Add a delivery address. Delivery is decided by the ADDRESS: its city/pincode must match a seller's delivery area,
   or use "Current location" in the address form so the distance can be measured. Then tap Order place karo (Cash on Delivery).
9. Online payment (needs the Razorpay test keys): choose UPI / Card at checkout, pay in the Razorpay window, and the order shows as paid.
   Close the window without paying: the order page shows "Abhi pay karo", and after 30 minutes it is cancelled automatically.
10. As the seller open `/seller/orders`, accept the order and move it step by step to Delivered. The customer sees the timeline at `/orders/<id>`.
   After delivery the seller's earnings (after commission) appear as a pending settlement (payable after `SETTLEMENT_HOLD_DAYS`, default 7).

Other admin helpers: `seller:admin -- verify <mobile>` (Verified Seller badge), `product:admin -- verify <id>` (Verified Product badge),
`reject`, `suspend`. Default admin login created by the seed: see `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env`. Change that password.

## Before going live
- SMS: OTPs are only printed to the console. `NODE_ENV=production` refuses to start until a real SMS provider
  is added (needs DLT registration in India). Planned for Step 15.
- Put the website and API on the same site, for example `app.yourdomain.com` and `api.yourdomain.com`.
  Different domains make iPhone Safari block the login cookie.
- Never commit `.env`.
