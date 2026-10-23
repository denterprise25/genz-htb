# Gen Z HTB

An independent public walkthrough collection for Hack The Box machines and TryHackMe rooms. The interface keeps the field-journal design, an interactive machine illustration, platform indexes, filters, and dedicated reading-guide pages.

Live site: https://denterprise25.github.io/genz-htb/

## Build and preview

Requires Node.js 22 or later. No package installation is needed.

```sh
node scripts/build-pages.mjs
python3 -m http.server 4175 --directory ui
```

Open http://localhost:4175/. The build creates real static routes for `/machines/`, `/hack-the-box/`, `/tryhackme/`, and `/machines/<slug>/`. Relative base paths support the GitHub Pages project prefix and direct page reloads. Generated HTML directories are ignored by Git; edit `ui/index.html` as the shared template.

## Content

`ui/data/machines.json` contains 18 credited references: 12 HTB machines and 6 TryHackMe rooms. Each record needs a unique ID and explicit platform-prefixed slug, title, platform, OS, difficulty, summary, tags, publication date (`updated`), author, source title/URL, article reading time, and official lab link. Keep unknown difficulty as `Not rated`. Publication dates and reading time describe the referenced article, not the lab's release date or solve duration.

`ui/data/learning-notes.json` contains original `notice` and `reason` reading prompts keyed by the same slugs. Full walkthroughs and screenshots remain on the original authors' Medium pages. When a specific HTB page cannot be confirmed to resolve, its button says `Browse HTB Labs` and opens the official catalog. TryHackMe records link to verified rooms. The Linux Fundamentals guide includes a note about revised room tasks.

This is a static public collection; browser preferences only remember grid/list layout. Publishing new content means updating these JSON files and rebuilding. No upload or authentication backend is included.

## Interface and deployment

- `ui/index.html`: shared page shell and original machine illustration.
- `ui/pages.css`: platform indexes, reading pages, and mobile navigation.
- `ui/animations.css`: phase emphasis, machine motion, entrances, hover/focus, and reduced-motion support.
- `ui/app.js`: navigation, filtering, rendering, section links, and reading progress.
- `ui/art.js`: decorative SVG illustrations.
- `scripts/build-pages.mjs`: validates records and generates the routes.

Pushing to `main` runs `.github/workflows/deploy.yml`: it generates the routes and deploys `ui/` to the existing GitHub Pages site. The old `.openai/hosting.json` belongs to a separate Rootnotes project and is not used for this deployment.
