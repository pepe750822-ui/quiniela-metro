const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svg = (size) => {
  const r = Math.round(size * 0.208);
  const cx = size / 2;
  const circleR = Math.round(size * 0.292);
  const circleY = Math.round(size * 0.458);
  const qmSize = Math.round(size * 0.25);
  const qmY = Math.round(size * 0.487);
  const metroSize = Math.round(size * 0.094);
  const metroY = Math.round(size * 0.823);
  const spacing = Math.round(size * 0.021);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" fill="#0a0a0a"/>
  <circle cx="${cx}" cy="${circleY}" r="${circleR}" fill="#ea580c"/>
  <text x="${cx}" y="${qmY}" font-size="${qmSize}" text-anchor="middle" dominant-baseline="middle" fill="#000" font-family="Arial Black,Arial" font-weight="900">QM</text>
  <text x="${cx}" y="${metroY}" font-size="${metroSize}" text-anchor="middle" fill="#ea580c" font-family="Arial,sans-serif" font-weight="700" letter-spacing="${spacing}">METRO</text>
</svg>`;
};

async function generarIconos() {
  const outDir = path.join(__dirname, '..', 'public', 'icons');
  fs.mkdirSync(outDir, { recursive: true });

  for (const size of [192, 512]) {
    await sharp(Buffer.from(svg(size)))
      .resize(size, size)
      .png()
      .toFile(path.join(outDir, `icon-${size}.png`));
    console.log(`✅ icon-${size}.png generado`);
  }
}

generarIconos().catch(console.error);
