'use strict';

/* Reader, navigation, visual transitions, and shared seed controls.
   Editing is isolated in editor.js; encoding remains in codec.js. */
const Bureau = (() => {
  const palettes = [['GREEN', '#78ff45'], ['RED', '#ff6868'], ['BLUE', '#619fff'], ['YELLOW', '#ffee3f']];
  const state = { view: 'read', reader: null, readerSeed: '', shareSeed: '', loadToken: 0 };
  let palette = -1;
  try { palette = Number(sessionStorage.getItem('ifb-palette') ?? -1); } catch {}

  function changePalette() {
    const choices = palettes.map((_, i) => i).filter(i => i !== palette);
    palette = choices[crypto.getRandomValues(new Uint32Array(1))[0] % choices.length];
    document.documentElement.style.setProperty('--accent', palettes[palette][1]);
    $('palette').textContent = 'PHOSPHOR: ' + palettes[palette][0] + ' ◉';
    try { sessionStorage.setItem('ifb-palette', palette); } catch {}
  }

  function paintStatic() {
    const symbols = ' .:+*#=/[]';
    const style = getComputedStyle($('static-field'));
    const context = document.createElement('canvas').getContext('2d');
    context.font = style.font;
    const advance = context.measureText('#').width + (parseFloat(style.letterSpacing) || 0);
    const columns = Math.ceil(innerWidth / advance) + 4;
    const rows = Math.ceil(innerHeight / parseFloat(style.lineHeight)) + 2;
    const bytes = new Uint8Array(columns * rows);
    for (let offset = 0; offset < bytes.length; offset += 65536) {
      crypto.getRandomValues(bytes.subarray(offset, Math.min(offset + 65536, bytes.length)));
    }
    let text = '';
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < columns; x++) text += symbols[bytes[y * columns + x] % symbols.length];
      text += '\n';
    }
    $('static-field').textContent = text;
  }

  async function reveal(token) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    $('reconstruction').hidden = false;
    document.documentElement.classList.add('reconstructing');
    paintStatic();
    await new Promise(resolve => {
      let ticks = 0;
      const timer = setInterval(() => {
        if (token !== state.loadToken || ++ticks === 5) {
          clearInterval(timer);
          resolve();
        } else paintStatic();
      }, 110);
    });
  }

  function setShare(seed, message) {
    state.shareSeed = seed || '';
    $('full-seed').value = seed || '';
    $('share-seed').textContent = seed
      ? (seed.length > 90 ? seed.slice(0, 60) + '…' + seed.slice(-12) : seed)
      : 'WAITING FOR A VALID DOCUMENT';
    for (const id of ['copy', 'copy-seed', 'download-seed']) $(id).disabled = !seed;
    $('status').textContent = message || (seed.length.toLocaleString() + ' characters. Same seed, same document. Phosphor may change.');
  }

  function renderDocument(documentData, seed, { design = false, symbolic = false } = {}) {
    const article = documentData;
    for (const [i, item] of EXAMPLES.entries()) {
      $('example-' + i).setAttribute('aria-current', String(!design && item.seed === seed));
    }
    $('category').textContent = design ? 'DESIGN / LIVE PREVIEW' : symbolic ? 'UNFILTERED / SYMBOL SPACE' : 'RECOVERED / COMPLETE DOCUMENT';
    $('title').textContent = article.title || 'Untitled transmission';
    $('deck').textContent = article.deck;
    $('deck').hidden = !article.deck;
    $('author').textContent = article.author || 'UNATTRIBUTED';
    $('issue').textContent = seed ? seed.length.toLocaleString() + ' SEED CHARACTERS / UNDATED' : 'DRAFT / UNDATED';
    $('note').textContent = 'STATUS: RECONSTRUCTED';
    $('figure-label').textContent = 'FIG. 01 / MEMORY SURFACE';
    $('caption').textContent = 'SOMEWHERE, THIS IMAGE ALREADY EXISTS.';
    $('art').textContent = article.image.match(/.{112}/g).join('\n');
    $('body').replaceChildren();
    for (const paragraph of article.body.split(/\n\n/)) {
      const heading = paragraph.startsWith('## ');
      const element = document.createElement(heading ? 'h2' : 'p');
      element.textContent = heading ? paragraph.slice(3) : paragraph;
      $('body').append(element);
    }
    const estimate = Reading.estimate(article.body, symbolic);
    $('reading').textContent = estimate.minutes;
    $('reading').parentElement.title = estimate.explanation;
    document.title = (article.title || 'Design a transmission') + ' — Independent Fictions Bureau';
    if (seed) setShare(seed);
  }

  function showReader() {
    if (!state.reader) return;
    const symbolic = !/^IFB[23]\./.test(state.readerSeed) && !state.readerSeed.startsWith('v1-');
    renderDocument(state.reader, state.readerSeed, { symbolic });
    $('seed').value = state.readerSeed;
  }

  function setView(view) {
    state.view = view;
    $('workspace').setAttribute('aria-labelledby', 'tab-' + view);
    $('full-seed').hidden = view !== 'design';
    const design = view === 'design';
    $('editor-panel').hidden = !design;
    document.querySelector('.examples').hidden = design;
    document.body.classList.toggle('design-mode', design);
    for (const name of ['read', 'design']) {
      $('tab-' + name).setAttribute('aria-selected', String(name === view));
      $('tab-' + name).tabIndex = name === view ? 0 : -1;
    }
    if (!design) showReader();
    document.dispatchEvent(new CustomEvent('bureau:view', { detail: view }));
  }

  function legacyDocument(seed) {
    const article = generate(seed);
    return { v: 2, title: article.title, author: article.name, deck: article.d.deck,
      image: banner(seed).replaceAll('\n', ''),
      body: article.paragraphs.map(p => typeof p === 'string' ? p : p.heading || p.quote).join('\n\n') };
  }

  async function openSeed(seed, historyMode = 'push') {
    const token = ++state.loadToken;
    $('load-status').textContent = '';
    try {
      if (!seed || seed.length > Codec.limits.seed) throw Error('Enter between 1 and 131,072 seed characters.');
      const resolution = await Registry.resolve(seed);
      seed = resolution.seed;
      const article = seed.startsWith('v1-') ? legacyDocument(seed) : await Codec.decode(seed);
      if (token !== state.loadToken) return;
      changePalette();
      await reveal(token);
      if (token !== state.loadToken) return;
      if (historyMode !== 'none') {
        const url = new URL(location.href);
        url.hash = 's=' + encodeURIComponent(seed);
        history[historyMode === 'replace' ? 'replaceState' : 'pushState'](null, '', url);
      }
      state.reader = article;
      state.readerSeed = seed;
      setView('read');
      if (resolution.alias) $('load-status').textContent = resolution.alias + ' / ' + (resolution.published ? 'published custom code' : 'local custom code — not yet published');
      window.scrollTo({ top: 0, behavior: 'instant' });
    } catch (error) {
      if (token === state.loadToken) $('load-status').textContent = error.message;
    } finally {
      if (token === state.loadToken) {
        $('reconstruction').hidden = true;
        document.documentElement.classList.remove('reconstructing');
      }
    }
  }

  function fromHash() {
    const seed = new URLSearchParams(location.hash.slice(1)).get('s');
    openSeed(seed || EXAMPLES[0].seed, seed ? 'none' : 'replace');
  }

  async function copy(text, label) {
    if (!state.shareSeed) return;
    try {
      await navigator.clipboard.writeText(text);
      $('status').textContent = label + ' copied.';
    } catch {
      $('full-seed').hidden = false;
      $('full-seed').focus();
      $('full-seed').select();
      $('status').textContent = 'Clipboard unavailable. The complete seed is selected; use Ctrl+C or Command+C.';
    }
  }

  // Cards are generated from featured/manifest.json. No hardcoded article count.
  for (const [index, item] of EXAMPLES.entries()) {
    const button = document.createElement('button');
    button.id = 'example-' + index;
    const number = document.createElement('span');
    number.textContent = String(index + 1).padStart(2, '0') + ' / ';
    const title = document.createElement('b');
    title.textContent = item.label || item.title;
    const detail = document.createElement('small');
    detail.textContent = item.words + ' WORDS / ' + Reading.fromWords(item.words) + ' MIN READ ↗';
    button.append(number, title, detail);
    button.addEventListener('click', () => openSeed(item.seed));
    $('featured-list').append(button);
  }

  $('random').addEventListener('click', () => openSeed(Codec.fresh()));
  $('seed-form').addEventListener('submit', event => { event.preventDefault(); openSeed($('seed').value); });
  $('palette').addEventListener('click', changePalette);
  $('tab-read').addEventListener('click', () => setView('read'));
  $('tab-design').addEventListener('click', () => setView('design'));
  document.querySelector('[role="tablist"]').addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const view = event.key === 'Home' ? 'read' : event.key === 'End' ? 'design' : state.view === 'read' ? 'design' : 'read';
    setView(view);
    $('tab-' + view).focus();
  });
  $('copy-seed').addEventListener('click', () => copy(state.shareSeed, 'Full seed'));
  $('copy').addEventListener('click', () => {
    const url = new URL(location.href);
    url.hash = 's=' + encodeURIComponent(state.shareSeed);
    copy(url.href, 'Issue link');
  });
  $('download-seed').addEventListener('click', () => {
    if (!state.shareSeed) return;
    const url = URL.createObjectURL(new Blob([state.shareSeed], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bureau-transmission.txt';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    $('status').textContent = 'Seed file saved. Paste its contents into Open Seed to reconstruct this document.';
  });
  window.addEventListener('resize', () => { if (!$('reconstruction').hidden) paintStatic(); });
  window.addEventListener('popstate', fromHash);
  window.addEventListener('hashchange', () => {
    const seed = new URLSearchParams(location.hash.slice(1)).get('s');
    if (seed !== state.readerSeed) fromHash();
  });
  fromHash();

  return {
    isDesign: () => state.view === 'design',
    draftSeed: () => state.view === 'design' ? state.shareSeed : '',
    readerDocument: () => state.reader ? { ...state.reader } : null,
    preview: (article, seed = '') => {
      if (state.view !== 'design') return;
      renderDocument(article, seed, { design: true });
      if (!seed) setShare('', 'Reconstructing the draft seed…');
    },
    setDraftMessage: message => { if (state.view === 'design') setShare('', message); },
  };
})();
