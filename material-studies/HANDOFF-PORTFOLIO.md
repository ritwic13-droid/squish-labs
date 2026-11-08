# Handoff: add squish.labs to ritwicdesign.com

**For:** Claude Code working in the Portfolio project (ritwicdesign.com).
**From:** the squish.labs lab project, repo `ritwic13-droid/lab`, branch `claude/determined-mccarthy-bktqmd`,
entry file `material-studies/index.html` (internal codename "Material Studies"; the visitor-facing
name is **squish.labs**, lowercase, with "labs" in the brand pink).

Read the whole document, then inspect the portfolio's own code before changing anything.

---

## What squish.labs is
An interactive WebGL lab of squishy toys (the Squish study: eleven soft toys on an agar plinth, the Fluffy monster first). It
opens on a landing sequence:
- **Loading:** a glossy pink blob swells into shape, driven by real loading progress.
- **Ready:** it loops slowly, and a drop buds off it and becomes a pill-shaped **Start** key.
- **Start:** the blob falls into the key's place, becomes a drop and spills into the plinth, and the toy drops onto it.

- **Live URL:** https://squish-labs.vercel.app (Vercel project `squish-labs`, account `ritwic0-7125`)
- **Planned address:** https://squish.ritwicdesign.com.
  - It is already attached to the Vercel project.
  - It goes live once the DNS record below is added in Wix: a CNAME `squish` to `76cd7d626f867138.vercel-dns-017.com`.
  - Until then, use the vercel.app URL.

## The hand-off contract (what the lab does for you)

### Opening it from the portfolio: `?from=portfolio`
`LIVE_URL/?from=portfolio` starts with a full-screen fluid instead of the plain landing:
1. **First paint:** the page's very first paint is solid `#ff5c9a`. This is set by a tiny script in the page head, before anything loads.
2. **Settling:** within a few hundred ms the lab's own fluid fades in over that colour, already covering the whole screen, and
   settles into the landing blob as loading progresses.
3. **Labels:** the landing's labels (counter, frame) fade in as the fluid settles.
4. **Start key:** it appears as usual.

So the portfolio's transition should **end on a full screen of `#ff5c9a`**, then navigate or show the iframe.

With `prefers-reduced-motion: reduce` the lab ignores the entry fluid and shows its calm still landing. Do the same on the portfolio side: a simple fade.

### The colours at the moment of entry (CSS variables on the lab's `:root`)
| Variable | Value | Use |
|---|---|---|
| `--squish-entry-fluid` | `#ff5c9a` | the fluid; the full-screen colour at the hand-off |
| `--squish-entry-fluid-deep` | `#801441` | the fluid's shaded side |
| `--squish-entry-fluid-light` | `#ffcbdf` | the fluid's highlights and rim |
| `--squish-entry-ground` | `#111315` | the ground the fluid settles over |

The portfolio can't read these across origins, so copy the values. They only change if the lab's signal colour changes, and this
table will be updated if it does.

### If embedded in an iframe
- **Ready:** when the lab is ready, it posts `{ type: 'squish:ready' }` to `window.parent`, with target origin `'*'`. The message carries nothing private.
- **Start:** it accepts `{ type: 'squish:start' }`, or the bare string `'squish:start'`, from its parent window only (it checks `event.source === window.parent`).
  - A start that arrives before the key is shown waits for it, then starts.
- **Sound:** browsers only let audio start after a press inside the frame. A start sent by message begins silent, and the sound
  wakes on the visitor's first press in the lab. Add `allow="autoplay"` to the iframe; it may help in some browsers.
- **Who may embed it:** the lab only allows framing by `'self'`, `https://ritwicdesign.com`, `https://*.ritwicdesign.com`,
  `https://*.wixsite.com`, `https://*.wix.com`, `https://*.wixstudio.com` and `https://*.filesusr.com` (where Wix serves HTML
  embeds). This is the `Content-Security-Policy: frame-ancestors` header in `material-studies/vercel.json`. If the portfolio is served
  from somewhere else, that list must be extended, or the iframe will be blank.

Minimal parent-side example:
```html
<iframe id="squish" src="https://squish-labs.vercel.app/?from=portfolio" allow="autoplay" title="squish.labs"
        style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>
<script>
  addEventListener('message', e => {
    if (e.origin !== 'https://squish-labs.vercel.app' && e.origin !== 'https://squish.ritwicdesign.com') return;
    if (e.data && e.data.type === 'squish:ready') { /* dissolve the portfolio's fluid here */ }
  });
  // to press Start from the portfolio (optional):
  // document.getElementById('squish').contentWindow.postMessage({ type: 'squish:start' }, 'https://squish-labs.vercel.app');
</script>
```

## What to build in the portfolio

### 1. The button
- **Location and label:** the **right side of the top toolbar**, labelled **squish.labs**.
- **At rest:** a pill with a **subtle, constantly moving fluid** inside it, as a small WebGL/canvas shader or an animated gradient/SVG turbulence. Calm, low contrast, never distracting.
- **On hover and focus:** the fluid **lights up with the site's opal CTA colours**. Find the opal CTA in this project's code and reuse its exact colours and gradient tokens; don't invent new ones.
- **Accessibility:**
  - a real `<a>` or `<button>`, with a keyboard focus style and `aria-label="Open squish.labs lab"`;
  - with `prefers-reduced-motion`, keep the fluid still and use a simple fade on hover.

### 2. The transition
On click, a fluid animation expands from the button and fills the screen with `#ff5c9a`. The lab continues from there. Pick
whichever of these suits the codebase, and explain why:

- **A. Navigate (simplest, most robust).** Play the fluid fill over the portfolio, then go to `LIVE_URL/?from=portfolio`. The lab's
  first paint is the same pink, so the hand-off is seamless.
- **B. Full-screen iframe overlay.**
  1. Fill the screen with the fluid.
  2. Mount the iframe of `LIVE_URL/?from=portfolio` underneath.
  3. Dissolve the fluid when the lab posts `squish:ready`, or straight away, since the lab's own fluid is already showing.
  4. Add a close button that returns to the portfolio.
- **C. Dedicated page** (e.g. `/squish`): hosts the iframe full-screen, reached via the transition.

### 3. Wix specifics: check before choosing
The site is Wix with a custom front end written by Codex. Confirm in this project which of these it uses, because that decides
how the button gets in:
- **Wix Headless with a custom front end** (React, Next.js, Vite…): add the button as a normal component.
- **A Wix site with Velo code and custom elements:** add the button as a Custom Element, and host its script externally.
- **The Wix Editor with an HTML embed:** use option A or C, and tell me exactly what to click in the editor. HTML embeds run on
  `*.filesusr.com`, which the lab already allows.

### 4. Must work
- Desktop and mobile.
- If WebGL isn't available, fall back to a plain link.
- Don't slow down the portfolio's first load: lazy-load the button's shader and never preload the lab.

## Open questions to ask me (Ritwic) before building
1. Has the `squish` CNAME been added in Wix (so the final URL is https://squish.ritwicdesign.com)?
2. Should the lab open in the same tab (A), as an overlay (B) or on its own page (C)?
3. Should the button appear on every page, or only on the home page?
