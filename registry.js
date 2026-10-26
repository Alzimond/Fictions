/* OWNER-MANAGED SHORT CODES
   Edit custom-seeds.json by hand; see CUSTOM-SEEDS.txt.
   This reader never registers codes or writes to browser storage/the repository.
   Shared validation is also used by tools/check-registry.cjs before publishing. */
async function validateRegistry(data, codec) {
  if (!data || data.version !== 1 || !data.aliases || typeof data.aliases !== 'object' || Array.isArray(data.aliases)) {
    throw Error('Expected {"version":1,"aliases":{"NAME":"full seed"}}.');
  }
  const entries = Object.entries(data.aliases);
  if (entries.length > 250) throw Error('The registry supports up to 250 codes.');
  const identities = new Map();
  const aliases = Object.create(null);
  for (const [name, seed] of entries) {
    if (!/^[A-Z][A-Z0-9_-]{2,23}$/.test(name) || /^(IFB|V1-)/.test(name)) {
      throw Error('Invalid custom code: ' + name);
    }
    if (typeof seed !== 'string' || !/^IFB[23]\./.test(seed)) {
      throw Error(name + ' must contain a full document seed, never another custom code.');
    }
    const identity = JSON.stringify(codec.validate(await codec.decode(seed)));
    if (identities.has(identity)) throw Error(name + ' duplicates the document assigned to ' + identities.get(identity) + '.');
    identities.set(identity, name);
    aliases[name] = seed;
  }
  return aliases;
}

const Registry = (() => {
  let aliases = Object.create(null);
  let warning = '';
  // Node imports validation only; the browser loads the published text file.
  const ready = typeof window === 'undefined' ? Promise.resolve() : (async () => {
    try {
      const response = await fetch('custom-seeds.json', { cache: 'no-store' });
      if (!response.ok) throw Error('HTTP ' + response.status);
      const text = await response.text();
      if (text.length > 4000000) throw Error('Registry exceeds 4 MB.');
      aliases = await validateRegistry(JSON.parse(text), Codec);
    } catch (error) {
      warning = 'Custom-code registry unavailable: ' + error.message;
      console.warn(warning);
    }
  })();
  async function resolve(input) {
    await ready;
    const name = input.trim().toUpperCase();
    if (Object.hasOwn(aliases, name)) return { seed: aliases[name], alias: name, published: true };
    // Do not silently generate nonsense for a possible code when its registry failed.
    if (warning && /^[A-Z][A-Z0-9_-]{2,23}$/.test(name) && !/^(IFB|V1-)/.test(name)) throw Error(warning);
    return { seed: input, alias: '', published: false };
  }
  return { resolve };
})();
if (typeof module !== 'undefined') module.exports = { validateRegistry };
