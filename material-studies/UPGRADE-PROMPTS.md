# Upgrade prompts: reaching the "Harbor Jelly" look

Target machine: NVIDIA GeForce RTX 4060, WebGL 2 and WebGPU hardware accelerated in Chrome.
Current studies: 01 Pile · 02 Squish · 03 Alpine (Monte Lussari) · 04 Coast (Riomaggiore / Harbour / Grenadines).
Reference frames from the evidence video: `material-studies/refs/harbor-jelly-*.jpg`.

**Squish keeps its look, toys and sounds.** Squish rounds 1-3 fix how the toys sit on the
shelf, smooth every curve and clean up the shadows; rounds 4-7 rebuild the pop-it and slime and fix
the jelly donut and axolotl; rounds 8-9 add the bubble beaver and the cracking ball; rounds 10-11
make the slime photo-real and put it in a spillable pot; round 12 adds animated 3D icons to the toy buttons;
round 13 tried a fluid mound; round 14 goes back to the original slime physics and improves them step by step;
round 15 fixes resolution and smoothness everywhere; round 16 fixes the jelly donut's jam; rounds 17-18 fix the
cracking ball and replace the pop-it; round 19 re-checks everything; Coast round 5 rebuilds the water.

## How to use this file
1. Start Claude Code fresh for each round: Ctrl + C twice, `git pull`, then `claude`.
2. Paste **one round**, including its first line ("Follow the round protocol…"). Big rounds take
   30-60 minutes; let them run.
3. When it finishes, open the before/after contact sheet it made (`material-studies/shots/<round>/index.html`)
   and check in Chrome (F5) yourself.
4. Like it? `commit and push this`. Not right? Describe what's off (a screenshot helps), or `undo that change`.
5. Mark it done with a `--- posted ---` line under the round, save, and commit it with the round.
6. Order from here: Squish 14-19 → Coast 5 → Navigation N1 → Alpine 1-4 → Pile 0-2 → Photo-quality live rendering →
   squish.labs launch rounds L1, L2, L3, L3b, L4, L5 → Verification V1. Everything above the last `--- posted ---` line is done.
7. Resume instructions for every session are in `RESUME.md` at the top of the `lab` folder.

## Round protocol (every round follows this; CLAUDE.md points Claude Code here)
> Round protocol. Work through these steps in order and do not skip any. "It works" is not done.
> 1. Read first: CLAUDE.md, the "Material library" section of material-studies/UPGRADE-PROMPTS.md,
>    material-studies/RENDERING-PLAYBOOK.md, and every reference image the round names. Write down,
>    in your own words, what the reference shows that ours doesn't yet, as a numbered list.
> 2. Real GPU only: take screenshots with the machine's GPU (Chrome or Playwright Chromium with
>    `--use-angle=d3d11 --enable-gpu-rasterization --ignore-gpu-blocklist`). Read the WebGL renderer
>    string and print it; if it says SwiftShader, llvmpipe or "Basic Render", the shots are invalid.
> 3. Shots tool: keep one reusable script, material-studies/tools/shots.mjs (create it if missing),
>    that opens the lab at a fixed size (2560x1440, Ultra), waits until the scene has settled, sets
>    named camera presets (closest zoom, three-quarter, plinth level, top) for each study and toy,
>    can trigger an interaction (poke, squeeze, pull, spill) at a fixed time, and saves PNGs plus a
>    contact sheet material-studies/shots/<round>/index.html showing reference | before | after side
>    by side. Take the "before" shots before changing anything.
> 4. Build, then critique: after implementing, take the "after" shots and compare them with the
>    references at full size. Then start a separate review subagent that sees only the images (not
>    the code) and is told to be harsh, and ask it to list every way ours looks worse than the
>    reference: faceting or polygon steps, grain, noise, banding, flicker between frames, aliasing,
>    flat or plastic-looking light, wrong colour, missing contact shadow or occlusion, floating,
>    sinking or intersecting parts, smeared reflections, visible seams, parts popping in or out.
> 5. Fix every item on that list and repeat steps 4-5 at least three times, until the reviewer finds
>    nothing it would call clearly worse than the reference. Keep a short log of each pass in the
>    contact sheet.
> 6. Measured checks, all must pass: no console errors or warnings; 60 fps or better averaged over
>    10 s on Ultra at 2560x1440 during the interaction (report the number, and the GPU frame time if
>    available); no triangle edge longer than about 2 pixels on any curved silhouette at the closest
>    zoom; nothing below the plinth top; the same camera and interaction give the same image twice.
> 6b. Curve audit, must report zero failures: run material-studies/tools/curve-audit.mjs (built in
>    Round V1; if it doesn't exist yet, build it first as described there) on every study and toy you
>    touched, including everything spawned during interactions (drops, splashes, crumbs, bubbles,
>    shards, particles). Paste its summary line. A round with any failure is not done.
> 7. Never fake it: don't hide a defect by lowering quality, moving the camera, shrinking the object,
>    turning a feature off, or blurring it. Fix the cause. If something can't be fixed in this round,
>    say exactly what and why.
> 8. Regression: take one quick closest-zoom shot of every other toy (or study) and confirm nothing
>    else changed or broke.
> 9. Summary: the contact sheet link, what changed, the fps, the reviewer's final list, and an honest
>    list of what still falls short of the reference.

## Material library (what each material must look like)
> - Matte silicone (pop-it, stress toys): roughness 0.55-0.65, faint sheen, light scattering a few mm
>   into thin walls (they glow slightly when back-lit), soft rounded creases, no plastic glare.
> - Soft vinyl / PU foam (bao, mochi, beaver, capybara, axolotl): satin, roughness 0.4-0.5, subsurface
>   wrap lighting tinted by the body colour, tiny pores or skin texture keyed to the rest shape, never
>   a uniform CG gloss; deformation wrinkles soften rather than crease sharply.
> - Tempered chocolate shell (cracking ball): very smooth, roughness 0.08-0.12 with a clearcoat, crisp
>   undistorted reflections of the studio softboxes, warm brown with slightly darker edges; broken
>   edges show a lighter, rougher cross-section.
> - Gel and slime: refractive (IOR about 1.35), thickness-based colour (Beer-Lambert), sharp GGX
>   highlights at roughness about 0.05, Fresnel reflection, a soft inner glow at thin edges, a tinted
>   caustic shadow; one smooth continuous surface with no particles or grain.
> - Jam: like gel but darker and more viscous, roughness about 0.1, deep red through thick parts,
>   glossy wet highlight, a thin wet film where it has run.
> - Clear plastic (slime pot, bubble): IOR about 1.5, thin walls with brighter Fresnel at grazing
>   angles, faint frosting (roughness about 0.15), visible but undistorted contents behind thin walls.
> - Fur and pile: strand lighting with a white primary and a tinted secondary highlight, back-lit
>   transmission, deep self-shadowing near the root, per-strand colour and length variation, no
>   shell banding.
> - Plinth: oiled wood with clear grain, roughness about 0.6, a soft, slightly blurred reflection
>   only where an object is close, and contact darkening under everything resting on it.
> - Lighting for all of them: the procedural studio (big overhead softbox, back-left rim strip,
>   front-right fill card) so every glossy surface shows clean, believable softbox streaks; soft PCSS
>   shadows that are sharp at contact and soften with distance.

---

## Round 0: sharpness and image pipeline (all studies, do first)

> Read material-studies/RENDERING-PLAYBOOK.md and look at material-studies/refs/harbor-jelly-closeup.jpg.
> In material-studies/index.html, upgrade the shared renderer for every study. Keep every
> study's content, controls, sounds and the existing PCSS soft shadows:
> 1. Upgrade three.js from 0.160.0 to the latest stable release (import map) and fix any breakage.
> 2. Post-processing chain: half-float HDR target with 4x MSAA → GTAO ambient occlusion →
>    subtle bloom → Khronos PBR Neutral tone mapping → SMAA → dither. Each step switchable per study.
> 3. A Quality switch in the top bar: High / Ultra, default Ultra on a discrete GPU. Ultra keeps
>    pixel ratio at the full device ratio (up to 2) and never lets adaptive resolution drop below 1.0;
>    shadow maps 4096; more shell layers for fur.
> 4. Replace the dimmed RoomEnvironment with a procedural studio environment (curved backdrop +
>    rounded softbox panels rendered to PMREM) that studies can configure.
> 5. Leave the Squish study's look unchanged apart from the sharper image and AO.
> Take before/after screenshots of every study at 1920x1080 and report frame rate on Ultra.

---

## 04 Coast

**Round 1: miniature look**
> Study 04 Coast only, all three locations: add tilt-shift depth of field (sharp band through the
> middle, soft top and bottom) so it reads as a miniature, stronger GTAO in streets and between
> beach and water should be 80%, buildings part 10% and remaining landscape and cliffside 5%, going from front to back. mountains are only slightly shown, in ultra high resolution.
> houses, contact shadows under boats and people, and light atmospheric haze on distant hills.
> Compare against material-studies/refs/harbor-jelly-closeup.jpg. Before/after screenshots.

---

**Round 2: glassy water like the reference**
> Study 04 Coast only, all three locations: rebuild the water to match
> material-studies/refs/harbor-jelly-closeup.jpg: Gerstner waves, a refraction pass so the seabed,
> rocks, fish and coral are seen bent through the surface, depth-based colour from turquoise to
> deep blue, bright animated caustic ripples on the seabed, a screen-space or planar reflection of
> the town and boats, white foam lines along rocks, quays and the reef break, and boat wakes that
> touching the sides of the water which are technically not the surface should have a reaction too
> the water has jelly like consistency to the user, but to its inhabitants, it is regular ocean water on a real life beach
> the inhabitants are only restricted to the 3D lattice of the structure and cannot step out of its 3 dimensional bounds maintaining a cuboid structure around it.
> spread in a V and fade. The water sides of the block should look like a glass tank.
> Before/after screenshots.

---

**Round 3: clean, detailed Riomaggiore**
> Study 04 Coast (Riomaggiore only): make the buildings look like the reference's clean toy houses
> but with Riomaggiore detail: bevelled walls in smooth solid colours (no grainy noise), modelled
> green shutters and window frames, wrought-iron balconies, slate roofs with real roof geometry,
> chimneys. Reduce visual noise on the hillsides: smooth terraced vineyards with neat rows and
> round-canopy trees instead of noisy texture. Boats on the slipway get hull planking colours,
> make the wildlife look ultrarealistic and accurate to the region. increase in variety too
> people get the cleaner style. Fewer, better objects over many rough ones. Before/after screenshots.

---

**Round 4: Harbour and Grenadines detail**
> Study 04 Coast (Harbour and Grenadines only): Harbour: bevelled containers with ridged sides,
> detailed gantry cranes with cables, a container ship with a bridge and railings, tugboats with
> fenders. Grenadines: smooth white-sand island, swaying palms with layered fronds, a thatched beach
> bar, catamarans with trampolines, coral with branching and brain shapes. Same clean toy style.
> push all elements tessellation to a higher quality baseline like the material-studies/refs/harbor-jelly-closeup.jpg
> Before/after screenshots.

**Round 5: water rebuilt on WebGPU-Ocean**
> Follow the round protocol at the top of material-studies/UPGRADE-PROMPTS.md.
> Study 04 Coast, all three locations: rebuild the water using matsuoka-601's WebGPU-Ocean
> (https://github.com/matsuoka-601/WebGPU-Ocean): an MLS-MPM particle simulation with screen-space
> fluid rendering. First open its LICENSE and confirm it allows reuse (it's listed as MIT); keep its
> copyright notice in our code and credit it in the study's caption. Adapt rather than paste: fit the
> simulation to each diorama's water block, keep the glass-tank sides, the jelly-like response when the
> visitor pokes the water, boats, wakes and swimmers floating on it, and the Round 2 look (refraction of
> the seabed, depth colour from turquoise to deep blue, caustics, foam along rocks and quays). Keep a
> WebGL2 fallback that uses the current water when WebGPU isn't available. 60 fps on Ultra at 2560x1440
> in every location. Before/after shots of all three locations, plus a recording of a poke and a boat
> wake.

---

## 02 Squish

Known problems these rounds fix (found in the code):
- Each toy's lowest point rests exactly on the plinth top (y = 0), so the two surfaces z-fight.
- The contact shadow is a flat sheet floating at y = 0.004, above the toy's base, so it slices
  through it and shows as a jagged white/black band.
- The floor is a hard per-vertex clamp, which leaves a crease and lets triangles dip between vertices.
- The soft body is an 8.4k-vertex icosphere drawn directly, and attached parts (eyes, ears, gills,
  orange, nubs, beads, domes) use 8-16 segments, so curved silhouettes show facets up close.

**Round 1: sit properly on the shelf**
> Study 02 Squish only. Keep every toy's look, controls and sounds. Fix how the toys meet the
> plinth: (1) give the plinth top a proper contact constraint: a signed-distance floor at the
> plinth surface plus a small skin thickness, applied to the deforming surface (not just a per-vertex
> clamp), so no vertex or triangle ever goes below the plinth, with a soft rounded contact patch that
> spreads when squashed and friction so it doesn't skate; (2) remove the floating contact-shadow
> sheet and instead darken the plinth itself (contact AO in the plinth material, from the toy's
> footprint/height), so nothing is coplanar with the plinth and nothing z-fights; (3) make the jam
> ooze, water beads, slime, sprinkles and pop-it all respect the same plinth surface and rim.
> Verify automatically: for every toy, at rest and while squeezed at maximum softness, report the
> lowest render vertex height relative to the plinth top (must be >= 0). Take close-up screenshots
> at plinth level from four sides for the bao, jelly donut, capybara and slime, before and after.

---

**Round 2: no sharp edges anywhere**
> Study 02 Squish only. Keep every toy's look, controls and sounds. Remove all visible faceting:
> (1) separate the simulation mesh from the render mesh: keep the soft-body sim at about its current
> resolution, and draw a much denser render mesh (High about 150k vertices, Ultra about 400k, or
> GPU tessellation/subdivision that adapts to screen size so no triangle edge is ever longer than
> about 2 pixels) that follows the sim smoothly (barycentric embedding in the sim triangles plus smooth
> normal interpolation, or Loop/PN-triangle subdivision), with normals recomputed smoothly every frame.
> Skinning must run on the GPU at these densities. A previous attempt at lower density still showed
> facets, so treat these numbers as a minimum;
> (2) rebuild every attached and curved part at high segment counts on Ultra: eyes, ears, nostrils,
> gills, legs, the capybara's orange and leaf, sprinkles, nubs on the spiky ball, water beads, pop-it
> domes and rings (at least 64 radial segments), the donut torus (at least 96 x 192);
> (3) if the CPU simulation plus skinning costs more than 4 ms a frame, move it to the GPU (WebGPU
> compute, or a WebGL transform-feedback/texture fallback). Verify: zoom to the closest camera
> distance on every toy and screenshot its silhouette against the backdrop at 2560x1440, at rest
> and while squeezed. No facets, kinks or polygon steps may be visible on any curve. Report frame
> rate on Ultra.

If you already ran Round 2 with the old numbers, run it again with this version; it builds on top.

---

**Round 3: clean shadows, especially on the bao**
> Study 02 Squish only. Keep every toy's look, controls and sounds. Fix shadow quality: fit the key
> light's shadow camera tightly around the current toy every frame (4096 map on Ultra); tune shadow
> bias and normal bias per toy so there is no acne or striping on the bao pleats, donut icing or
> capybara fur, and no peter-panning gap under the toys; keep PCSS soft penumbrae from the studio
> softbox; add ambient occlusion in the bao's pleat creases, under its rim and where the bun meets the
> plinth, and soft self-shadowing on all toys. Compare with material-studies/refs/harbor-jelly-closeup.jpg
> for how soft and grounded shadows should look. Before/after close-ups of every toy.

**Round 4: rebuild the pop-it as a Tetris puzzle pop-it**
> Study 02 Squish, Pop-it only. I don't like the current pop-it. Rebuild it to match
> material-studies/refs/popit-tetris-ref-1.jpg, popit-tetris-ref-2.jpg and popit-tetris-ref-angle.jpg:
> a dark charcoal rounded-rectangle tray with a raised rim, filled edge to edge with interlocking
> tetromino and pentomino pieces (L, T, S, Z, I, O shapes and longer bars) in bright saturated
> silicone colours (red, yellow, blue, purple, green, cyan, pink, orange). Each square cell of a piece
> has a soft silicone dome with a rounded crease where it meets the flat piece surface, and visible
> thin seams between neighbouring pieces. Pressing a dome inverts it into a concave dimple that
> stays pushed in, with a satisfying pop sound; it can be popped back from the other side when the
> board is flipped. Pieces can be lifted out by dragging and dropped back into the tray where they
> fit (snapping into place), and "Shuffle" lays out a new arrangement. Silicone material: soft matte
> with a faint sheen, slightly translucent at the dome edges. Dense geometry: no faceting on domes,
> creases or tray corners. Before/after screenshots next to the reference frames.

**Round 5: slime, rebuilt properly**
> Study 02 Squish, Slime only. The current slime renders badly and behaves wrongly: see
> material-studies/refs/slime-bug-current.jpg. Folds cut through themselves, there are cracks,
> inverted faces and seams along fold lines, and it stretches like a rubber sheet. Rebuild it:
> 1. Physics: a viscoelastic, slightly sticky fluid (MLS-MPM or SPH on WebGPU compute, with a CPU
>    fallback), not a spring surface. It slowly sags and spreads under gravity, stretches into
>    strands and sheets when pulled, folds over itself without passing through itself, sticks
>    lightly to the plinth and to the pointer, and slowly spills over the plinth edge only when
>    enough volume reaches it, in the same way as the jelly donut's jam.
> 2. Rendering: a smooth continuous surface (marching cubes at high resolution, or screen-space
>    fluid rendering with depth smoothing and thickness) with no seams, cracks or inverted normals.
>    Glossy wet surface with refraction and thickness-based colour.
> 3. Default colour: electric green (#39FF14 or close), with optional glitter flecks.
> Keep its controls and sounds working. Before/after screenshots and a short recording of a pull,
> a fold and a spill.

**Round 6: jelly donut fixes**
> Study 02 Squish, Jelly donut only. Fix these bugs:
> 1. Squeezing at certain angles makes the jam look disconnected from the hole. The jam must always
>    emerge continuously from the hole as one connected stream, from any squeeze angle.
> 2. Just before the jam reaches the plinth edge, it starts showing a reflection, as if jam were
>    oozing out from inside the shelf. Nothing may render below or inside the plinth top, and no
>    reflection of the jam may appear until it has actually crossed the edge.
> 3. A single drop of jam must not slide towards the edge on its own. Spilling requires enough
>    volume that that part of the plinth can't hold it; viscosity gives the pool a slight height,
>    which is fine. Small amounts stay where they land.
> Keep everything else about the donut as it is. Before/after screenshots of each fix.

**Round 7: axolotl legs**
> Study 02 Squish. Axolotl: when you poke it, thin stick-like legs show through its surface.
> Legs must be proper soft stubby limbs attached to the body surface, deforming with it, and never
> visible through the body. Check it at rest, poked and squeezed from four angles.
> Before/after screenshots.

**Round 8: new toy, bubble beaver**
> Study 02 Squish: add a new toy "Bubble beaver" (id `beaver`, button id `squish-toy-beaver`), placed
> in the toy list after Capybara. Match material-studies/refs/bubble-beaver-ref-1.png,
> bubble-beaver-ref-2.png and bubble-beaver-ref-squeeze.png, but as a toy of our own design: no
> keyring, strap, chain, tag or loop of any kind, and no brand name or logo. The toy itself:
> a chubby, upright baby beaver about the size of the other toys, one soft rounded body with the head
> as wide as the body. Coral-pink soft vinyl (around #f6a08f), smooth satin finish with a soft sheen,
> slight subsurface glow at thin edges. Two small rounded ears on top, two small glossy near-black
> eyes set wide, a rounded magenta-pink nose (#b8325e) between them, short stubby arms at the sides,
> a pale pink oval belly patch (#fbe4df), and two flat magenta webbed feet resting on the plinth.
> In its mouth sits a clear bubble: a transparent, glossy, slightly frosted sphere with faint tiny
> glitter flecks, using the thickness/refraction approach from RENDERING-PLAYBOOK.md.
> Squeeze: the body squashes like the other soft toys, and the bubble inflates from the mouth in
> proportion to how hard it is pressed (up to about the size of the head, see the squeeze reference),
> stretching thinner and clearer as it grows, wobbling, then slowly shrinking back when released.
> Poking the bubble itself dents it. Sounds: a soft rubbery squeak on squeeze and a gentle stretchy
> creak as the bubble grows. Dense geometry with no faceting anywhere, sitting on the plinth like the
> others (Squish Rounds 1-3). Also add `['beaver', 'Bubble beaver']` to the FLASH list in
> material-studies/teaser.js, in place of the spiky ball. Before/after screenshots next to the
> reference images, at rest and mid-squeeze from three angles.

**Round 9: new toy, cracking chocolate ball**
> Study 02 Squish: add a new toy "Cracking ball" (id `crackball`, button id `squish-toy-crackball`),
> placed in the toy list after Mesh grape ball. Match material-studies/refs/cracking-ball-ref-1.png
> and cracking-ball-ref-2.webp. No keyring, packaging or text. At rest it is a perfect, smooth sphere
> with a hard, glossy milk-chocolate-brown shell (around #7a3416), like tempered chocolate: crisp
> studio highlights, clear reflections, no faceting on its silhouette.
> The first squeeze cracks the shell: a crack network spreads out from where it is pressed with a
> crunchy, crackling sound, and the shell breaks into irregular rounded flakes of many sizes (smaller
> near the press). Between the flakes a soft, white, slightly blue-tinted gooey filling (#e4f0f4)
> bulges out, glossy and a little translucent, so the ball looks like the cracked one in the
> references. After that it behaves as a soft squishy: the filling squashes and stretches, the flakes
> ride on it, tilt and spread apart where it is squeezed and close up again when released, with a
> quieter crunch on each squeeze. Flakes never come off or pass through each other. Add a "Re-coat"
> control that restores the smooth unbroken shell. Dense geometry, sits on the plinth like the
> others. Also add `['crackball', 'Cracking ball']` to the FLASH list in material-studies/teaser.js,
> after the Mesh grape ball. Before/after screenshots: intact, first crack, and squeezed after
> cracking, from three angles.

**Round 10: slime graphics, photo-real gel**
> Study 02 Squish, Slime only. The slime still looks poor: blobby, grainy and plasticky. Rebuild only
> its rendering (keep the Round 5 physics) so it looks like real gel in a product photo, like the
> poured slime in material-studies/refs/slime-pot-ref.webp (ignore the glow-in-the-dark), on
> WebGPU with a WebGL2 fallback. Read material-studies/RENDERING-PLAYBOOK.md item 5 first.
> 1. Surface: one perfectly smooth continuous surface, never visible particles, bumps, grain,
>    stair-steps or holes. Either screen-space fluid rendering (particle depth, then a bilateral or
>    narrow-range depth filter over several iterations, normals rebuilt from the smoothed depth, at
>    full resolution) or marching cubes on a fine grid (cells no larger than a quarter of a particle
>    spacing) with smoothed, interpolated normals. More particles if needed; keep 60 fps on an RTX 4060.
> 2. Thickness: render a thickness pass, then Beer-Lambert absorption so thin sheets and drip tips are
>    pale and clear, and thick parts are deep, saturated green. Default colour #39FF14.
> 3. Refraction: refract a copy of the scene behind it (the plinth's wood grain must bend
>    visibly through it), stronger where it is thicker; index of refraction about 1.35.
> 4. Light: Fresnel reflection of the lab's studio environment, sharp GGX highlights (low roughness,
>    about 0.05) that slide over it as it moves, a soft inner glow where light passes through thin
>    edges, and a soft green-tinted shadow and contact darkening where it touches the plinth.
> 5. Small details: a few tiny trapped air bubbles that move with it, a faint wet sheen trail on the
>    plinth where it has been, and stretched strands that thin smoothly to a point.
> 6. Quality check: at the closest zoom at 2560x1440 there must be no noise, flicker, faceting or
>    aliasing on its silhouette, at rest and while being pulled. Before/after close-ups next to the
>    reference image from three angles, and the fps before and after.

**Round 11: slime in its own pot, spill and replace**
> Study 02 Squish, Slime only (builds on Rounds 5 and 10; keep the Round 10 look). Reference: material-studies/refs/slime-pot-ref.webp
> (for the pot shape and how the slime pours and spreads; no labels, brand names or glow-in-the-dark).
> 1. At rest the slime sits in its own pot standing on the plinth: a clear, slightly frosted plastic
>    cylinder (about 1/3 of the plinth's width, a bit taller than wide) with a thick rounded rim, filled
>    about 3/4 with slime, which is seen and refracted through the pot's wall. In the pot the slime is still: no gravity flow, only a soft jiggle and dent
>    when poked.
> 2. Spill: drag the pot sideways to tip it over (also a "Spill" button). As it tips, the slime pours
>    out of the mouth as one connected thick stream, and the pot disappears (shrinks and fades) once it
>    is empty. Only from this moment does the slime move under realistic gravity: it slumps, spreads
>    and slowly expands across the plinth, keeps its height a little thanks to viscosity, and reaching
>    the edge it hangs, stretches into thick drips and slowly falls over the edge. It can still be
>    poked, pulled, folded and stretched as in Round 5 while it is on the plinth.
> 3. When more than 50% of the slime's volume has dripped off the plinth, wait 3 seconds, then show a
>    message in the study (same style as the lab's toasts) for 4 seconds:
>    "You spilled all your slime, it's gone! We had to buy you a new one, please take better care of it."
>    Then remove the spilled slime and bring back a fresh full pot standing upright at its default spot
>    on the plinth, popping in with a short bounce. Changing toy or pressing "Reset" also restores it.
> 4. Sounds: a wet glug while pouring, soft squelches as it spreads and slow drip sounds at the edge.
> Keep all other toys, controls and sounds unchanged. Before/after screenshots and a short recording
> of: poke in the pot, tip and pour, spreading, dripping over the edge, the message and the new pot.

**Round 12: animated 3D icons on the toy buttons**
> Follow the round protocol at the top of material-studies/UPGRADE-PROMPTS.md.
> Study 02 Squish, toy picker only (the "Toy" grid in the side panel). Above the name in every toy
> button, add a small animated 3D icon (about 44 px tall) of that toy, so you can tell the toys apart
> at a glance. Each icon is a simplified but recognisable, smooth model of the toy in its real colours
> and finish (for example the bao's pleats, the donut's pink icing and sprinkles, the beaver's bubble,
> the pop-it's coloured domes), lit softly from above-left, on a transparent background, crisp at the
> screen's pixel ratio with no jagged edges. Icons must stay readable at that size: bold shapes, a
> clear silhouette, no tiny detail that turns to noise.
> 1. Idle: a slow, gentle turn or bob, so the grid feels alive but calm.
> 2. Hover (and keyboard focus): a short animation that fits that toy, for example the bao squishes
>    and springs back, the mochi wobbles, the iced donut spins, the jelly donut squirts a drop of jam,
>    the axolotl wiggles its gills, the capybara blinks, the bubble beaver blows its bubble, the
>    mesh grape ball bulges through its net, the cracking ball cracks then re-coats, the slime droops,
>    the pop-it pops a dome, the fluffy monster ruffles its fur.
> 3. Click: a quick squash-and-stretch press with a soft bounce, then the toy is selected as now. The
>    selected button's icon keeps a faint glow.
> Build each icon from the toy's own model and materials (simplified, but the same shape and
> colours, so the icon always matches the toy), rendered at 2x the button's pixel size and scaled
> down for clean edges. Render all icons with one shared offscreen renderer (not one WebGL context per button), draw only
> the icons that are on screen, and pause the idle loop when the panel is hidden, so the main study
> keeps 60 fps. With prefers-reduced-motion, show still icons with no animation. Cover every toy that
> exists when this round is run, and make adding a new toy's icon a single entry. Keep the buttons'
> labels, layout, keyboard use and screen-reader names working. Before/after screenshots of the
> panel, plus a short recording of hover and click on three icons.

**Round 13: slime without the pot: a cohesive mound that spreads slowly**
> Follow the round protocol at the top of material-studies/UPGRADE-PROMPTS.md.
> Study 02 Squish, Slime only. Replaces the pot from Round 11; keep the Round 10 look. What's wrong
> now (see material-studies/refs/slime-bug-pot.jpg): the frame rate is poor and drops further during
> the spill, which also looks glitchy; the slime pokes out through the pot's walls as it tips; the
> spill lands on one side of the plinth, so most of it pours off straight away; it is far too runny
> and drips away too quickly; and it breaks apart too easily.
> 1. Remove the pot completely: the pot mesh, tipping, the "Spill" button and any code only they use.
> 2. Start state: the slime sits in the centre of the plinth as one soft, amorphous mound with real
>    height (about a third as tall as it is wide), slightly irregular, thickest and most bunched
>    together in the middle. Reset brings this mound back.
> 3. Cohesion: the slime's particles attract each other; its natural state is to stay together as one
>    body. Model cohesion/surface tension in the simulation (for example an attractive term between
>    neighbours in MLS-MPM or SPH) on top of high viscosity and elasticity. Pulling stretches it into
>    thick strands and sheets that neck down slowly; it only breaks under a very, very strong stretch
>    (several times its length). Released strands pull back towards the body.
> 4. Viscosity: much more viscous than now. Under gravity alone, the mound slowly gets shorter and
>    wider, spreading evenly in all directions, with only small random variations from friction
>    differences across the wood. Rough timing at normal speed: about 20-30 s to lose half its height,
>    about 1-2 minutes to reach the plinth edge all round.
> 5. Long term: it keeps spreading until it covers the whole top of the plinth evenly. As the layer
>    on top gets thin, random tears slowly open (cohesion losing to gravity): small holes with rounded,
>    slightly raised rims that widen slowly, never instant gaps.
> 6. The edge: slime doesn't fall off the moment it reaches the rim. It builds up into a rounded,
>    bulging bead along the edge, held there by viscosity and cohesion; only when enough weight and
>    volume collect does it start to roll over, in thick slow curtains and drips on all sides, coating
>    the plinth's side wall and gathering into hanging drips at the bottom that stretch before letting go.
> 7. Real physics throughout: volume is conserved, nothing passes through the plinth, no particles
>    fly off or stick out of the surface, and spreading is driven only by gravity, cohesion,
>    viscosity and friction, never by scripted motion.
> 8. When more than 50% of the slime's volume has dripped off the plinth, wait 3 seconds, show the
>    message for 4 seconds: "You spilled all your slime, it's gone! We had to buy you a new one,
>    please take better care of it.", then a fresh mound pops in at the centre with a soft bounce.
> 9. Performance: 60 fps or better on Ultra at 2560x1440 for the whole life of the slime, including
>    full spread, tears and dripping (simulation on WebGPU compute with fixed substeps and a bounded
>    particle count; the surface render must not rebuild in ways that stall frames). Measure fps at
>    0 s, 10 s, 30 s, 60 s and 120 s and while pulling, and report all of them. Add a hidden debug
>    time-scale (only with ?debug) so you can fast-forward to check the late stages.
> Keep poke, pull and fold working. Contact sheet: the mound at 0 s, spreading at 30 s, reaching the
> edge, edge bead, first spill, tears on top, the sides coated, plus a short recording of a strong
> pull and a gentle pull.

**Round 14: slime back to the original physics, then improve it step by step**
> Follow the round protocol at the top of material-studies/UPGRADE-PROMPTS.md.
> Study 02 Squish, Slime only. The last three slime rebuilds (commits c03978f, ee73434 and 01e7e28)
> made the physics worse: the fluid falls apart, runs off and drops the frame rate. Restore the slime's
> original simulation and interaction code from commit 6fcdca4 (the version before c03978f), and remove
> the MLS-MPM fluid, pot and mound code. Keep the Round 10 gel shading (thickness colour, refraction,
> highlights) if it works on the restored surface without making it worse; otherwise keep the original
> look. Then improve the original soft body in small steps, and stop after each step to show me a short
> recording and wait for my OK before the next:
> 1. Plasticity: stretches and folds slowly stay instead of springing fully back, like real slime.
> 2. Slow sag: under gravity it slowly gets lower and wider over time, staying one connected piece.
> 3. Edge drips: where it hangs over the plinth edge, thick slow drips form and stretch before letting go.
> 4. Shadows: a soft, slightly green-tinted shadow that matches its real shape, darkest and sharpest
>    where it touches the plinth, with no blocky, jagged, striped or flickering edges and no light
>    leaking under it.
> It must never tear apart, poke through the plinth or show folds cutting through themselves, and it
> keeps 60 fps on Ultra at 2560x1440 throughout.

**Round 15: resolution and smoothness everywhere (all studies)**
> Follow the round protocol at the top of material-studies/UPGRADE-PROMPTS.md.
> All studies. Everything still looks low resolution, and things that should be round or amorphous
> (toys, slime, jam, pebbles, trees, boats, people) still show sharp edges and flat facets. WebGL can
> render this smoothly; find out why ours doesn't and fix it at the cause.
> 1. Diagnose and report first: for every study on Ultra, print the canvas's drawing-buffer size next to
>    its CSS size x devicePixelRatio; they must match (adaptive quality may never lower it on Ultra), and
>    check that browser zoom and Windows display scaling aren't shrinking it. Report MSAA samples, the
>    post-processing chain, texture filtering and the shadow map size in use.
> 2. Image quality: full device pixel ratio on Ultra, 4x MSAA on the HDR target plus SMAA or TAA,
>    16x anisotropic filtering and mipmaps on every texture, no blurry upscaling.
> 3. Geometry: make a list of every mesh in every study with its triangle count and its longest
>    triangle edge in screen pixels at the closest zoom. Any curved or amorphous surface with an edge
>    longer than about 1-2 pixels on its silhouette gets more density (higher segment counts, GPU
>    subdivision, PN triangles or adaptive tessellation) and smooth normals; never flat shading on
>    anything meant to be round. Deforming surfaces recompute smooth normals every frame. Fluids and
>    jam use a fine enough surface grid plus normal smoothing so no stair-steps or bumps show.
> 4. Shadows: tight shadow-camera fit per study, PCSS soft edges, contact shadows, and no blocky,
>    aliased or flickering shadow edges anywhere.
> 5. Prove it: closest-zoom close-ups of every toy and of 10 objects in each diorama, before and after,
>    plus the mesh list with the before and after edge lengths, and fps per study on Ultra.

**Round 16: jelly donut jam, edge and reflections**
> Follow the round protocol at the top of material-studies/UPGRADE-PROMPTS.md.
> Study 02 Squish, Jelly donut only. See material-studies/refs/jelly-bug-edge.webp (circled):
> 1. Where the jam pool reaches the plinth edge, a flat grey sheet sticks out past the rim and a
>    bright red smear and a mirror-like reflection appear along the edge. Remove the cause: no
>    reflection plane, mirrored copy, helper mesh or debug surface of the jam may ever show. Nothing
>    renders beyond the rim unless jam has really flowed over it, and then it drapes over the edge as
>    connected jam following the plinth's side.
> 2. The pool looks like flat black-brown tar with a scalloped, bumpy outline of particle circles. Make
>    it look like real red jam (see the Material library): deep red where thick, brighter and see-through
>    where thin, glossy with sharp highlights, a smooth rounded edge where it meets the wood, and a soft
>    red-tinted contact shadow.
> 3. No harsh, mirror-like or misplaced reflections on the jam or on the plinth around it: reflections
>    match the studio lights and the jam's real shape.
> Keep how the jam squeezes out of the hole and pools. Close-ups at the edge from four angles, before
> and after, plus a short recording of a squeeze that reaches the edge.

**Round 17: cracking ball, glass-like cracks and clean shading**
> Follow the round protocol at the top of material-studies/UPGRADE-PROMPTS.md.
> Study 02 Squish, Cracking ball only. See the current bugs in material-studies/refs/cracking-ball-bug-1.webp,
> -2.webp, -3.webp, -4.png and -5.webp; compare with the real ball in cracking-ball-ref-1.png and -2.webp.
> 1. Half shades: some cells between the cracks show grey, see-through or half-lit patches, the white
>    filling is shaded grey in places, and there are dark smudgy bands near the bottom. Fix the cause
>    (sorting/transparency between shell and filling, overlapping or coplanar surfaces, normals,
>    shadow bias), don't hide it. The filling is an opaque, glossy white gel with a faint blue tint,
>    evenly lit with soft shading; every shell flake is fully opaque chocolate; nothing flickers.
>    Also (bug-5): the shell's highlight is smeared and wobbly, as if the surface were dented or the
>    normals were bent across the cracks. Every shard keeps the clean curvature of the original
>    sphere, so reflections stay crisp and continuous across neighbouring shards, only offset slightly
>    where a shard has tilted.
> 2. Cracks: the current even net of white lines looks like a pattern drawn on the ball. Make it break
>    the way a hard glossy shell or glass really does when pressed:
>    - from the press point outward: long radial cracks that branch and fork, joined by concentric
>      ring cracks, so the shards near the press are small and angular and get larger further away,
>      and areas far from the press stay whole or have only a few long hairline cracks;
>    - sharp, straight-ish fracture edges with occasional slight curves, irregular angles, never
>      rounded blobs or same-sized cells; fine hairline cracks that don't open yet;
>    - never long wavy, looping or cursive-looking white lines like in bug-5, and no uniform
>      honeycomb of cells like in bug-1 to bug-4; the filling showing through a crack is a thin,
>      slightly uneven sliver that follows the crack's straight edges, with no blobby ridges;
>    - shards have real thickness: their broken edges show a thin, slightly lighter cross-section
>      that catches the light;
>    - cracks open gradually under pressure: hairlines first, then gaps widen and the white filling
>      bulges up through them, wider where it is squeezed harder; a second squeeze somewhere else
>      starts a new crack centre there;
>    - a crisp crackling sound with little ticks as each crack runs.
>    - squeezing must never hide the shell: today the brown shards (and their edges) vanish while
>      the ball is squeezed and reappear on release. The shards stay visible the whole time, riding
>      on the filling: they tilt, part and close, and once cracked a shard never heals or fades.
>      Fix the cause (for example shards drawn from the rest shape, clipped, culled or sorted behind
>      the filling while it deforms), and check it frame by frame through a slow squeeze and release.
> 3. How to build it (suggested): generate the fracture at the press point from radial and concentric
>    crack lines on the sphere (randomised angles, branching, spacing growing with distance), cut the
>    shell into separate shard meshes with real thickness and a small bevel on the broken edges, and
>    attach each shard rigidly to the filling's soft-body surface at its centre so it rides, tilts and
>    parts without bending. The filling is its own opaque mesh just inside the shell. Draw shell and
>    filling as opaque surfaces with correct depth (no transparency sorting), and give shards their own
>    shadow bias.
> 4. Keep the smooth, glossy whole ball at rest, the Re-coat control and everything else.
> Before/after close-ups at 2560x1440 from the same four angles as the bug screenshots, plus a short
> recording of a first press and a second press elsewhere.

**Round 18: pop-it as a regular board**
> Follow the round protocol at the top of material-studies/UPGRADE-PROMPTS.md.
> Study 02 Squish, Pop-it only. The current pop-it (material-studies/refs/popit-current-tetris.webp)
> is a Tetris puzzle tray. I don't want that: the Tetris references were only to show how the pops
> work. Replace it with a regular, classic pop-it:
> 1. One single moulded silicone sheet: a rounded square about the size of the other toys, with a
>    thin raised rim and soft rounded corners, and a 6 x 6 grid of domes. Each row is one rainbow
>    colour (red, orange, yellow, green, blue, purple), blending softly where rows meet, like the
>    common rainbow pop-it. No tray, no separate pieces, no seams between pieces, no dragging pieces
>    out and no "Shuffle".
> 2. Keep how the pops work from the Tetris references (popit-tetris-ref-*.jpg): pressing a dome
>    snaps it through into a concave dimple that stays pushed in, with a crisp pop sound; flipping
>    the board shows the underside, where pushed-in domes now stand up and can be popped back. Keep
>    a "Flip" control and add "Reset" to pop every dome up again.
> 3. Material: soft matte silicone with a faint sheen, slightly translucent at the thin dome walls,
>    a rounded crease where each dome meets the flat sheet, and a soft contact shadow on the plinth.
>    The sheet bends slightly when pressed near its edge.
> 4. Each dome is bistable: pressing it squashes the dome, then it snaps through to the dimple in
>    about 60 ms with a tiny overshoot; the neighbouring sheet dips with it. Pop pitch varies a little
>    per dome, and popping a whole row fast sounds like a quick run of pops.
> 5. Dense geometry: no faceting on domes, creases or corners at the closest zoom.
> Look up photos of a classic square rainbow pop-it (search the web) and use them as the reference for
> proportions, dome size and spacing, rim height and colour blending; save the ones you use to
> material-studies/refs/popit-classic-*.jpg.
> Remove the Tetris-only code, and keep the icon (Round 12) and teaser entry for the pop-it working.
> Before/after screenshots: at rest, half the domes popped, and flipped.

**Round 19: re-check everything I've asked for so far (Squish)**
> Follow the round protocol at the top of material-studies/UPGRADE-PROMPTS.md.
> Study 02 Squish, all toys. Many earlier rounds were "done" but don't reach the quality I asked for.
> Go through every request below, check it with your own shots and interactions, and fix every one
> that isn't fully met. Make a checklist in the contact sheet: request, how you checked it, before,
> after, pass or fail.
> 1. Every toy rests on the plinth: never floating, sinking or z-fighting, at rest and squeezed.
> 2. No faceting, kinks or polygon steps on any silhouette at the closest zoom, at rest and squeezed.
> 3. Clean shadows: no acne or striping (bao pleats, donut icing, capybara fur), soft contact
>    shadows and occlusion under and between every part.
> 4. Jelly donut: everything in Round 16, plus one connected jam stream from the hole at any squeeze
>    angle and single drops that don't slide to the edge on their own.
> 5. Axolotl: soft stubby legs attached to the body, never seen through it.
> 6. Bubble beaver: matches bubble-beaver-ref-*.png; the bubble inflates smoothly with pressure,
>    thins and clears as it grows, and shrinks back; no keyring.
> 7. Slime: the restored soft body from Round 14 with its plasticity, slow sag and edge drips,
>    the gel look, clean soft shadows, one connected piece, at 60 fps the whole time.
> 8. Fluffy monster: fur with no banding or shell stepping at the closest zoom.
> 9. Every toy's material matches the Material library section, under the same studio lighting.
> 10. Naming: the visitor sees "squish.labs" everywhere, never squish.ai or squish.lab.
> Finish with one closest-zoom shot of every toy in a single contact sheet.
> The cracked ball after a few cracks (around 5) on one side, doesn't crack on the other side
> The cracked ball skin should be equally brittle everywhere at the same level regardless
> on number of level of input

## Navigation (do before the Alpine rounds)

**Round N1: hold Shift and scroll to pan**
> Follow the round protocol at the top of material-studies/UPGRADE-PROMPTS.md.
> Studies 03 Alpine and 04 Coast only: holding Shift while scrolling pans the camera across the
> diorama instead of zooming (vertical scroll pans forward/back, horizontal scroll or
> Shift + vertical on a mouse pans left/right), clamped so the diorama never leaves the frame.
> Plain scroll still zooms. Show a one-line hint in each study's caption. Pile and Squish are unchanged.


## 03 Alpine

**Restyle note:** I made a mistake earlier by giving a realistic photo as the reference. Alpine
must look like a **toy ski resort**: the same clean, bevelled, toy-like miniature style as
material-studies/refs/harbor-jelly-closeup.jpg, not a realistic landscape. Ignore the Monte Lussari
photo as a style reference; keep only its layout idea (village and church on top, piste down the front,
gondola from the valley). Start every Alpine round with this note.

**Round 1: rebuild as a toy ski resort**
> Follow the round protocol at the top of material-studies/UPGRADE-PROMPTS.md.
> Study 03 Alpine only. The current Alpine looks bad overall; rebuild its look as a toy ski resort
> in the style of material-studies/refs/harbor-jelly-closeup.jpg: a chunky diorama block with clean
> layered sides, smooth rounded snowy hills and a few stylised peaks (simple faceted or rounded
> shapes, no noisy rock or snow textures), soft pastel-blue shadows in the snow, tilt-shift depth of
> field, strong GTAO and soft contact shadows. Keep the layout idea (village and church on top, a
> piste down the front, gondola from the valley) and keep the existing controls, sounds and
> interactions working. Fewer, bigger, cleaner objects. Every box and roof gets a visible bevel;
> snow is smooth with soft subsurface blue in shadow and a fine sparkle only in direct light; the
> block's sides show clean layered strata like the reference's base. Before/after shots from the
> same three camera presets.

**Round 2: toy village and lifts**
> Follow the round protocol at the top of material-studies/UPGRADE-PROMPTS.md.
> Study 03 Alpine only, toy ski resort style: rebuild the village as chunky toy chalets (bevelled
> walls in warm wood and cream, thick rounded snow caps on roofs, simple window frames that glow
> warmly), a toy church with a rounded bell tower and spire, a bright red toy gondola with big
> windows on a clean cable, chairlift pylons, a snow cannon puffing a plume, and rounded
> lollipop-style snowy fir trees. Every object has rounded edges and contact shadows, and nothing
> floats or sinks into the snow. Before/after shots from the same three camera presets.

**Round 3: toy skiers and pistes**
> Follow the round protocol at the top of material-studies/UPGRADE-PROMPTS.md.
> Study 03 Alpine only, toy ski resort style: chunky toy-figure skiers and snowboarders with bright
> jackets, poles and bent-knee poses that swing on turns, clean ski tracks that slowly fill in, a
> piste with neat groomed lines, coloured slalom gates and safety nets, a lift queue, and people at a
> terrace cafe. Figures are toy-like (rounded, simple faces) but carefully modelled, with no stick
> limbs, and animate smoothly. Before/after shots from the same three camera presets.

**Round 4: sky and time of day**
> Follow the round protocol at the top of material-studies/UPGRADE-PROMPTS.md.
> Study 03 Alpine only, toy ski resort style: soft stylised sky and sun, warm pink alpenglow at
> sunrise and sunset, glowing windows and lamps with bloom at night, and stars. Before/after
> screenshots at 07:00, 12:00, 18:30 and 21:00.

---

## 01 Pile

**Round 0: fix the Shag weave**
> Follow the round protocol at the top of material-studies/UPGRADE-PROMPTS.md.
> Study 01 Pile, Shag preset only: the shag weave renders horribly. Make it look like a real shag
> rug: long, thick, slightly twisted yarn strands that fall over in clumps, with gaps showing the
> backing between clumps, clean strand silhouettes with no shell-layer stepping or banding (more
> shells and/or real strand geometry at this length), proper self-shadowing deep in the pile, and
> brushing that pushes whole clumps over. Before/after screenshots at a low grazing angle and from
> above.

**Round 1: crisp fibres**
> Follow the round protocol at the top of material-studies/UPGRADE-PROMPTS.md.
> Study 01 Pile only: make the fibres crisp at full resolution: Marschner-style strand lighting
> (white primary highlight, tinted secondary highlight, back-lit transmission), self-shadowing so
> lower shells darken under upper ones, per-strand colour and thickness variation, and more shells
> on Ultra. The velvet nap must read clearly when brushed. Before/after screenshots.

**Round 2: construction detail**
> Follow the round protocol at the top of material-studies/UPGRADE-PROMPTS.md.
> Study 01 Pile only: visible woven backing on the underside and edges, a stitched binding tape
> around the border, knotted fringe tassels on the Persian and kilim presets, and a wooden floor
> surface under the sample with grain and a soft reflection. Before/after screenshots.

## Last round: photo-quality live rendering (all studies, no photo mode)

> Follow the round protocol at the top of material-studies/UPGRADE-PROMPTS.md.
> All studies. I don't want a separate photo mode or a button that pauses the scene. I want the live,
> interactive view itself to look like a high-resolution product photo, all the time, while staying at
> 60 fps on Ultra at 2560x1440 on my RTX 4060. If any part of the old photo-mode idea (three-gpu-pathtracer,
> a "Photo mode" or "Save image" button) exists in the code, remove it.
> 1. Light the way a photo studio does, live: physically based materials from the Material library,
>    the procedural studio environment with real softbox shapes in every reflection, image-based
>    lighting plus the key, rim and fill lights, and correct exposure with PBR Neutral tone mapping.
> 2. Add the effects a path tracer would give, in real-time form:
>    - global illumination: screen-space GI or a baked/probe-based indirect light, so colour bleeds
>      softly (a pink toy tints the plinth near it, sunlit walls brighten the street);
>    - reflections: screen-space reflections on glossy and wet surfaces (water, gel, jam, glossy
>      chocolate, polished plinth lip), falling back to the environment map;
>    - shadows: PCSS soft shadows with contact hardening, plus screen-space contact shadows for small
>      gaps, and coloured shadows from translucent materials;
>    - ambient occlusion: GTAO tuned per study so creases and contacts are grounded, never dirty halos;
>    - refraction and thickness for every translucent material (gel, jam, water, clear plastic, bubble).
>    Proven open-source options to consider (check each licence first): three.js's own post-processing
>    (GTAO, SSR, SMAA, TAA), the realism-effects library by 0beqz (SSGI, temporal reflections, TRAA),
>    and the postprocessing library by pmndrs.
> 3. Sharpness: full device pixel ratio, 4x MSAA plus temporal anti-aliasing (TAA/TRAA) so edges and> a
>    thin lines are clean without blur or ghosting on moving objects. When the camera and scene are
>    still, keep accumulating samples over the next frames (temporal supersampling, soft shadows and GI
>    converging) so a still view sharpens to offline quality within about a second, then drop back
>    seamlessly the moment anything moves. No visible noise, shimmering or smearing at any time.
> 4. Camera look: subtle, physically plausible depth of field per study (tilt-shift for the dioramas,
>    a soft close-up falloff for Squish), a gentle vignette, fine film grain or dither to remove banding,
>    and restrained bloom on bright highlights only.
> 5. Budget: keep 60 fps while interacting. If something costs too much, make it cheaper (half-res
>    then upsample, temporal reuse), never remove it silently, and report the GPU time of each effect.
> sharpening and then an interaction staying clean.

## squish.labs launch (after the last round)

"Material Studies" stays the internal codename: the folder and file names (`material-studies/`)
don't change. Everything the visitor sees says **squish.labs**.

**Round L1: rename to squish.labs and reorder the tabs**
> Follow the round protocol at the top of material-studies/UPGRADE-PROMPTS.md.
> In material-studies/index.html: rename the product everywhere the visitor can see it from
> "Material Studies" to "squish.labs" (page title, top-bar brand, captions, any about text). Keep the
> folder and file names unchanged; "Material Studies" is the internal codename. Reorder the tabs to:
> Squish becomes the default study when
> the page opens, and its toy list starts with the Fluffy monster, which is selected by default.
> Keep every study's content, controls and sounds working. Screenshot the top bar and the Squish
> study on first load.

**Round L2: trim the toy list**
> Follow the round protocol at the top of material-studies/UPGRADE-PROMPTS.md.
> Study Squish only: remove these toys completely (button, shape, attached parts, sounds, presets
> and any code only they use): Water-bead ball, Pop-it and Spiky stress ball. Keep the remaining toys exactly
> as they are, in this order: Fluffy monster, Bao bun, Mochi ice cream, Iced donut, Jelly donut,
> Axolotl, Capybara, Bubble beaver, Mesh grape ball, Cracking ball, Slime,. Remove the
> "Rattle" sound voice if only the water-bead ball used it. Also remove the spiky ball from the FLASH
> list in material-studies/teaser.js. Confirm nothing else references the removed toy and that the page has no
> console errors.

**Round L3: landing animation and Start button**
> Follow the round protocol at the top of material-studies/UPGRADE-PROMPTS.md.
> In material-studies/index.html, add a full-screen landing sequence before the studies, inspired by
> the dynamism of Grace Guo's portfolio homepage (https://graceguo.io/). Open that page and study its
> motion: how its blob forms digitally and how it moves. Take inspiration from the feel; don't copy
> its code, assets or exact visuals. But inspect the code to see how it works, if you can.
> Two parts:
> 1. Loading: while the three.js scenes and assets load, a blob assembles itself digitally (points,
>    pixels or particles converging and fusing into a soft form), driven by real loading progress.
> 2. Ready: when loading finishes, the blob relaxes into a looping amorphous glowing blob that keeps
>    changing shape and smoothly animates into the start button. The loop is slightly
>    different from the loading animation and repeats seamlessly.
> Clicking Start transitions smoothly into the Squish study (the blob can morph into the plinth or
> dissolve into the scene). Use WebGL shaders (for example raymarched metaballs or a noise-displaced
> sphere with fresnel glow) at full resolution, 60 fps on my RTX 4060. Respect prefers-reduced-motion
> with a calm static version. The Start button must work with keyboard and screen readers.
> Record before/after screenshots of both states and the transition.
> Stick to the specimen theme that I picked

**Round L3b: landing animation, perfectly smooth at any resolution**
> Follow the round protocol at the top of material-studies/UPGRADE-PROMPTS.md.
> The landing sequence from Round L3 (loading blob, looping blob, Start button, transition into Squish).
> Not one curved or amorphous shape in it may show a sharp edge, corner, flat facet, stair-step or
> jagged outline, in any frame, at any screen size. I'm serious: zero, not "fewer".
> 1. Draw every curved form so it can't facet: the blob and its droplets as ray-marched signed-distance
>    or metaball fields evaluated per pixel (analytic normals, smooth-min blending), or as meshes dense
>    enough that the curve audit passes at 4K; dots and particles as analytic circles or sphere
>    impostors computed per pixel, never small polygons or square points; text and the Start button as
>    crisp vector shapes.
> 2. Render at the full device pixel ratio with anti-aliasing on every edge (MSAA plus an analytic
>    coverage edge in the shader for SDF shapes), no upscaled or low-resolution buffers for anything
>    visible; glow and blur passes may be lower resolution only if they can't create edges.
> 3. Prove it frame by frame: record the whole sequence at 2560x1440 and at 3840x2160, export every
>    10th frame, and run the curve audit's silhouette check on each (straight runs and corners on curved
>    outlines); also look at 400% crops of the blob edge, droplets and the button at the start, middle
>    and end. Zero failures, zero visible facets, no flicker or shimmer between frames.
> 4. Keep it at 60 fps on my RTX 4060 and keep the reduced-motion version just as clean.
> Contact sheet: the 400% crops from both resolutions, before and after, and the audit summary.

**Round L4: get the lab ready for the portfolio (run in THIS lab project)**
> Follow the round protocol at the top of material-studies/UPGRADE-PROMPTS.md.
> In material-studies/index.html, prepare squish.labs to be opened from my portfolio, ritwicdesign.com
> (a Wix site with a custom front end written by Codex). Do only the lab side:
> 1. Deploy the lab as a static site I can link to (Use Vercel and upload a version 
> and access+recreation instructions on GitHub, make lab public, so if anyone wants to create 
> a lab for themselves, they don't have to do all this hard work I did, if this process
> consumes too much energy, then skip github
>    and give me exact steps for anything I must click myself). Suggest a subdomain such as
>    squish.ritwicdesign.com and give me the DNS records to add in Wix.
> 2. Entry hand-off: when the page is opened with `?from=portfolio`, skip the plain fade-in and start
>    with a full-screen fluid that settles into the landing blob and Start button from Round L3, so the
>    portfolio's button transition can flow straight into it. Expose the colours used at that moment as
>    CSS variables so the portfolio can match them.
> 3. If it's embedded in an iframe, post a `squish:ready` message to the parent window when loading
>    finishes, and accept a `squish:start` message.
> 4. Update material-studies/HANDOFF-PORTFOLIO.md with the final live URL and anything that changed.

**Round L5: squish.labs button on ritwicdesign.com (run in your PORTFOLIO project, not here)**
Open Claude Code in your **Portfolio** project folder and paste:
> Read this handoff document first:
> https://github.com/ritwic13-droid/squish-labs/blob/main/material-studies/HANDOFF-PORTFOLIO.md
> Then add the squish.labs button and transition it describes to my portfolio. Look at this project's
> existing code first, reuse its styles and the opal CTA's exact colours, and tell me before changing
> anything outside the top toolbar.
> provide me the link attached to my portfolio as well as the standalone
> prepare a brief about this project similar to other prototypes I have made before and make a similar page about this project with similar CTA format providing justified information about the time and effort it took to create this project. the theme for the squish labs project should be aligned with the project's theme but also sit in alignment with the portfolio's theme
> I don't know what the right place for squish.labs button is on my portfolio, I would assume top nav but I dont want it to get too crowded plus we'll have to sacrifice buttons for the mobile version anyways. find a solution for this problem as I have increased items in the top nav that are all kind of necessary. for the squish.labs buttons all I know is that I want the fluidic button to take user directly to squish.labs deployed website and the brief about squish.labs with its own CTA to take to squish.labs is available as part of the prototypes portion of my portfolio home page. The brief should sit on the left of knight of the realm, the first prototype to be seen by the user. the home page thumbnail for this brief should be the interactive blob that is part of the starting animation on the squish.labs home page
> through the vercel deployment for an analytics page for squish.labs where I want to see what users interact with, how they interact with them, how often they interact with them, what toggles they prefer, what is theyre time spent, what data I can extract from visitors without their permission and without any repurcussions to sell without permission, and where to sell it? what else can I learn from this project about user analytics, user experience. this page should not be accessible in any way through my portfolio or squish.labs, i only want to access it for myself and I should be the only person to be able to access it, give me the link for that and then i will save it in my bookmarks.

--- posted ---

## Verification (after L5; run in THIS lab project)

**Round V1: zero sharp edges on anything that should be curved (whole lab)**
> Follow the round protocol at the top of material-studies/UPGRADE-PROMPTS.md.
> Every study, every toy, every diorama and the landing sequence. Despite all the resolution work,
> curved things still show facets. Example: material-studies/refs/jelly-drop-facets.jpg, where the
> jelly donut's jam drop is a ball of about 20 flat faces with a see-through sliver, and the sugar on
> the dough is blurry, noisy flecks. Resolution adds pixels, not shape: fix the shapes. Goal: zero
> sharp edges on anything meant to be curved or amorphous, checked by a tool, not by eye alone.
> 1. Build material-studies/tools/curve-audit.mjs (reusable, run by every later round), which on the
>    real GPU at 2560x1440 and 3840x2160:
>    a. Geometry audit: walks every scene of every study and every toy in every state (at rest, poked,
>       squeezed, pulled, cracked, spilled), and triggers every interaction so spawned objects exist
>       too (drops, splashes, jam, slime strands, crumbs, sprinkles, bubbles, shards, particles,
>       fur tips, water spray). For each mesh meant to be curved (spheres, capsules, tori, lathes,
>       tubes, cylinders' round sides, metaball and marching-cubes surfaces, deforming soft bodies), it
>       works out the largest size it can reach on screen at the closest camera zoom and checks that the
>       gap between the true curve and its polygons stays under 0.5 pixel (for a circle of radius R px
>       drawn with N segments: R x (1 - cos(pi / N)) <= 0.5). It also flags flat shading, broken or
>       un-smoothed normals, and holes or back faces showing through (like the drop's sliver).
>    b. Silhouette audit: renders each object's outline at the closest zoom, traces it, and flags any
>       straight run longer than 3 pixels or any sudden corner along an outline that should be smooth.
>    c. Report: one row per object (study, toy or diorama, object, state, segments or triangles, worst
>       error in pixels, pass or fail) in material-studies/shots/curve-audit/index.html with a 400% crop
>       of each failure, and a final summary line "curve audit: N objects, F failures".
> 2. Fix every failure at the cause: more segments or adaptive tessellation where it is cheap;
>    sphere impostors (perfectly round per pixel, any resolution) for drops, beads, bubbles and other
>    small round particles; smooth normals everywhere; finer surface grids plus normal smoothing for
>    fluids; and sharp, properly mip-mapped textures (the sugar flecks crisp, not blurry noise).
> 3. Run the audit again until it reports 0 failures in every study and state, then take closest-zoom
>    crops of 20 objects that used to fail, before and after.
> 4. Add the audit to the round protocol's measured checks so it runs in every round from now on, and
>    keep it fast enough (under a few minutes) that it actually gets run.
> Done only when the summary line says 0 failures at both resolutions, at 60 fps on Ultra.
