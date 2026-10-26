# Independent Fictions Bureau

Static newspaper generator and live designer. No build step or API key. See GITHUB-SETUP.txt for deployment.

READ reconstructs articles. NEW TRANSMISSION creates a random numeric seed. DESIGN edits the title, author, introduction, banner and article. Image uploads stay on the device: crop, zoom, contrast, inversion and dithering produce 112 x 32 symbols. The finished seed updates live below the preview. Copy its link or seed, or save a file. Drafts are saved in browser storage when available.

Try **DEMO01** in the search bar to open the first full-length recovered article.

## Custom codes (manual only)

The editor creates full document seeds. The owner may assign short names by editing custom-seeds.json. See **CUSTOM-SEEDS.txt** for the exact steps, name rules, validation and preservation of published assignments. There is no editor registration UI and no local alias storage. DEMO01 is already included. Shared registry entries are public and limited to 250.

Full seeds work independently of that file. Long links may be truncated by messaging services; use saved seed files or manual short codes. This version does not generate QR codes. Seeds are not encrypted.

## Pin posts and change archive status

To pin an editor-made article, save its seed in featured/, add a label/seedFile entry to featured/manifest.json and run node tools/build-featured.cjs. Every manifest entry becomes a RECOVERED TRANSMISSIONS card, in array order. Full instructions and examples are in **featured/README.md**.

In index.html, find the **ARCHIVE STATUS** comment. Change ARCHIVE ONLINE to ARCHIVE OFFLINE. A commented-out alternative is included; keep only one active status. This is a display label, not a connection detector or a switch that disables the site.

## Limits

Title: 150 Unicode characters. Author: 80. Introduction: 300. Body: up to 4,000 whitespace-separated words AND 32,000 Unicode characters. Banner: 3,584 cells with eight tones. Only the title is required. Separate paragraphs with blank lines; start headings with `## ` followed by text. Content is rendered as text, never executable HTML.

IFB3 losslessly encodes the full document using a frozen dictionary, packed image cells and compression. Length depends on content; arbitrary prose cannot guarantee a short seed. Featured essays have roughly 13–14 thousand seed characters. IFB2 and legacy v1 remain readable. Numeric seeds decode random noise; other unassigned strings deterministically reconstruct an article. Registered names are checked first. Do not change codec dictionaries or generator rules without versioning them.

## Source map

- index.html: page, editor controls, outlined eight-point star SVG.
- style.css / readability.css / editor.css: layout, typography, editor and final color overrides.
- app.js: reader, navigation, animation and sharing.
- editor.js: draft fields, live encoding, image controls and custom-code UI.
- image-tools.js: crop geometry and eight-tone conversion.
- registry.js / custom-seeds.json: owner-managed published lookup.
- codec.js / legacy.js: stable reconstruction formats.
- reading.js: reading-time calculation.
- featured/: editable essays, artwork and instructions.
- examples.js: generated featured seeds; see featured/README.md to regenerate.
- fonts/: local fonts and required license notices.

The star is independently drawn, inspired by the outlined eight-point star in Xalapa's coat of arms. Reference: https://commons.wikimedia.org/wiki/File:Escudo_de_armas_de_Xalapa.svg

## Preview and checks

With Node.js installed, run `node tools/serve.cjs` from this folder. Open http://127.0.0.1:4173 and stop with Ctrl+C. Use a server rather than double-clicking index.html: registry loading needs HTTP.

Run `node tools/test-codec.cjs` and `node tools/test-editor.cjs`. Tests cover full-length/Unicode round-trips, corrupt payload rejection, determinism, crop bounds, image tones, registry validation and document uniqueness. Use a current browser supporting CompressionStream, canvas and Web Crypto. Preserve font licenses when distributing.
