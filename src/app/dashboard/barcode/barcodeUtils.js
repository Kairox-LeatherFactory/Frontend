// ─── CODE 128B ENCODING ENGINE ───────────────────────────────────────────────
const CODE128B_VALUES = {};
const CODE128B_PATTERNS = {};

(() => {
  const patterns = [
    '11011001100', '11001101100', '11001100110', '10010011000', '10010001100',
    '10001001100', '10011001000', '10011000100', '10001100100', '11001001000',
    '11001000100', '11000100100', '10110011100', '10011011100', '10011001110',
    '10111001100', '10011101100', '10011100110', '11001110010', '11001011100',
    '11001001110', '11011100100', '11001110100', '11101101110', '11101001100',
    '11100101100', '11100100110', '11101100100', '11100110100', '11100110010',
    '11011011000', '11011000110', '11000110110', '10100011000', '10001011000',
    '10001000110', '10110001000', '10001101000', '10001100010', '11010001000',
    '11000101000', '11000100010', '10110111000', '10110001110', '10001101110',
    '10111011000', '10111000110', '10001110110', '11101101110', '11010001110',
    '11000101110', '11011101000', '11011100010', '11011101110', '11101011000',
    '11101000110', '11100010110', '11101101000', '11101100010', '11100011010',
    '11101111010', '11001000010', '11110001010', '10100110000', '10100001100',
    '10010110000', '10010000110', '10000101100', '10000100110', '10110010000',
    '10110000100', '10011010000', '10011000010', '10000110100', '10000110010',
    '11000010010', '11001010000', '11110111010', '11000010100', '10001111010',
    '10100111100', '10010111100', '10010011110', '10111100100', '10011110100',
    '10011110010', '11110100100', '11110010100', '11110010010', '11011011110',
    '11011110110', '11110110110', '10101111000', '10100011110', '10001011110',
    '10111101000', '10111100010', '11110101000', '11110100010', '10111011110',
    '10111101110', '11101011110', '11110101110', '11010000100', '11010010000',
    '11010011100', '11000111010',
  ];

  for (let i = 0; i <= 95; i++) {
    const char = String.fromCharCode(i + 32);
    CODE128B_VALUES[char] = i;
    CODE128B_PATTERNS[i] = patterns[i];
  }
  CODE128B_PATTERNS['START_B'] = patterns[104];
  CODE128B_PATTERNS['STOP'] = patterns[106];
  CODE128B_VALUES['START_B'] = 104;
  CODE128B_VALUES['STOP'] = 106;
})();

export function encodeCode128B(text) {
  const values = [];
  for (let i = 0; i < text.length; i++) {
    const val = CODE128B_VALUES[text[i]];
    if (val !== undefined) values.push(val);
  }
  let checksum = CODE128B_VALUES['START_B'];
  for (let i = 0; i < values.length; i++) {
    checksum += values[i] * (i + 1);
  }
  checksum = checksum % 103;

  let pattern = CODE128B_PATTERNS['START_B'];
  values.forEach((v) => { pattern += CODE128B_PATTERNS[v]; });
  pattern += CODE128B_PATTERNS[checksum];
  pattern += CODE128B_PATTERNS['STOP'];
  pattern += '11';

  return pattern;
}

export function drawBarcodeCanvas(canvas, text, options = {}) {
  if (!canvas) return;
  const { height = 55, moduleWidth = 1.4, padding = 8, showText = true } = options;
  const pattern = encodeCode128B(text);
  const barWidth = pattern.length * moduleWidth;

  canvas.width = barWidth + padding * 2;
  canvas.height = height + (showText ? 18 : 0) + padding;

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#111827';
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === '1') {
      ctx.fillRect(padding + i * moduleWidth, padding / 2, moduleWidth, height);
    }
  }

  if (showText) {
    ctx.fillStyle = '#2C221E';
    ctx.font = `600 11px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(text, canvas.width / 2, height + padding / 2 + 13);
  }
}

export function downloadBarcodePNG(canvas, filename) {
  if (!canvas) return;
  const imageURI = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = imageURI;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
