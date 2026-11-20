# Living Trail 16-Bit Pixel Asset Pipeline (`scripts/trail-assets/`)

Offline, deterministic, zero-dependency Node.js generator for Typing the Bible v3's internally authored 16-bit pixel-art assets (Story 12.1 / AD-14).

## Why Offline Pre-Baked Indexed PNGs?

- **Zero runtime CPU on theme toggle:** Switching between Editorial Atlas Light (*Golden-Hour Daylight*) and Dark (*Lantern Twilight*) swaps between pre-baked indexed-palette PNG pairs (~600B–1.6KB each) with zero `ImageData` recoloring overhead.
- **100% CSP safe:** All outputs live in `client/public/assets/trail/` (served same-origin under Helmet's `img-src 'self' data:`) with zero external URLs and zero changes to `client/public/index.html`.
- **Single source of truth:** `spriteDefinitions.mjs` defines the 54-color Dual-Theme LUT (verified against `client/src/components/trail/trailPalette.ts`), pixel matrices, and `16×16` SVG lens micro-icons. Running the generator produces byte-identical PNGs, SVG, and `client/src/assets/trail/pixelSprites.ts`.

## Running the Generator

From the repository root (requires Node 22 LTS; zero npm packages needed):

```bash
node scripts/trail-assets/generate-trail-assets.mjs
```

## Generated Outputs

| Output File | Dimensions | Grid / Contents |
| :--- | :--- | :--- |
| `client/public/assets/trail/traveler-michael-{daylight,twilight}.png` | `160 × 24 px` | `10 × 1` frames (`16 × 24 px`): `idle-0..1`, `walk-side-0..3`, `walk-up-0`, `walk-down-0`, `lantern-raise-0..1` |
| `client/public/assets/trail/keepers-phase1-{daylight,twilight}.png` | `64 × 24 px` | `4 × 1` frames (`16 × 24 px`): `genesis-root-keeper-0..1`, `psalms-twilight-psalmist-0..1` |
| `client/public/assets/trail/terrain-tiles-phase1-{daylight,twilight}.png` | `96 × 64 px` | `6 × 4` tiles (`16 × 16 px`): 24 shared terrain, path, creek, garden, porch, fence, foliage & mist veil tiles |
| `client/public/assets/trail/landmarks-phase1-{daylight,twilight}.png` | `160 × 64 px` | `5 × 2` stamps (`32 × 32 px`): Eden Tree (dormant/bloomed), Cedar Herb Bed, Hanging Drying Herbs, Brass Porch Lantern (unlit/lit), Shepherd's Sanctuary Porch, Stone Waypoints (dormant/kindling/bloomed) |
| `client/public/assets/trail/lens-micro-icons.svg` | `48 × 16 px` | 3 crisp `16 × 16` `<symbol>` micro-icons (`#icon-hoodoo-folk`, `#icon-historical-classic`, `#icon-community`) |
| `client/src/assets/trail/pixelSprites.ts` | TypeScript | Typed sprite catalog, atlas paths, frame coordinates, indexed pixel matrices, and `drawPixelMatrixToContext()` |

## Visual & Cultural Guardrails

- All human characters are Black with warm 4-step melanin skin ramps (*Deep Mahogany*, *Rich Chestnut*, *Warm Amber-Bronze*) locked in `trailPalette.ts`.
- Michael's traveler sprite wears clean modern casual attire (terracotta open overshirt, ivory crewneck tee, dark slate tapered jeans, cream-and-terracotta sneakers, crossbody sling bag, glowing brass lantern).
- Pure `#000000` is rejected by the generator; all outlines use warm selective espresso (`#1E1916` Daylight) / obsidian (`#0D0C0E` Twilight).
