const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Codec = require('../codec.js');
const ImageTools = require('../image-tools.js');

(async () => {
  for (const [width, height] of [[100, 100], [400, 100], [100, 400]]) {
    for (const zoom of [1, 4]) {
      const crop = ImageTools.cropRect(width, height, zoom, 1, 1);
      assert(crop.x >= 0 && crop.y >= 0);
      assert(crop.x + crop.width <= width && crop.y + crop.height <= height);
      assert.equal(crop.width / crop.height, 2);
    }
  }
  const white = new Uint8Array(3584 * 4).fill(255);
  assert.equal(ImageTools.quantize(white), ' '.repeat(3584));
  assert.equal(ImageTools.quantize(white, { invert: true }), '#'.repeat(3584));
  const black = new Uint8Array(3584 * 4);
  assert.equal(ImageTools.quantize(black), '#'.repeat(3584));

  const { validateRegistry } = require('../registry.js');
  const document = { v: 2, title: 'Test', author: 'Bureau', deck: '', body: 'A signal.', image: ImageTools.quantize(white) };
  const seed = await Codec.encode(document);
  assert.deepEqual(await Codec.decode(seed), document);
  assert.equal((await validateRegistry({version:1, aliases:{TEST01:seed}}, Codec)).TEST01, seed);
  await assert.rejects(() => validateRegistry({version:1, aliases:{TEST01:seed,TEST02:seed}}, Codec), /duplicates/);
  await assert.rejects(() => validateRegistry({version:1, aliases:{TEST01:'OTHER'}}, Codec), /full document/);
  await assert.rejects(() => validateRegistry({version:1, aliases:{IFB01:seed}}, Codec), /Invalid/);
  await assert.rejects(() => validateRegistry({version:1, aliases:{test01:seed}}, Codec), /Invalid/);
  console.log('PASS: crop bounds; image tones; document round-trip; registry validation; duplicate documents; alias-chain rejection; name rules.');
})().catch(error => { console.error(error); process.exitCode = 1; });
