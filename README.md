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
