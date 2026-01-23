import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '../public');
const iconsDir = join(publicDir, 'icons');

// Create a simple purple "D" icon as PNG
async function generateIcon(size, outputPath) {
  // Create SVG with the same design as favicon
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#a855f7"/>
          <stop offset="100%" style="stop-color:#6366f1"/>
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${size * 0.1875}" fill="url(#g)"/>
      <text x="${size / 2}" y="${size * 0.6875}" font-family="Arial, sans-serif" font-size="${size * 0.5}" font-weight="bold" fill="white" text-anchor="middle">D</text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(outputPath);

  console.log(`✅ Generated ${outputPath}`);
}

async function main() {
  // Ensure icons directory exists
  await mkdir(iconsDir, { recursive: true });

  // Generate icons
  await generateIcon(192, join(iconsDir, 'icon-192.png'));
  await generateIcon(512, join(iconsDir, 'icon-512.png'));

  console.log('🎉 All icons generated!');
}

main().catch(console.error);
