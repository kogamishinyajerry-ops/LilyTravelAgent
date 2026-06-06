# Dream Design Skill

## Objective

Turn any generated travel roadbook into a custom dynamic web page, not a long text itinerary.

## Input

- `Roadbook` JSON from `/api/generate-roadbook`
- Destination, duration, budget, highlights, daily plans, stops, food, photo tips, reminders

## Output

- Minimal dream title
- D1-Dn floating route nodes
- Three short mood keywords per day
- A glowing route curve
- Three visual highlight chips
- A compact detail panel for the selected day
- A selectable visual template before generation

## Product Rule

The AI writes the trip. The design skill decides what to show, what to hide, and how to turn the trip into a visual roadbook.

## Templates

- `monument`: geometric monument / game-level feeling
- `starlake`: floating lake / glowing route
- `lantern`: warm evening / city walk
- `snowfield`: quiet whitespace / cold shrine
- `neon-city`: cyberpunk neon city / holographic ads / rainy night reflections

### Neon City

- **Visual signature**: 赛博朋克霓虹都市 / 全息广告 / 雨夜倒影
- **Mood pairing**: `neon` + `neon-city` is the canonical pairing
- **When to use**: city destinations with night photography or futuristic feel
- **Implementation notes**: emissive glass, deep blue-violet sky, line-based building outlines, hot pink light accent

## Current Implementation

- Code: `lib/dream-design-skill.ts`
- Page: `components/dream-roadbook.tsx`
- Route: `/dream`

## Recording Angle

I am not asking AI to output a whole web page directly. I first ask AI for structured travel content, then pass that content through a reusable design skill. This makes every generated roadbook feel consistent, visual, and shareable.

## Later Upgrades

- Add more visual templates: island, shrine, desert, snowfield, neon city
- Let users choose mood before generation
- Add motion presets per destination
- Export long image or share page
