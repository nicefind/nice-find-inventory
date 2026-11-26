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

## Passcode gate (optional, recommended)

The app has a simple passcode lock. Set it in Vercel: **Settings >
Environment Variables**, add `APP_PASSCODE` with a code you choose, then
redeploy. After that, anyone opening the site sees a passcode screen first
and stays unlocked on that device for 30 days. Use **Lock app** in the
footer to lock it again on a shared device.

- If `APP_PASSCODE` is not set, the site stays open as before — a deploy
  can never lock you out by accident.
- To change the code, change the env var in Vercel and redeploy. Changing
  it logs everyone out, including you.
- Do not use your Supabase password as the passcode, and do not put a real
  code in `.env.example` or in the GitHub repo.

Honest limit: this locks the app's front door only. The Supabase anon key
is still in the client bundle, so someone who knows the Supabase project
URL + anon key could still reach the database directly. For true per-user
security, use Supabase Auth + RLS instead.

## Photo library (P1)

The **Photos** tab is a general photo pool for shoot days. Bulk-upload a
batch of photos there — they are stored in Supabase Storage under the
`library/` folder and listed in a `library_photos` table — then, when you
add or edit an item, tap **Pick from library** and choose the photos for it.
Photos already used on an item are marked **Used** (the tab also shows how
many are still unused). Photos are resized to a max of 1600px before upload
so a big shoot does not eat your 1 GB of free Supabase storage.

**One-time setup if you deployed before P1:** re-run `supabase/schema.sql`
in the Supabase SQL Editor (paste the whole file and Run — it is safe to
run twice; it only adds the `library_photos` table). Until you do, the
Photos tab will say the table is missing.

Item photos can also be reordered in the add/edit form (‹ › buttons, ★ to
make one the first/hero photo), and the item detail photo now shows the
whole image instead of cropping it. New category: **Watches & Jewellery**.
Saving an item with a $0 asking price now asks first, and the goal line
reads "target pace $962 / week".

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
