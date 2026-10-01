// The app icon — a banknote under a magnifying glass on an emerald tile.
// Shared by src/app/icon.tsx and src/app/apple-icon.tsx (rendered to PNG
// via ImageResponse), which src/app/manifest.ts also points at so an
// Android home-screen shortcut picks it up.
const APP_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#059669"/>
  <g transform="rotate(-14 210 220)">
    <rect x="60" y="130" width="300" height="180" rx="22" fill="#d1fae5" stroke="#064e3b" stroke-width="12"/>
    <rect x="88" y="158" width="244" height="124" rx="12" fill="none" stroke="#10b981" stroke-width="6"/>
    <circle cx="210" cy="220" r="40" fill="#10b981"/>
    <circle cx="112" cy="220" r="10" fill="#10b981"/>
    <circle cx="308" cy="220" r="10" fill="#10b981"/>
  </g>
  <line x1="404" y1="404" x2="446" y2="446" stroke="#1f2937" stroke-width="48" stroke-linecap="round"/>
  <circle cx="318" cy="318" r="92" fill="#ffffff" fill-opacity="0.45" stroke="#1f2937" stroke-width="30"/>
</svg>`;

export const APP_ICON_DATA_URI = `data:image/svg+xml;base64,${Buffer.from(APP_ICON_SVG).toString("base64")}`;
