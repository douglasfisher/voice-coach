#!/usr/bin/env node

/**
 * Generate branded app icons and splash screen assets for Dialectica.
 *
 * Produces:
 *   assets/icon.png          – 1024x1024  iOS app icon
 *   assets/adaptive-icon.png – 1024x1024  Android adaptive icon (transparent bg, extra padding)
 *   assets/splash-icon.png   – 1024x1024  Splash screen (monogram + wordmark + underline)
 *   assets/favicon.png       –   48x48    Web favicon
 *
 * Usage:  node scripts/generate-icons.js
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// ── Brand tokens ────────────────────────────────────────────────────────────
const BG = '#0F0F12';
const FG = '#F5F5F7';
const ACCENT = '#F59E0B';
const ASSETS = path.resolve(__dirname, '..', 'assets');

// ── SVG builders ────────────────────────────────────────────────────────────

/**
 * Stylized serif "D" monogram with amber accent notch across the stem.
 *
 * @param {number} size  Canvas size (square)
 * @param {object} opts
 * @param {number} opts.padding  Extra inset ratio (0-1) for safe-zone compliance
 */
function buildMonogramSvg(size, { padding = 0.15, cutoutColor = BG } = {}) {
  const inset = size * padding;
  const w = size - inset * 2;
  const h = size - inset * 2;
  const ox = inset; // origin x
  const oy = inset; // origin y

  // D letter proportions relative to bounding box
  const stemW = w * 0.18;
  const serifH = h * 0.06;
  const serifExt = w * 0.06;

  // Main stem coordinates
  const stemLeft = ox + w * 0.22;
  const stemRight = stemLeft + stemW;
  const letterTop = oy + h * 0.12;
  const letterBot = oy + h * 0.88;

  // Curve control points for the D bowl
  const bowlRight = ox + w * 0.78;
  const bowlMidY = oy + h * 0.5;

  // Amber accent notch position (across upper-middle of stem)
  const notchTop = oy + h * 0.38;
  const notchBot = oy + h * 0.46;
  const notchRight = stemRight + w * 0.04;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <!-- D letter path: stem + serifs + bowl -->
  <path d="
    M ${stemLeft - serifExt} ${letterTop}
    L ${stemLeft - serifExt} ${letterTop + serifH}
    L ${stemLeft} ${letterTop + serifH}
    L ${stemLeft} ${letterBot - serifH}
    L ${stemLeft - serifExt} ${letterBot - serifH}
    L ${stemLeft - serifExt} ${letterBot}
    L ${stemRight + serifExt} ${letterBot}
    L ${stemRight + serifExt} ${letterBot - serifH}
    L ${stemRight} ${letterBot - serifH}
    L ${stemRight} ${letterBot - h * 0.06}
    C ${bowlRight + w * 0.05} ${letterBot - h * 0.15}
      ${bowlRight + w * 0.08} ${bowlMidY + h * 0.15}
      ${bowlRight} ${bowlMidY}
    C ${bowlRight + w * 0.08} ${bowlMidY - h * 0.15}
      ${bowlRight + w * 0.05} ${letterTop + h * 0.15}
      ${stemRight} ${letterTop + h * 0.06}
    L ${stemRight} ${letterTop + serifH}
    L ${stemRight + serifExt} ${letterTop + serifH}
    L ${stemRight + serifExt} ${letterTop}
    Z
  " fill="${FG}" />

  <!-- Inner bowl cutout (hole of the D) -->
  <path d="
    M ${stemRight} ${letterTop + h * 0.14}
    L ${stemRight} ${letterBot - h * 0.14}
    C ${bowlRight - w * 0.08} ${letterBot - h * 0.2}
      ${bowlRight - w * 0.04} ${bowlMidY + h * 0.12}
      ${bowlRight - w * 0.12} ${bowlMidY}
    C ${bowlRight - w * 0.04} ${bowlMidY - h * 0.12}
      ${bowlRight - w * 0.08} ${letterTop + h * 0.2}
      ${stemRight} ${letterTop + h * 0.14}
    Z
  " fill="${cutoutColor}" />

  <!-- Amber accent notch -->
  <rect x="${stemLeft - serifExt * 0.5}" y="${notchTop}" width="${notchRight - stemLeft + serifExt * 0.5}" height="${notchBot - notchTop}" rx="${(notchBot - notchTop) * 0.2}" fill="${ACCENT}" />
</svg>`;
}

/**
 * Splash layout: D monogram centered above "Dialectica" wordmark with amber underline.
 */
function buildSplashSvg(size) {
  const monoSize = size * 0.32;
  const monoX = (size - monoSize) / 2;
  const monoY = size * 0.22;

  const monogramInner = buildMonogramSvg(monoSize, { padding: 0.05 });
  // Strip outer <svg> tag so we can nest it
  const innerContent = monogramInner
    .replace(/<svg[^>]*>/, '')
    .replace(/<\/svg>/, '');

  const textY = monoY + monoSize + size * 0.08;
  const fontSize = size * 0.065;
  const underlineY = textY + size * 0.03;
  const underlineW = size * 0.12;
  const underlineH = size * 0.005;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BG}" />

  <!-- Monogram -->
  <g transform="translate(${monoX}, ${monoY})">
    ${innerContent}
  </g>

  <!-- Wordmark -->
  <text x="${size / 2}" y="${textY}" text-anchor="middle"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="${fontSize}" font-weight="bold"
        letter-spacing="${fontSize * -0.02}"
        fill="${FG}">Dialectica</text>

  <!-- Amber underline -->
  <rect x="${(size - underlineW) / 2}" y="${underlineY}"
        width="${underlineW}" height="${underlineH}"
        rx="${underlineH / 2}" fill="${ACCENT}" />
</svg>`;
}

// ── Asset generators ────────────────────────────────────────────────────────

async function generateIcon() {
  const size = 1024;
  const svg = buildMonogramSvg(size, { padding: 0.15 });
  const svgBuf = Buffer.from(svg);

  await sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: svgBuf, top: 0, left: 0 }])
    .png()
    .toFile(path.join(ASSETS, 'icon.png'));

  return 'icon.png';
}

async function generateAdaptiveIcon() {
  const size = 1024;
  // Android adaptive icons use a 66% safe zone — use more padding so the D isn't clipped
  // cutoutColor transparent so the bowl hole shows the adaptive backgroundColor through
  const svg = buildMonogramSvg(size, { padding: 0.28, cutoutColor: 'transparent' });
  const svgBuf = Buffer.from(svg);

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: svgBuf, top: 0, left: 0 }])
    .png()
    .toFile(path.join(ASSETS, 'adaptive-icon.png'));

  return 'adaptive-icon.png';
}

async function generateSplashIcon() {
  const size = 1024;
  const svg = buildSplashSvg(size);
  const svgBuf = Buffer.from(svg);

  await sharp(svgBuf)
    .resize(size, size)
    .png()
    .toFile(path.join(ASSETS, 'splash-icon.png'));

  return 'splash-icon.png';
}

async function generateFavicon() {
  const size = 48;
  const svg = buildMonogramSvg(size, { padding: 0.1 });
  const svgBuf = Buffer.from(svg);

  await sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: svgBuf, top: 0, left: 0 }])
    .png()
    .toFile(path.join(ASSETS, 'favicon.png'));

  return 'favicon.png';
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Generating Dialectica app assets...\n');

  const generators = [
    generateIcon,
    generateAdaptiveIcon,
    generateSplashIcon,
    generateFavicon,
  ];

  for (const gen of generators) {
    const name = await gen();
    const filePath = path.join(ASSETS, name);
    const meta = await sharp(filePath).metadata();
    console.log(`  ✓ ${name}  ${meta.width}×${meta.height}`);
  }

  console.log('\nDone — all assets written to assets/');
}

main().catch((err) => {
  console.error('Asset generation failed:', err);
  process.exit(1);
});
