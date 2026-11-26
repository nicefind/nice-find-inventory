# Nice Find — Inventory

A simple inventory app for **Nice Find**, a vintage collectables shop in Adelaide
selling on eBay, Facebook Marketplace and Depop.

Store photos and a master description for each item, track its cost, asking price,
sold price, profit and listing status on each platform, and copy a tailored
description for each platform — short with hashtags for Depop, detailed for eBay,
local pickup front and centre for Marketplace.

There is a dashboard at the top: stock cost, listed value, total sold, sold this
week, profit so far, and progress toward the **$50,000** goal (about **$962/week**).
Items listed for 30+ days are flagged as stale.

> **Important:** this app does **NOT** auto-post to eBay, Marketplace or Depop.
> Copy the generated description into each platform yourself, then tick the
> listing status off here.

## How it works

- **With Supabase set up:** items and photos are stored in Supabase and sync
  across your phone and desktop.
- **Without Supabase:** the app still works in **local demo mode** — items are
  saved in your browser only (localStorage, photos as data URLs), with a banner
  saying so. Set up Supabase when you're ready to sync.

## 1) Create a free Supabase project

1. Go to https://supabase.com and sign up / sign in (free tier is fine).
2. Click **New project**, give it a name (e.g. `nice-find`), pick a region
   close to Australia (e.g. Sydney), set a database password and save it
   somewhere safe.
3. Wait a minute or two for the project to be created.

## 2) Create the table and photo bucket

1. In your Supabase project, open **SQL Editor** (left sidebar) > **New query**.
2. Open `supabase/schema.sql` from this project, copy the whole file, paste it
   into the SQL Editor and click **Run**. This creates the `items` table and
   the permissive policies for this single-user hobby app.
3. Still in Supabase, open **Storage** (left sidebar). If there is no bucket
   called `item-photos`, click **New bucket**, name it `item-photos`, tick
   **Public bucket**, and click **Create**. (The SQL in step 2 tries to create
   it too — if it worked, you'll already see it here.)
4. That's it — no other setup in Supabase is needed.

> Do not share the deployed URL publicly: the policies in `schema.sql` let
> anyone with the link read and edit the inventory. Keep the link to yourself.

## 3) Copy your Supabase URL + anon key into `.env.local`

1. In Supabase, go to **Settings** (bottom left) > **API**.
2. Copy the **Project URL** and the **anon / public key**.
3. In this project folder, copy `.env.example` to a new file called `.env.local`
   and paste the two values in:
   ```bash
   cp .env.example .env.local
   ```
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key-here
   ```
   Never commit `.env.local`, and never use the `service_role` key here —
   only the anon key.

To try it locally first:
```bash
npm install
npm run dev
```
Then open http://localhost:3000

## 4) Deploy to Vercel

### Option A — from GitHub (recommended)

1. Push this folder to a GitHub repository.
2. Go to https://vercel.com, sign in, click **Add New… > Project**, and
   **Import** that repository.
3. Vercel should detect Next.js automatically. Before deploying, open
   **Environment Variables** and add the same two variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click **Deploy**. Vercel will give you a URL like
   `https://nice-find-inventory.vercel.app`.

### Option B — with the Vercel CLI

```bash
npm install -g vercel
vercel
# follow the prompts, then add the env vars:
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel --prod
```

If you change the env vars later, redeploy in Vercel for them to take effect.

## 5) Add your first item

1. Open your deployed site and click **+ Add item**.
2. Add a title, photos, master description, category, era/brand, condition,
   cost paid, asking price, source and pickup location.
3. Click **Add item**. It is saved to Supabase and will appear on your phone
   and desktop.
4. Open the item's **eBay / Facebook Marketplace / Depop** section, click
   **Copy … description**, paste it into that platform's listing, then set the
   platform status to **Listed** and paste in the listing URL.
5. When it sells, edit the item, set the overall status to **Sold**, and enter
   the sold price and sold date — the dashboard profit and $50,000 progress
   update automatically.

### Try it with samples first

If the inventory is empty, there is a **Load 2 sample items** button. It adds
the Ice-Busters 1985 Lanard sno-cone maker ($20, Modbury Heights) and the
5 vintage Coca-Cola Yo Yos ($25) as **Watching** items. They are clearly marked
**Sample** and you can delete them at any time.

## Export / backup

Click **Export CSV** at any time to download all items as a spreadsheet
(`nice-find-inventory.csv`) — a handy backup, and useful for working out
totals outside the app.

## Tech

Next.js (App Router) + TypeScript + React, plain CSS, and
`@supabase/supabase-js`. No Tailwind, no other back-end. The only
dependencies are `next`, `react`, `react-dom` and `@supabase/supabase-js`.
