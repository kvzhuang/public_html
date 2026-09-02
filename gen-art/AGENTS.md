# Generative Art Workspace Notes

- This directory contains many generative art sketches.
- The homepage currently acts as a portfolio gallery for the sketches in this directory.
- When asked to create a new gen-art idea, create a new project folder under this directory based on the request.
- Use `/home/ubuntu/public_html/gen-art/truchet` as a reference implementation for structure and integration style.
- Preferred creative coding libraries include p5.js, fxhash.js, and anime.js.
- `/home/ubuntu/public_html/gen-art/index.html` is the homepage. After adding a new artwork, add an entry point for it on that homepage.
- Keep multilingual/i18n needs in mind for visible UI text and metadata.
- `nature-particles` must stay seed-driven like other fxhash sketches: do not expose scene category choices such as mountains/clouds/rivers/ocean/aurora to visitors; each page load should derive its scene from the fxhash random seed.

## Homepage Conventions

- The homepage uses a dark gallery layout with cards that link to each project folder.
- Card previews are embedded with iframes, usually using `loading="lazy"`, `sandbox="allow-scripts allow-same-origin"`, and `scrolling="no"`.
- Card entries should include a title, a concise description, and tags.
- The homepage supports four languages through the `?lang=xx` URL parameter: `zh`, `en`, `ja`, and `ko`.
- When adding visible homepage text, update the multilingual data consistently instead of only editing one language.

## New Artwork Checklist

- Create a new project folder under `/home/ubuntu/public_html/gen-art/`.
- Include an `index.html` and the main script file, usually `sketch.js`; add `styles.css` only when it fits the local project structure.
- Match the existing meta and integration style: description, author, Open Graph/Twitter metadata, favicon reference, and the same Google Analytics pattern used by nearby sketches.
- Load libraries from the same style of source used by the reference project: p5.js for canvas sketches, anime.js for DOM/timeline animation, and fxhash when the artwork should be seed-driven.
- If the sketch uses fxhash, route randomness through `fxrand()`, expose meaningful `$fxhashFeatures`, and call `fxpreview()` when the first complete render is ready.
- Make canvas and layout responsive to viewport changes.
- Update `/home/ubuntu/public_html/gen-art/index.html` with a gallery card after the project works directly.

## Reference Projects

- `truchet/`: main structural reference. It uses p5.js, an inline fxhash snippet, seed-driven parameters, palette selection, contrast-aware color choices, and layered drawing.
- `anime-grid/`: anime.js reference. It uses DOM elements, `anime.stagger()`, multiple animation scenes, and a simple control button.
- `chromatic-lattice/`: example of a project with separated CSS and local p5/fxhash assets.
- `dorm-life/`: main reference for the **pixel-art auto-simulation ("Gather Town" style)** family. It renders a top-down pixel world on a raw `<canvas>` (`image-rendering: pixelated`), drives a deterministic world from server time, has a side panel (roster + dialogue log + chat input) and clickable character cards.
- `auto-tower/`, `auto-city/`, `auto-battle/`, `auto-snake/`, `auto-spire/`, `auto-tetris/`: earlier members of the same auto-simulation family (self-running, no fxhash). `auto-tower/` uses `index.php` with server-side PHP i18n.

## Pixel-Art Auto-Simulation ("Gather Town" Style)

Reference the Gather Town「OUR CITY」look: a small top-down pixel town/room populated by named characters that walk, act, and talk on their own. Use these conventions when the request is for this kind of self-running "auto life / auto sim" scene (e.g. `dorm-life`, the `auto-*` family).

- **Deterministic world from server time.** Every visitor must see the *same* frame at the same wall-clock moment. Add a PHP time endpoint (see `dorm-life/time.php`) that returns `{ now: microtime(true), tz: 'UTC' }` with `Cache-Control: no-store`; derive all positions, schedules, and dialogue as a pure function of `(server time + day seed)`. Do not use client `Date.now()` for world state.
- **Deterministic RNG.** Seed everything through the `mulberry32` / `hashStr` / `seeded(...parts)` helpers in `dorm-life/sketch.js` — never `Math.random()` for world state. Use a time-based day scale (e.g. `DAY_SCALE = 240` → one sim day ≈ 6 real minutes) so the world visibly progresses.
- **Raw canvas, not p5.** These sims draw directly to a 2D `<canvas>` context with `image-rendering: pixelated`, a fixed tile size (`TILE = 16`), and a grid-based world (`blocked`, `rooms`, `spot`). Keep the canvas responsive via CSS (`height: 100%; object-fit: contain`).
- **Cache-busting script load.** Load the sketch dynamically with a version query so updates take effect immediately:
  `s.src = 'sketch.js?v=' + Date.now();`
- **Side panel + interaction.** Provide a roster (住戶/角色 list with color dots and current action), a dialogue/activity log, an optional chat input so visitors can talk to the characters, and clickable character cards showing persona description, traits, and relationship bars. See the `#side` / `#charcard` markup in `dorm-life/index.html`.
- **Characters with personas.** Define a `CHARS` array (name, colors, persona key, schedule offsets) plus a `PERSONA_DESC` map (title, description, traits). Keep visible names/text i18n-aware where practical.
- **Metadata & analytics** follow the same pattern as other sketches: `../favicon.svg`, Open Graph/description/author meta, and the shared Google Analytics snippet.

## Implementation Preferences

- Prefer parameterized generation: palettes, grid size, density, stroke settings, and motion timing should be easy to tune.
- Use `noLoop()` for static p5 sketches unless animation or progressive rendering is required.
- Keep random scenes deterministic for fxhash sketches; avoid visitor-facing controls that bypass the seed unless explicitly requested.
- Maintain good color contrast between foreground, strokes, and background.
- Keep comments useful and concise; Chinese comments are acceptable where they match the surrounding code.
