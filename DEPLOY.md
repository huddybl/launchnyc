# Deploy LaunchNYC to GitHub + Vercel

Follow these steps to push your project to GitHub and deploy on Vercel.

---

## 1. Initialize Git and make the first commit

In your terminal, from the project root (`launchnyc`):

```bash
cd /Users/hudsonlavinsky/launchnyc

# Option A: Run the script (does init + add + commit)
bash scripts/git-init-and-commit.sh

# Option B: Run commands manually
git init
git add .
git commit -m "Initial commit: LaunchNYC Next.js app"
```

If you see a message about needing to set your name/email:

```bash
git config user.email "your@email.com"
git config user.name "Your Name"
```

Then run `git add .` and `git commit -m "Initial commit: LaunchNYC Next.js app"` again.

---

## 2. Create the GitHub repository

1. Go to **https://github.com/new**
2. Set **Repository name** to: `launchnyc`
3. Choose **Public**
4. **Do not** check "Add a README", ".gitignore", or "license" (you already have these)
5. Click **Create repository**

---

## 3. Push your code to GitHub

GitHub will show you "push an existing repository from the command line". Run (replace `YOUR_USERNAME` with your GitHub username):

```bash
git remote add origin https://github.com/YOUR_USERNAME/launchnyc.git
git branch -M main
git push -u origin main
```

If you use SSH instead:

```bash
git remote add origin git@github.com:YOUR_USERNAME/launchnyc.git
git branch -M main
git push -u origin main
```

You may be prompted to sign in (browser or personal access token for HTTPS, or SSH key for SSH).

---

## 4. Deploy on Vercel

1. Go to **https://vercel.com** and sign in (use **Continue with GitHub**).
2. Click **Add New…** → **Project**.
3. **Import** the `launchnyc` repository (Vercel will list your GitHub repos).
4. Leave the defaults:
   - **Framework Preset:** Next.js
   - **Root Directory:** ./
   - **Build Command:** `next build` (default)
   - **Output Directory:** (default)
5. **Environment variables:** Add the same vars you use locally so the app works in production. Click **Environment Variables** and add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ANTHROPIC_API_KEY` (for the AI route)
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (for address autocomplete)
   - Any others your app reads from `process.env`
6. Click **Deploy**. Vercel will build and deploy; you’ll get a URL like `launchnyc.vercel.app`.

---

## 5. After deployment

- **Supabase:** If you use Supabase, in the Supabase dashboard under **Authentication → URL Configuration**, add your Vercel URL to **Redirect URLs** and **Site URL** so auth works.
- **Env changes:** To change env vars later, go to your project on Vercel → **Settings** → **Environment Variables**, edit, and redeploy (or push a new commit to trigger a deploy).

---

## Quick reference

| Step              | Where / Command |
|-------------------|-----------------|
| Init + commit     | `git init` → `git add .` → `git commit -m "Initial commit: LaunchNYC Next.js app"` |
| Create repo       | https://github.com/new → name: `launchnyc` |
| Push              | `git remote add origin https://github.com/YOUR_USERNAME/launchnyc.git` then `git push -u origin main` |
| Deploy            | https://vercel.com → Add New → Project → import `launchnyc` → add env vars → Deploy |
