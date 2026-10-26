# Editing recovered transmissions

This directory is the editorial source. The website's cards are generated from **every entry in `manifest.json`**, in the order listed. There is no fixed two-article limit and no change to HTML or application JavaScript is needed to add another card.

## Pin a post made in the editor (easiest)

1. Finish the article in DESIGN. Click SAVE SEED below the preview.
2. Rename the downloaded file to `my-post.seed.txt` and place it in this `featured/` folder.
3. Add `{"label":"My card title","seedFile":"my-post.seed.txt"}` to the array in `manifest.json`. Put a comma between entries, but not after the last one. Every entry is pinned; array order is card order.
4. From the site folder run `node tools/build-featured.cjs` (requires Node.js). This validates and reconstructs the saved article, generates its card, and updates `examples.js`, `example-seeds.txt` and `featured/size-report.json`.
5. Upload the changed `featured/` files, `examples.js` and `example-seeds.txt` to the repository. After deployment, reload and click your new card.

To unpin a post, remove its manifest entry and rebuild. Its previously shared full seed still works. Pinning does not assign a short custom code; see `../CUSTOM-SEEDS.txt` for that separate optional step. Do not edit the generated `examples.js` manually.

## Edit an existing article

1. Edit `title`, `author`, `deck`, or `label` in `manifest.json`. `label` is the short card title; `title` is the large article headline.
2. Edit the named body `.txt` file. Separate paragraphs with blank lines. A paragraph beginning `## ` renders as a section heading. The complete text, including these markers, is preserved in the code.
3. Edit the named `.art.txt` file if desired. It must contain **32 rows of 112 cells**, using only ` .:-=+*#`. Spaces are meaningful. Do not trim line endings or trailing spaces within the image rows. All eight tones are available; using all of them is optional.
4. From the site folder run `node tools/build-featured.cjs`. The command validates limits and exact encode/decode round trips, then generates `examples.js`, `example-seeds.txt`, and `featured/size-report.json`.
5. Refresh the local preview. If it is still displaying an older seed in the URL, click the updated recovered card. Old copied codes intentionally keep their original content.

## Add a new article

Create `your-article.txt` and `your-image.art.txt` in this folder. Add an object to `manifest.json`, following this shape (remember the comma between entries):

```json
{
  "label": "A short card title",
  "title": "The actual headline",
  "author": "Author name",
  "deck": "The brief introduction beneath the headline.",
  "body": "your-article.txt",
  "image": "your-image.art.txt"
}
```

Run the build command above. The card, its number, word count, reading time, and encoded content are generated automatically. Reorder the manifest objects to reorder cards. Remove an object to remove its card; previously shared complete codes remain readable.

## Limits and compression

Titles: 150 Unicode code points. Authors: 80. Decks: 300. Body: **4,000 words AND 32,000 code points**, including section-heading syntax. Words are whitespace-separated. Both limits apply, so unusually long words can hit the character limit first. Each image contains 3,584 cells.

IFB3 uses a compact binary envelope, optional three-bit image packing, and an optional frozen vocabulary followed by DEFLATE compression. The encoder compares all four combinations with the older gzip/JSON format and selects the shortest actual code. It does not remove, summarise, or approximate text. The 382-word vocabulary is part of the decoder, not a collection of article templates. Unlisted words, punctuation, case, and Unicode remain exact. **Never change the frozen vocabulary or the numeric decoding rules under an existing format version.**

`tools/draw-banners.cjs` is the optional source for the two illustrated banners; rerunning it overwrites those two `.art.txt` files. You can edit their geometry there, or edit the text art directly and leave that generator alone. `tools/build-featured.cjs` never regenerates artwork.

The website remains static. Building these local source files does not publish anything or require a server account. The displayed documents decode from their complete seeds, rather than looking up these source files at reading time.
