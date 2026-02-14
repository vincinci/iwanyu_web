# IwanYu Marketplace

IwanYu is an e-commerce marketplace for Rwanda, built with React, TypeScript, Vite, Tailwind CSS, and Supabase.

## Local development

Prerequisites:
- Node.js 18+
- npm

Run locally:

```sh
npm install
npm run dev
```

Build for production:

```sh
npm run build
npm run preview
```

## Project structure

- `src/` — app source code (pages, components, context, hooks)
- `public/` — static assets
- `supabase/` — migrations and Supabase config
- `scripts/` — import and utility scripts
- `e2e/` — Playwright tests

## Deployment

This app is configured for Vercel (`vercel.json`) and can be deployed on any static frontend platform with API support.

## Notes

- Social preview metadata is defined in `index.html` and `src/components/SEO.tsx`.
- Environment and deployment guides are in `VERCEL_ENV.md`, `DEPLOYMENT.md`, and `ADMIN_GUIDE.md`.
