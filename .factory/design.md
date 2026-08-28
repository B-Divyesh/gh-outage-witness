# CI Outage Witness — visual thesis

## Direction: glacial minimal ceramics

The product is an incident receipt, not another live dashboard. Its visual world
borrows from a field researcher laying labelled porcelain samples on glacial
stone: quiet, exact, cold, and physical. Rounded ceramic witness tiles hold the
evidence; thin cobalt registration marks and hairline strata connect each
observation. The surface should feel calm enough to read during an outage while
the small imperfections keep it repository-owned rather than corporate-polished.

## Palette

- `ice-0 #F5F7F4`: warm glacier background.
- `ice-1 #E8EEEC`: recessed bands and code surfaces.
- `porcelain #FCFDFC`: raised evidence surfaces.
- `basalt #172321`: primary text (13.9:1 on `ice-0`).
- `moraine #52615E`: secondary text (6.1:1 on `ice-0`).
- `cobalt #1858B8`: actions and focus (5.8:1 on white).
- `cobalt-deep #103F86`: active actions.
- `lichen #306F5A`: confirmed collection/success.
- `ochre #8B5815`: uncertainty/warning.
- `oxide #A23934`: failed collection/danger.
- Dark treatment uses `#101817` background, `#182321` surfaces, `#EDF3F0`
  text, and `#8DB8FF` action text. Both treatments meet WCAG AA.

Color never carries meaning alone: every state includes a label or symbol.

## Type

- Interface and prose: `Inter`, self-hosted Latin subset, 400/600 variable
  weight. Its open counters keep dense incident prose readable.
- Evidence, commands, timestamps, and tiny labels: `IBM Plex Mono`, self-hosted
  Latin subset, 400 with synthesized emphasis. Tabular numbers make timelines scan cleanly.
- Scale: 14, 16, 20, 28, and clamp(42–72) px; body is 17px with 1.58 leading.
  Long copy is capped at 68 characters.

## Spacing and shape

An 8px base rhythm with 4px for optical adjustments. Section gaps are 80–128px;
evidence rows use 16/24px spacing. Ceramic surfaces use asymmetric 18px/22px
corner radii, 1px blue-grey edges, and restrained directional shadows. The
asymmetry is intentional: each bundle is a captured specimen, not a generic
SaaS card. Touch targets are at least 44px with 8px separation.

## Interaction grammar and motion

Primary actions are cobalt lozenges; secondary actions are underlined text or
porcelain buttons. Focus is a 3px cobalt ring with a 3px ice offset. Hover lifts
ceramic surfaces by 2px and deepens their shadow. On first view, the evidence
strata settle upward over 260ms and the terminal caret blinks only three times.
All motion uses opacity/transform and has a physical source. Under
`prefers-reduced-motion: reduce`, transitions, lifts, smooth scrolling, and the
caret animation are removed; content is immediately present.

## Responsive intent

At 390px the navigation drops nonessential repository chrome, evidence tiles
stack, commands scroll horizontally, and the bundle diagram becomes a vertical
receipt. No information is hidden. Desktop uses offset strata and negative
space to distinguish observation from interpretation.

## Original asset plan and provenance

- `site/public/ceramic-witness.webp` (1280px, 52 KB),
  `site/public/ceramic-witness-800.webp` (800px, 16 KB), and
  `site/public/ceramic-witness-720.webp` (720px, 16 KB): responsive derivatives
  of an original generated hero still life of
  five unlabeled porcelain evidence shards on blue glacial stone, with cobalt
  registration grooves. It clarifies the “separate observations become one
  durable receipt” concept. Generated for this product with the factory image
  generator, then locally resized/encoded to WebP under 300 KB. No embedded
  text, logos, people, or third-party source material.
- UI icons and the small witness stamp are hand-authored CSS/SVG primitives in
  the repository. They are functional marks, not stock assets.

Generation prompt (factory image generator):

> Use case: stylized-concept. Asset type: wide landing-page hero. A minimal
> editorial still life on pale blue glacial stone: five small matte porcelain
> witness shards arranged as a chronological evidence trail, each with a
> single fine cobalt registration groove, one dark basalt pebble suggesting an
> anomaly. Quiet museum documentation, soft overcast side light, tactile
> ceramic grain, restrained shadows, generous negative space around the
> objects, palette of warm white, ice blue, basalt, cobalt. Wide 3:2 framing,
> objects centered-right. No text, no letters, no numbers, no logos, no UI,
> no people, no gradients, no glossy plastic, no watermark.

License: project-original generated artwork, released under the repository MIT
license. Generator deployment: `factory-image` via
`/opt/fleet/lib/gen-image.sh`; generation date 2026-08-28.
