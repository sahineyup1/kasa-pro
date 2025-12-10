const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputSvg = path.join(__dirname, '../public/icons/icon.svg');
const outputDir = path.join(__dirname, '../public/icons');

async function generateIcons() {
  console.log('Generating PWA icons...');

  // SVG dosyasini oku
  const svgBuffer = fs.readFileSync(inputSvg);

  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);

    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`Created: icon-${size}x${size}.png`);
  }

  // Favicon icin 32x32 ve 16x16
  await sharp(svgBuffer).resize(32, 32).png().toFile(path.join(outputDir, 'favicon-32x32.png'));
  await sharp(svgBuffer).resize(16, 16).png().toFile(path.join(outputDir, 'favicon-16x16.png'));

  console.log('Created: favicon-32x32.png');
  console.log('Created: favicon-16x16.png');

  // Apple touch icon
  await sharp(svgBuffer).resize(180, 180).png().toFile(path.join(outputDir, 'apple-touch-icon.png'));
  console.log('Created: apple-touch-icon.png');

  console.log('\nAll icons generated successfully!');
}

generateIcons().catch(console.error);
