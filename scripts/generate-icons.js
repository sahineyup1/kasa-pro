const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputImage = path.join(__dirname, '../logo.png');
const outputDir = path.join(__dirname, '../public/icons');

async function generateIcons() {
  console.log('Generating PWA icons from logo.png...');

  // Logo dosyasını oku
  const logoBuffer = await sharp(inputImage).toBuffer();

  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);

    await sharp(logoBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`Created: icon-${size}x${size}.png`);
  }

  // Favicon icin 32x32 ve 16x16
  await sharp(logoBuffer).resize(32, 32).png().toFile(path.join(outputDir, 'favicon-32x32.png'));
  await sharp(logoBuffer).resize(16, 16).png().toFile(path.join(outputDir, 'favicon-16x16.png'));

  console.log('Created: favicon-32x32.png');
  console.log('Created: favicon-16x16.png');

  // Apple touch icon
  await sharp(logoBuffer).resize(180, 180).png().toFile(path.join(outputDir, 'apple-touch-icon.png'));
  console.log('Created: apple-touch-icon.png');

  console.log('\nAll icons generated successfully!');
}

generateIcons().catch(console.error);
