# LocalMart (Steps 1 to 8)

Local marketplace: customers buy from sellers in their own area, sellers sell from their phone.
Stack: React + Redux Toolkit + Tailwind (frontend), Node + Express + Prisma + MySQL (backend).

## What works today
- Login: mobile OTP, password, forgot password, refresh tokens, roles
- Customer: profile, addresses, wishlist, notifications, change password
- Seller: registration (PAN/bank/GST, encrypted), dashboard, settings, store logo
- Products: add/edit/delete with real photos + video (Cloudinary), variants, stock, inventory page
- Customer shopping: home sections, categories, search + filters, product page
- Location: choose city/area/pincode or use GPS; products shown only from sellers who deliver there
- Cart: works without login (kept on the device) and merges into the account cart at login; grouped by seller with delivery charges, stock and delivery checks

## Not built yet (next steps)
Checkout + Orders (9), Payments (10), Commission (11), Admin panel (12), Reviews (13), Returns/Refunds (14),
Real SMS provider + notifications (15), Security hardening (16), Performance (17), Deployment (19).
Buy Now currently adds the item and opens the cart; the Checkout button shows a "coming soon" page until Step 9.

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

Then:
```
npm install
npx prisma validate
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```
Check http://localhost:5000/api/health

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

Other admin helpers: `seller:admin -- verify <mobile>` (Verified Seller badge), `product:admin -- verify <id>` (Verified Product badge),
`reject`, `suspend`. Default admin login created by the seed: see `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env`. Change that password.

## Before going live
- SMS: OTPs are only printed to the console. `NODE_ENV=production` refuses to start until a real SMS provider
  is added (needs DLT registration in India). Planned for Step 15.
- Put the website and API on the same site, for example `app.yourdomain.com` and `api.yourdomain.com`.
  Different domains make iPhone Safari block the login cookie.
- Never commit `.env`.
