# portfolio-web

Personal portfolio of Tatas Handharu — Tech Lead AI Systems, Jakarta.

Next.js 16 (App Router) + custom WebGL effects (ferrofluid hero, lens-reveal text, curved project slider, glitch counters and menu). Layout and motion are rebuilt from the Framer template "Tender Humans".

## Develop

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Content

All text, links and projects live in `src/content/site.ts`. Project covers and footer media live in `public/media`.

## Deploy

Import the repository in Vercel (framework preset: Next.js). No environment variables are required.

## Contact form

`/contact` posts to `src/app/api/contact/route.ts`, which sends mail via [Resend](https://resend.com).
Set these environment variables (Vercel → Project → Settings → Environment Variables):

- `RESEND_API_KEY` (required)
- `CONTACT_TO_EMAIL` (optional, default `tatas.handharu@gmail.com`)
- `CONTACT_FROM_EMAIL` (optional, default `Portfolio <onboarding@resend.dev>`; use an address on a verified domain once you add one)

## CMS (Keystatic)

Content lives in `content/site.json`, `content/projects.json` and `content/skills.json` (project images in `public/media/projects/`). Edit it at `/keystatic`.

- Local: `npm run dev`, then open http://localhost:3000/keystatic. Saving writes the JSON files directly; commit and push as usual.
- Online (Vercel): one-time GitHub App setup:
  1. On your Mac run `NEXT_PUBLIC_KEYSTATIC_STORAGE=github npm run dev` and open http://localhost:3000/keystatic.
  2. Follow "Create GitHub App" (repo `tatashandharu15/portofolio`). Keystatic writes `.env` with `KEYSTATIC_GITHUB_CLIENT_ID`, `KEYSTATIC_GITHUB_CLIENT_SECRET`, `KEYSTATIC_SECRET`, `NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG`.
  3. Copy those four values to Vercel → Settings → Environment Variables, then redeploy.
  4. In the GitHub App settings add the callback URL `https://<your-domain>/api/keystatic/github/oauth/callback`.
  Every save at `https://<your-domain>/keystatic` becomes a commit, and Vercel redeploys automatically (about 1 minute).
