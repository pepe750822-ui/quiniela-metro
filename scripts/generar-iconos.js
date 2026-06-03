const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const svg = fs.readFileSync(path.join(__dirname, '..', 'public', 'icons', 'icon.svg'));

async function generar() {
  const outDir = path.join(__dirname, '..', 'public', 'icons');
  fs.mkdirSync(outDir, { recursive: true });

  await sharp(svg).resize(192, 192).png().toFile(path.join(outDir, 'icon-192.png'));
  console.log('✅ icon-192.png generado');

  await sharp(svg).resize(512, 512).png().toFile(path.join(outDir, 'icon-512.png'));
  console.log('✅ icon-512.png generado');

  await sharp(svg).resize(32, 32).png()
    .toFile(path.join(__dirname, '..', 'public', 'favicon-32.png'));
  console.log('✅ favicon-32.png generado');
}

generar().catch(console.error);
