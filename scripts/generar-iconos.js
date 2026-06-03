const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const input = path.join(__dirname, '..', 'public', 'icons', 'icon-source.png');

async function generar() {
  await sharp(input).resize(192, 192).png().toFile(path.join(__dirname, '..', 'public', 'icons', 'icon-192.png'));
  console.log('✅ icon-192.png generado');

  await sharp(input).resize(512, 512).png().toFile(path.join(__dirname, '..', 'public', 'icons', 'icon-512.png'));
  console.log('✅ icon-512.png generado');

  await sharp(input).resize(32, 32).png().toFile(path.join(__dirname, '..', 'public', 'favicon-32.png'));
  console.log('✅ favicon-32.png generado');

  await sharp(input).resize(180, 180).png().toFile(path.join(__dirname, '..', 'public', 'icons', 'apple-touch-icon.png'));
  console.log('✅ apple-touch-icon.png generado');
}

generar().catch(console.error);
