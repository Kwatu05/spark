import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a simple SVG icon generator
function generateIcon(size) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${size * 0.125}" fill="#3b82f6"/>
  <svg x="${size * 0.25}" y="${size * 0.25}" width="${size * 0.5}" height="${size * 0.5}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2Z"/>
    <path d="m9 12 2 2 4-4"/>
  </svg>
</svg>`;
}

// Icon sizes needed for PWA
const iconSizes = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate all icon sizes
iconSizes.forEach(size => {
  const iconContent = generateIcon(size);
  const filename = `icon-${size}x${size}.svg`;
  const filepath = path.join(iconsDir, filename);
  
  fs.writeFileSync(filepath, iconContent);
  console.log(`Generated ${filename}`);
});

// Generate shortcut icons
const shortcuts = [
  { name: 'create', icon: '✏️' },
  { name: 'messages', icon: '💬' },
  { name: 'profile', icon: '👤' },
  { name: 'search', icon: '🔍' }
];

shortcuts.forEach(shortcut => {
  const iconContent = `<svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="96" height="96" rx="12" fill="#3b82f6"/>
  <text x="48" y="60" text-anchor="middle" font-size="32" fill="white">${shortcut.icon}</text>
</svg>`;
  
  const filename = `shortcut-${shortcut.name}.svg`;
  const filepath = path.join(iconsDir, filename);
  
  fs.writeFileSync(filepath, iconContent);
  console.log(`Generated ${filename}`);
});

console.log('All icons generated successfully!');
