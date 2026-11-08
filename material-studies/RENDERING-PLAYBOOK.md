# Rendering playbook: getting Material Studies to "product shot" quality

Reference studied: the "Melon Jelly Knife" specimen (Material Studies No. 009) and the
"Harbor Jelly" dioramas from the comparison video. This file describes *techniques* in
our own words; it contains none of their code. Use it as a checklist when upgrading a study.

## Why those pieces look expensive

Fidelity there does not come from one effect. It comes from these layers, all present at once:

1. **A lighting environment designed like a photo studio.** The reference does not use a
   generic environment map. It builds a procedural studio: a pale curved backdrop (cyclorama),
   one big overhead softbox, a thin strip light back-left, and a fill card front-right. Glossy
   surfaces then show crisp, believable streaks of those lights. *Action:* replace
   `RoomEnvironment` with a per-study procedural studio (rounded-rect emissive panels inside a
   gradient sphere), rendered to PMREM.
2. **A deliberate light rig.** The key light sits behind-left and above, so thin edges glow
   toward the camera (rim light through translucent material). *Action:* per study, place key,
   rim and fill on purpose; don't leave the default "sun from front-right".
3. **Soft shadows with variable penumbra.** Shadows are sharp at contact and blur with
   distance (PCSS-style blocker search). Translucent objects cast *tinted* shadows. *Action:*
   PCSS or VSM shadows; tint shadows from translucent materials by their absorption colour.
4. **Contact occlusion under every object.** A top-down height map of the scene darkens the
   floor right where objects touch it. *Action:* a top-down orthographic depth pass ->
   contact-AO term on the floor, plus SSAO for crevices.
5. **Real translucency, not "transmission: 0.9".** Jelly is drawn in two passes: back faces
   first to measure how thick the object is along each view ray, then front faces that
   refract the background, absorb light over that thickness (Beer-Lambert: thicker = deeper
   colour), add scattering, a Fresnel reflection of the studio and a GGX highlight.
   *Action:* for jelly, gel, water, gummy and clear toys, use a thickness pass + Beer-Lambert
   absorption + refraction of a scene-colour texture.
6. **Materials authored per region, in rest space.** Rind, pith and flesh are decided from
   the object's *rest* coordinates, so stripes, seeds and grain stay glued to the material as
   it deforms. Inclusions (seeds, bubbles) are real geometry seen through the jelly.
7. **Physically based soft bodies.** A tetrahedral mesh solved with XPBD (co-rotational
   elasticity + volume preservation + friction), 60 Hz fixed step with substeps. The render
   mesh is skinned to the tets with barycentric weights. This is why deformation reads as a
   real material instead of a surface ripple. Our current spring-on-surface model can't do
   that.
8. **HDR pipeline and a careful tone map.** Render to `rgba16float` with MSAA, then exposure
   -> Khronos PBR Neutral tone mapping -> sRGB -> dither (removes banding in soft gradients).
   The backdrop is lifted so it lands exactly on the page colour.
9. **Framing like a photographer.** The camera fits the object's footprint, and a lens shift
   keeps it centred in the area not covered by text or the panel.
10. **Tiny details that sell scale.** Micro-glints ("sugar crystals"), brushed grain on
    metal, walnut grain and rivets on a handle, one pin-point highlight per bubble.

## Effects checklist (beyond SSAO and bloom)

Ordered by impact for **dioramas** (Alpine, Coast):
- [ ] **Tilt-shift depth of field.** The single biggest "miniature diorama" cue. Blur the top
      and bottom of the frame, keep a horizontal band sharp.
- [ ] Procedural studio environment + per-study light rig (items 1 and 2 above)
- [ ] PCSS soft shadows + contact AO under houses, boats, trees and people
- [ ] Water: depth-based colour and absorption, refraction of the seabed, screen-space
      reflections or a planar reflection, shoreline foam, caustics (already started)
- [ ] Atmospheric perspective: slight haze and colour shift with distance
- [ ] Colour grading (a LUT) + vignette + film grain/dither
- [ ] SMAA or TAA antialiasing on top of MSAA (removes shimmer on thin masts and cables)
- [ ] Higher-detail assets: bevelled edges on every box, window and shutter geometry, roof
      tiles from instanced geometry, rope and cable sag, people with limbs and poses

Ordered by impact for **objects** (Pile, Squish, Tinker):
- [ ] Thickness pass + Beer-Lambert absorption + refraction for any translucent material
- [ ] Subsurface wrap lighting and back-lit edge glow for soft skins and fur
- [ ] PCSS soft shadows + contact AO on the plinth
- [ ] Studio environment so gloss shows softbox streaks
- [ ] HDR + PBR Neutral tone mapping + dither
- [ ] XPBD tetrahedral soft body for squishies (replaces the surface spring mesh)
- [ ] Micro-detail: pores, grain, glints, rest-space material regions

## WebGL vs WebGPU

The reference runs on **WebGPU with hand-written WGSL**. That is what lets it do multi-pass
thickness rendering and a tetrahedral simulation at 60 fps. Two paths for us:
- **Stay on three.js WebGL** and add the passes with `EffectComposer` / render targets. Fastest
  route, gets most of the look.
- **Move a study to three.js `WebGPURenderer` + TSL** (or raw WebGPU) for the heavy cases
  (jelly, water, XPBD). Do this one study at a time, keeping a WebGL fallback.

## How to ask Claude Code for it

Work one study and one layer per round, and verify with screenshots each time. Example:

> Read material-studies/RENDERING-PLAYBOOK.md. In material-studies/index.html, study 05 Coast
> (Italian Riviera only): implement checklist items "procedural studio environment + light
> rig", "PCSS soft shadows + contact AO" and "tilt-shift depth of field". Take before and after
> screenshots and show me the difference. Don't change other studies.

Then the next round:

> Read RENDERING-PLAYBOOK.md. Study 05 Coast: upgrade the water to depth-based absorption,
> refraction of the seabed, planar reflection and shoreline foam. Before/after screenshots.

Tips:
- Image paths need their file extension (`...\Wide-Image-77-1024x683.jpg`, not
  `...\Wide-Image-77-1024x683`). Dragging a file onto the terminal pastes its full path.
- Keep each request to one study; mixing studies dilutes quality.
- Commit after every round you like (`commit this`), so you can roll back.
