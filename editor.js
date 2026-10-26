/* Designer state and live encoding. No network requests or server storage.
   A revision counter prevents slow encodes or image uploads from replacing newer edits. */
const Editor = (() => {
  const draftKey = 'ifb-designer-draft-v1';
  const textFields = { title: 'edit-title', author: 'edit-author', deck: 'edit-deck', body: 'edit-body' };
  const blank = () => ({ v: 2, title: '', author: '', deck: '', body: '', image: ' '.repeat(3584) });
  let draft = blank();
  let revision = 0;
  let timer;
  let sourceImage = null;
  let imageRevision = 0;
  let imageBusy = false;
  let storageAvailable = true;

  // Restore only the document fields. Original uploaded files never enter localStorage.
  try {
    const saved = JSON.parse(localStorage.getItem(draftKey) || 'null');
    if (saved) {
      const checked = Codec.validate({ ...saved, title: saved.title || 'Untitled' });
      draft = { ...checked, title: saved.title };
    }
  } catch { /* An invalid or unavailable saved draft does not block a new one. */ }

  function countCharacters(text) { return Array.from(text).length; }
  function wordCount(text) { return text.trim() ? text.trim().split(/\s+/u).length : 0; }

  function fillFields() {
    for (const [key, id] of Object.entries(textFields)) $(id).value = draft[key];
    updateCounts();
  }

  function updateCounts() {
    for (const key of ['title', 'author', 'deck']) {
      const amount = countCharacters(draft[key]);
      $(key + '-count').textContent = amount + ' / ' + Codec.limits[key];
      $(textFields[key]).setAttribute('aria-invalid', String(amount > Codec.limits[key]));
    }
    const words = wordCount(draft.body);
    const chars = countCharacters(draft.body);
    $('body-count').textContent = words.toLocaleString() + ' / 4,000 words · ' + chars.toLocaleString() + ' / 32,000 characters';
    $('edit-body').setAttribute('aria-invalid', String(words > 4000 || chars > 32000));
    $('editor-ascii').textContent = draft.image.match(/.{112}/g).join('\n');
  }

  function saveDraft() {
    try {
      // A little room beyond the valid document limit preserves edits awaiting correction.
      if (draft.body.length <= 100000) localStorage.setItem(draftKey, JSON.stringify(draft));
      storageAvailable = true;
    } catch { storageAvailable = false; }
  }

  async function encodeDraft(token) {
    const snapshot = { ...draft };
    try {
      if (imageBusy) throw Error('Processing the image…');
      Codec.validate(snapshot);
      const seed = await Codec.encode(snapshot);
      if (token !== revision) return;
      Bureau.preview(snapshot, seed);
      $('editor-status').textContent = 'SEED READY / ' + seed.length.toLocaleString() + ' characters' + (storageAvailable ? ' / draft saved locally' : ' / browser storage unavailable; save your seed');
    } catch (error) {
      if (token !== revision) return;
      const message = !draft.title.trim() ? 'Add a title to generate your seed.' : error.message;
      $('editor-status').textContent = message;
      Bureau.setDraftMessage(message);
    }
  }

  function changed(immediate = false) {
    revision++;
    clearTimeout(timer);
    updateCounts();
    saveDraft();
    Bureau.preview(draft);
    $('editor-status').textContent = 'RECONSTRUCTING SEED…';
    const token = revision;
    if (immediate) encodeDraft(token);
    else timer = setTimeout(() => encodeDraft(token), 250);
  }

  function resetImageSource() {
    imageRevision++;
    imageBusy = false;
    sourceImage?.close();
    sourceImage = null;
    $('image-upload').value = '';
    $('crop-area').hidden = true;
    $('image-status').textContent = '';
  }

  function convertImage() {
    if (!sourceImage) return;
    draft.image = ImageTools.convert(sourceImage, $('crop-preview'), {
      horizontal: Number($('crop-x').value) / 100,
      vertical: Number($('crop-y').value) / 100,
      zoom: Number($('crop-zoom').value),
      contrast: Number($('image-contrast').value),
      invert: $('image-invert').checked,
      dither: $('image-dither').checked,
    });
    changed();
  }

  async function uploadImage(file) {
    if (!file) return;
    const token = ++imageRevision;
    imageBusy = true;
    changed();
    $('image-status').textContent = 'Processing locally…';
    let bitmap;
    try {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw Error('Choose a PNG, JPG or WebP image.');
      if (file.size > 12 * 1024 * 1024) throw Error('Choose an image smaller than 12 MB.');
      bitmap = await createImageBitmap(file);
      if (bitmap.width * bitmap.height > 40000000) throw Error('Choose an image with fewer than 40 million pixels.');
      if (token !== imageRevision) { bitmap.close(); return; }
      sourceImage?.close();
      sourceImage = bitmap;
      imageBusy = false;
      $('crop-x').value = $('crop-y').value = 50;
      $('crop-zoom').value = $('image-contrast').value = 1;
      $('image-invert').checked = false;
      $('image-dither').checked = true;
      $('crop-area').hidden = false;
      $('image-status').textContent = file.name + ' / adjust the crop above; the symbol preview updates below.';
      convertImage();
    } catch (error) {
      if (bitmap && bitmap !== sourceImage) bitmap.close();
      if (token !== imageRevision) return;
      imageBusy = false;
      $('image-status').textContent = error.message + ' The previous banner has been kept.';
      changed(true);
    }
  }

  $('editor-form').addEventListener('submit', event => event.preventDefault());
  for (const [key, id] of Object.entries(textFields)) {
    $(id).addEventListener('input', () => { draft[key] = $(id).value; changed(); });
  }
  $('image-upload').addEventListener('change', event => uploadImage(event.target.files[0]));
  for (const id of ['crop-x', 'crop-y', 'crop-zoom', 'image-contrast', 'image-invert', 'image-dither']) {
    $(id).addEventListener('input', convertImage);
  }
  $('clear-image').addEventListener('click', () => {
    resetImageSource();
    draft.image = ' '.repeat(3584);
    changed(true);
  });
  $('use-current').addEventListener('click', () => {
    const article = Bureau.readerDocument();
    if (!article) return;
    resetImageSource();
    draft = article;
    fillFields();
    changed(true);
  });
  $('new-draft').addEventListener('click', () => {
    resetImageSource();
    draft = blank();
    fillFields();
    changed(true);
    $('edit-title').focus();
  });
  $('jump-to-seed').addEventListener('click', event => {
    event.preventDefault();
    $('seed-output').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  });
  document.addEventListener('bureau:view', event => {
    if (event.detail === 'design') changed(true);
  });
  fillFields();
  return { wordCount };
})();
