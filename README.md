# LocalMart

Local marketplace: customers buy from sellers in their own area, sellers sell from their phone.

Stack: React + Redux Toolkit + Tailwind (frontend), Node + Express + Prisma + MySQL (backend).

## Features

- Authentication: mobile OTP, password, forgot password, refresh tokens and roles
- Customer: profile, addresses, wishlist, notifications and change password
- Seller: registration, PAN/bank/GST details, dashboard, settings and store logo
- Products: add/edit/delete, photos and videos via Cloudinary, variants, stock and inventory
- Customer shopping: home sections, categories, search, filters and product details
- Location-based shopping: city, area, pincode or GPS
- Cart: guest cart and account cart, grouped by seller
- Checkout and orders: Cash on Delivery or Razorpay online payment
- Payment verification: server-side signature verification and webhook support
- Seller order management and customer order tracking
- Commission and seller settlement workflow

## Requirements

- Node.js 18 or newer
- MySQL 8

## First-time setup

### 1. Database

Create an empty database:

```sql
CREATE DATABASE localmart;
```

### 2. Backend

```powershell
cd backend
Copy-Item .env.example .env
```

Configure these variables in `backend/.env`:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `ENCRYPTION_KEY` (64 hexadecimal characters)
- `CLOUDINARY_*` (for media uploads)
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`

Generate an encryption key:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Keep a safe backup of the encryption key. Do not commit `.env` or publish secret values.

Install dependencies and validate the Prisma schema:

```powershell
npm install
npx prisma validate
```

Then follow the database migration commands supported by this project's Prisma version and existing migration history. Do not reset the database if it contains data.

Seed the database if the project's seed script is configured:

```powershell
npm run db:seed
```

Start the backend:

```powershell
npm run dev
```

Health endpoint: http://localhost:5000/api/health

### 3. Frontend

Open a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

## Testing the shopping flow

1. Register a customer account.
2. Register a seller at `/seller/register`.
3. Approve the seller using the configured admin command, if required.
4. Add a product at `/seller/products/add`.
5. Verify or approve the product using the configured admin command, if required.
6. Select the appropriate delivery area.
7. Add a product to the cart and proceed to checkout.
8. Enter a delivery address that matches the seller's delivery coverage.
9. Test Cash on Delivery or Razorpay in Test mode, if payment credentials are configured.
10. Open `/seller/orders` to manage orders and `/orders/<id>` to view the customer order timeline.

Use the actual scripts and available features in this repository as the source of truth for admin commands and payment behavior.

## Before going live

- Configure a real SMS provider before enabling production OTP authentication.
- Configure production database credentials, JWT secrets, encryption key and payment credentials securely.
- Configure Razorpay webhooks using the deployed API URL and the same webhook secret.
- Keep `.env` out of Git.
- Test the complete customer-to-seller order flow before launch.
