# Rootnotes

A private field journal for machine walkthroughs, with online R2 storage and Markdown, text, and PDF attachments.

## Source

- `ui/index.html`: responsive interface, editor, Markdown renderer, and reading room.
- `ui/fonts/`: embedded open-source fonts with their licenses.
- `worker/server.js`: existing storage and upload API.
- `scripts/compose.mjs`: combines the UI, embedded fonts, and server into `worker/index.js`.

Run `bash scripts/build.sh` and `node scripts/validate-artifact.mjs` before publishing. The generated `dist/server/index.js` is a standalone Worker; all required frontend assets are embedded. Site identity and bindings are retained in `.openai/hosting.json`.

The Site's private access gateway protects the library and API. Draft/Published controls organization within this private journal; it does not change who can visit the Site.
