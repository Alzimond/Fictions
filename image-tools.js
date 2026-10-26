/* Local image pipeline: crop first, sample the full banner, then quantize to 8 tones.
   No uploaded image is sent to a server. Only the resulting symbols enter the seed. */
const ImageTools = (() => {
  const columns = 112;
  const rows = 32;
  // A monospace glyph is taller than it is wide. Match the displayed banner's ratio.
  const aspect = (columns * 0.6) / (rows * 1.05);
  const glyphs = ' .:-=+*#';

  function cropRect(width, height, zoom = 1, horizontal = 0.5, vertical = 0.5) {
    let cropWidth = width;
    let cropHeight = width / aspect;
    if (cropHeight > height) {
      cropHeight = height;
      cropWidth = height * aspect;
    }
    cropWidth /= zoom;
    cropHeight /= zoom;
    return {
      x: (width - cropWidth) * horizontal,
      y: (height - cropHeight) * vertical,
      width: cropWidth,
      height: cropHeight,
    };
  }

  function quantize(rgba, { contrast = 1, invert = false, dither = true } = {}) {
    const luminance = new Float32Array(columns * rows);
    for (let i = 0; i < luminance.length; i++) {
      const p = i * 4;
      const light = (0.2126 * rgba[p] + 0.7152 * rgba[p + 1] + 0.0722 * rgba[p + 2]) / 255;
      // Dense dark glyphs represent dark pixels on the bright phosphor panel.
      let density = 1 - light;
      if (invert) density = 1 - density;
      luminance[i] = Math.max(0, Math.min(1, (density - 0.5) * contrast + 0.5));
    }
    let image = '';
    function diffuse(x, y, error) {
      if (x >= 0 && x < columns && y < rows) luminance[y * columns + x] += error;
    }
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < columns; x++) {
        const value = Math.max(0, Math.min(1, luminance[y * columns + x]));
        const level = Math.round(value * 7);
        image += glyphs[level];
        if (dither) {
          const error = value - level / 7;
          diffuse(x + 1, y, error * 7 / 16);
          diffuse(x - 1, y + 1, error * 3 / 16);
          diffuse(x, y + 1, error * 5 / 16);
          diffuse(x + 1, y + 1, error / 16);
        }
      }
    }
    return image;
  }

  function convert(source, canvas, options) {
    const crop = cropRect(source.width, source.height, options.zoom, options.horizontal, options.vertical);
    const context = canvas.getContext('2d');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(source, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
    const sample = document.createElement('canvas');
    sample.width = columns;
    sample.height = rows;
    const small = sample.getContext('2d', { willReadFrequently: true });
    small.fillStyle = '#fff';
    small.fillRect(0, 0, columns, rows);
    small.drawImage(source, crop.x, crop.y, crop.width, crop.height, 0, 0, columns, rows);
    return quantize(small.getImageData(0, 0, columns, rows).data, options);
  }

  return { cropRect, quantize, convert, columns, rows };
})();
if (typeof module !== 'undefined') module.exports = ImageTools;
