/* Run before uploading custom-seeds.json:
   node tools/check-registry.cjs
   Optional: node tools/check-registry.cjs path/to/previous-custom-seeds.json
   The optional previous file also protects every already-published assignment. */
const fs = require('node:fs');
const path = require('node:path');
const Codec = require('../codec.js');
const { validateRegistry } = require('../registry.js');
(async () => {
  const current = JSON.parse(fs.readFileSync(path.join(__dirname, '../custom-seeds.json'), 'utf8'));
  // JSON.parse accepts duplicate keys, so check the raw name occurrences as well.
  const raw = fs.readFileSync(path.join(__dirname, '../custom-seeds.json'), 'utf8');
  const keys = Array.from(raw.matchAll(/"([A-Z][A-Z0-9_-]{2,23})"\s*:/g), match => match[1]);
  if (new Set(keys).size !== keys.length) throw Error('Duplicate code name in JSON.');
  const aliases = await validateRegistry(current, Codec);
  if (process.argv[2]) {
    const previous = await validateRegistry(JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), Codec);
    for (const [name, seed] of Object.entries(previous)) {
      if (aliases[name] !== seed) throw Error('Previously published code changed or removed: ' + name);
    }
  }
  console.log('PASS: ' + Object.keys(aliases).length + ' valid, unique custom-code mappings.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
