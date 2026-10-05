# Production setup

Without any of this, Necronotecon already works: notes stay in your browser (IndexedDB) and the header shows "local only". Do these steps to get sync across your PC and phone, a login, and a public URL. Everything below is free.

You will need: a GitHub account (this repo), a Supabase account, and about 15 minutes.

## 1. Supabase: database, login and your one user

1. Go to https://supabase.com and click **Start your project**. Sign in (GitHub login is fine).
2. Click **New project**. Pick an organization, name it `necronotecon`, choose a strong database password (save it somewhere, you will not need it day to day), pick the region closest to you (for Israel, a Frankfurt or London region), and click **Create new project**. Wait about two minutes until it finishes setting up.
3. Run the migration:
   1. In the left sidebar click **SQL Editor**, then **New query**.
   2. Open `supabase/migrations/0001_notes.sql` in this repo, copy all of it, paste it into the editor.
   3. Click **Run**. You should see "Success. No rows returned".
   4. Check: left sidebar **Table Editor** shows a `notes` table with a lock/"RLS enabled" badge.
4. Turn off public sign-ups:
   1. Left sidebar **Authentication**, then **Sign In / Providers** (older dashboards: **Providers**).
   2. Under **User Signups**, switch **Allow new users to sign up** to **off** and click **Save**.
   3. Make sure the **Email** provider stays enabled (you need it to sign in).
5. Create your user:
   1. **Authentication**, then **Users**, then **Add user**, then **Create new user**.
   2. Enter your email and a password, tick **Auto Confirm User**, and click **Create user**.
   3. This email and password are what you type into the app's sign-in screen.
6. Copy the two values the app needs:
   1. Left sidebar **Project Settings** (gear icon), then **API** (newer dashboards: **API Keys** / **Data API**).
   2. Copy the **Project URL** (looks like `https://abcdxyz.supabase.co`).
   3. Copy the **anon public** key (the long `eyJ...` one, or the "publishable" key in newer dashboards). Do **not** copy the `service_role` / secret key.

## 2. GitHub: add the secrets

1. Open this repository on github.com, then **Settings**, then **Secrets and variables**, then **Actions**.
2. Click **New repository secret**. Name: `VITE_SUPABASE_URL`, Secret: the Project URL. Click **Add secret**.
3. Click **New repository secret** again. Name: `VITE_SUPABASE_ANON_KEY`, Secret: the anon key. Click **Add secret**.

(The anon key ends up in the public JavaScript. That is expected: row level security in the migration is what keeps your notes private.)

## 3. GitHub Pages: publish the site

1. Repository **Settings**, then **Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. The workflow in `.github/workflows/deploy.yml` runs on every push to `main`. Merge your work branch into `main` (or open the **Actions** tab, choose **Deploy to GitHub Pages**, and click **Run workflow** on `main`).
4. When the run is green, open the **Actions** run, click the **deploy** job, and follow the URL it shows, normally `https://<your-username>.github.io/<repo-name>/`.
5. Sign in with the email and password from step 1.5. The header badge should say "synced".

If the page shows "local only" instead of a login screen, the secrets were missing or misnamed when the build ran: fix them, then run the workflow again.

Prefer Cloudflare Pages? Create a Pages project from this repo with build command `npm run build`, output directory `dist`, and add the same two variables under **Settings, Variables and Secrets**.

## 4. Install on your Android phone

1. On the phone, open the site URL in **Chrome** and sign in.
2. Tap the **⋮** menu, then **Install app** (or **Add to Home screen**), then **Install**.
3. Open **Necro** from the home screen. It starts in the standalone app and works offline; notes you write without a connection are queued and sync when you are back online.
4. Share to it: in Chrome (or any app) tap **Share**, pick **Necro**, and the link or text becomes a new note. The share option appears only after the app is installed.

## Local development against Supabase (optional)

Copy `.env.example` to `.env.local`, fill in the two values, and run `npm run dev`.
