# Gen Z HTB

An independent public walkthrough collection for Hack The Box machines and TryHackMe rooms. The interface keeps the field-journal design, an interactive machine illustration, platform indexes, filters, and dedicated reading-guide pages.

Live site: https://denterprise25.github.io/genz-htb/

## Build and preview

Requires Node.js 22 or later. No package installation is needed.

```sh
npm run build
npm test
npm run preview
```

Open http://localhost:4175/. The build creates real static routes for `/machines/`, `/hack-the-box/`, `/tryhackme/`, and `/machines/<slug>/`. Relative base paths support the GitHub Pages project prefix and direct page reloads. Generated HTML directories are ignored by Git; edit `ui/index.html` as the shared template.

After building, you can also open `ui/index.html` directly from Finder. The committed `ui/data/site-data.js` bundle supplies the content without a local web server or a cross-origin JSON request. `ui/site-runtime.js` resolves local directory links to `index.html`, including nested machine routes and query filters; hosted links keep their clean URLs. Rebuild after editing JSON or the shared template so the bundle and generated pages stay current. The preview server remains useful for checking the same HTTP behaviour as the deployed site.

`npm test` checks local data consistency, file navigation, nested route assets and metadata, and build behaviour with unsafe content or invalid input. `npm run validate` runs the build and these checks together.

## Content

`ui/data/machines.json` currently contains 23 Hack The Box beginner learning routes: free and premium-documented Starting Point labs plus retired machines included with VIP+ or PRO. Each route is an independently written, on-page field guide with access labels, source credits, safe reconnaissance examples, reading progress, and relevant visual explanations. Current lab availability can change; confirm the access badge in your own HTB account.

For future records, use a unique ID and platform-prefixed slug, title, platform, OS, difficulty, summary, tags, publication date (`updated`), author, source title/URL, reading time, and official lab link. Keep unknown difficulty as `Not rated`.

`ui/data/learning-notes.json` and `ui/data/visual-contexts.json` are currently empty objects. Notes must refer to a current machine slug; the build rejects orphan content.

`ui/data/visual-contexts.json` places concept animations beside the relevant learning topic on each machine page. Each slug maps to an ordered array of `{ concept, topic, title, context, why, relation }`. Supported concepts are `nmap`, `john`, `wireshark`, `firewall` (Packet checkpoint), `vault` (Cipher vault), `privesc`, and `hashcat`. Set `topic` to one of the machine's existing tags. Use `relation: "guide"` only when the article's topic supports it; `"background"` marks an additional explanation rather than a tool attributed to the author. Empty arrays are valid when there is no accurate fit. The build rejects unknown slugs or topics, duplicate concepts, incomplete text, and invalid relations.

This is a static public collection; browser preferences only remember grid/list layout. Publishing new content means updating these JSON files and rebuilding. No upload or authentication backend is included.

## Interface and deployment

- `ui/index.html`: shared page shell and original machine illustration.
- `ui/pages.css`: platform indexes, reading pages, and mobile navigation.
- `ui/animations.css`: phase emphasis, machine motion, entrances, hover/focus, and reduced-motion support.
- `ui/concept-animations.css` and `ui/concept-animations.js`: reusable animations for all seven concepts. Each instance has three manual stages and Play/Pause, starts paused, suspends offscreen, inside closed details, or in a hidden tab, and uses manual stages when reduced motion is enabled. SVG IDs, classes, and keyframes are isolated so multiple illustrations can share a page.
- `ui/concept-assets.js`: generated classic-script SVG templates, so illustrations work without runtime network requests.
- `scripts/concept-sources/`: editable SVG artwork; regenerate the asset bundle with `node scripts/build-concept-assets.mjs`.
- `ui/learning-visuals.js`: the home-page concept picker and relevant animations beside machine learning topics.
- `ui/app.js`: navigation, filtering, rendering, section links, and reading progress.
- `ui/site-runtime.js`: direct-file link normalization and explicit support for links rendered later.
- `ui/data/site-data.js`: generated classic-script data bundle for both local and hosted browsing; never edit it by hand.
- `ui/art.js`: decorative SVG illustrations.
- `scripts/build-pages.mjs`: validates the machine records, notes, and animation contexts, then generates the data bundle and routes.
- `scripts/test-local-site.mjs`: regression checks for direct-file browsing, metadata, and safe builds.

Pushing to `main` runs `.github/workflows/deploy.yml`: it generates the routes and deploys `ui/` to the existing GitHub Pages site. The old `.openai/hosting.json` belongs to a separate Rootnotes project and is not used for this deployment.
