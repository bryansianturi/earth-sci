// Renders PNG icons from the SVG sources. Run: npm run icons
import sharp from 'sharp';
const jobs = [
  ['public/icons/icon.svg', 'public/icons/icon-192.png', 192],
  ['public/icons/icon.svg', 'public/icons/icon-512.png', 512],
  ['public/icons/icon-maskable.svg', 'public/icons/icon-maskable-512.png', 512],
];
for (const [src, out, size] of jobs) {
  await sharp(src, { density: 300 }).resize(size, size).png().toFile(out);
  console.log('wrote', out);
}
