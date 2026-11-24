# Rebloom website: how to work on it

This repo is the live site for Rebloom (rebloomwithnes.co.uk). Cloudflare Pages deploys it automatically.

## Going live
- A push to `main` goes live in about a minute. **Never push to `main` without the owner saying "put it live".**
- Make changes on a branch named `draft-<short-name>`. Cloudflare builds a preview for every branch at `https://draft-<short-name>.rebloomwithnes.pages.dev`. Share that link so the change can be checked on a phone first.
- When the owner approves, merge the branch into `main`, wait about 90 seconds, then check https://www.rebloomwithnes.co.uk shows the change.

## What's here
- `index.html`: the whole site. One page with four views switched by the URL hash: Home, `#why-rebloom`, `#how-it-works`, `#my-story`, `#say-hello`. CSS and JS are inline.
- `assets/`: photos, favicon, `rebloom-mini-guide.pdf` (the free guide linked from both form emails).
- `functions/api/signup.js` and `functions/api/contact.js`: the two forms. They send emails through Resend. Keys live in Cloudflare environment variables, never in code. This repo is public: never commit emails, keys or personal details.
- `privacy.html`: privacy page.

## Rules for every change
- Write in Nes's voice: warm, short sentences, plain words, no hype, no result promises. Never "proven" or "guaranteed".
- Never change these without asking first: the line that Rebloom isn't therapy or medical advice, the Samaritans number (116 123), prices and dates.
- Never mention weight, calories or body shape. Never present Nes as a therapist.
- Psychology claims say "grounded in research", never "proven". Don't use "21 days" or "30 days builds a habit".
- Every edit must work at phone width (about 375px) with nothing spilling off the side. Check it before sharing a preview.
- Keep the existing look: the colour tokens in `:root`, the Parkinsans and Shantell Sans fonts, the flower motifs.
- When you remove words from the site, list the exact removed text in your summary so it can be saved in the removed-words log.
- Show the change (a preview link or screenshot) and ask before going live.
