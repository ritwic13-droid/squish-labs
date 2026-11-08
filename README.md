# squish.labs

An interactive WebGL lab of squishy toys: eleven soft bodies on an agar plinth that you can poke, squeeze, knead, toss and spill.
Each has its own material, sound and parts that ride along with the squish. It opens on a liquid landing sequence:
- **Loading:** a glossy blob swells into shape as the lab loads.
- **Ready:** a drop buds off into the Start key.
- **Start:** the blob falls into its place and spills into the plinth, and the toy drops onto it.

**Live:** https://squish-labs.vercel.app

It is one HTML file. There is no build step and nothing to install to run it: three.js comes from a CDN.

## What's here
```
material-studies/
  index.html              the whole lab: renderer, studio lighting, soft-body toys, sound, the landing sequence
  teaser.js               an optional recorded teaser (open with ?teaser)
  vercel.json             hosting headers (who may embed it in an iframe)
  tools/shots.mjs         real-GPU before/after screenshots and a contact sheet
  tools/curve-audit.mjs   checks that curved outlines are really curved: no facets, corners or stair-steps, frame by frame
  UPGRADE-PROMPTS.md      the round-by-round prompts the lab was built with, and the round protocol each one follows
  RENDERING-PLAYBOOK.md   the rendering techniques the rounds rely on
  HANDOFF-PORTFOLIO.md    how a portfolio site links to the lab (an example of a hand-off document)
```

## Run it locally
```
npx serve material-studies        # or any static file server
```
Then open the address it prints. Useful addresses:
- `?nointro` skips the landing.
- `?debug` exposes test hooks.
- `?from=portfolio` starts with the full-screen fluid hand-off.

## Put your own copy online (Vercel, free)
1. Fork this repository on GitHub.
2. On vercel.com, sign in, choose **Add New → Project**, and import your fork.
3. Set **Root Directory** to `material-studies`. There is no framework and no build command.
4. Choose **Deploy**. You get a `*.vercel.app` address.
5. Optional, a custom subdomain: in Vercel's project settings open **Domains**, add `lab.yourdomain.com`, and add the CNAME record
   Vercel shows you at your DNS provider.
6. Edit `material-studies/vercel.json`. Its `frame-ancestors` list names the sites allowed to embed the lab in an iframe; replace
   ritwicdesign.com with your own site, or remove the header if you don't embed it.

Or from a terminal, with the Vercel CLI: `cd material-studies && npx vercel deploy --prod`.

## Make a lab of your own
The lab was built in rounds with Claude Code, one prompt per round, each held to the same protocol. Every round:
- takes real-GPU before/after screenshots;
- gets a harsh review against reference photos;
- goes through at least three fix passes;
- must pass measured checks: 60 fps at 2560x1440, no console errors, and zero facets per the curve audit;
- ends with an honest summary.

To make your own:
1. Read the **Round protocol** and **Material library** at the top of `material-studies/UPGRADE-PROMPTS.md`.
2. Gather your own reference photos into `material-studies/refs/`. The originals aren't included here: they belong to their
   photographers. Each round names the references it needs.
3. In Claude Code, paste the rounds in order (Round 0 first: the image pipeline), changing the toys, materials and look to yours.
   Tell Claude to follow the round protocol every time, or add a `CLAUDE.md` that says so.
4. Use the tools to keep it honest:
   - `node material-studies/tools/shots.mjs <round> before|after <spec.json>` takes the screenshots;
   - `node material-studies/tools/curve-audit.mjs selftest`, then `... landing`, checks the outlines.

   Both need `npm i playwright-core` and a GPU-backed Chrome.

## Embedding it
- When opened in an iframe, the lab posts `{ type: 'squish:ready' }` to its parent once loaded.
- It accepts `{ type: 'squish:start' }` from that parent.

See `HANDOFF-PORTFOLIO.md` for the full contract, including the entry colours.

Made by Ritwic (ritwicdesign.com).
