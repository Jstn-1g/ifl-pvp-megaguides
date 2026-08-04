const requiredCacheBlocks = [
  [
    'document and discovery-feed revalidation',
    `<FilesMatch "\\.(?:html?|xml|txt)$">
    Header always set Cache-Control "no-cache, max-age=0, must-revalidate"
  </FilesMatch>`,
  ],
  [
    'immutable content-hashed code caching',
    `<FilesMatch "\\.[A-Za-z0-9_-]{8,}\\.(?:css|js|mjs)$">
    Header always set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>`,
  ],
  [
    'immutable versioned first-party art caching',
    `<FilesMatch "-v[0-9]+\\.(?:webp|avif|png)$">
    Header always set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>`,
  ],
  [
    'stable public-visual revalidation',
    `<FilesMatch "^(?:og\\.png|ifl-pvp-logo\\.webp)$">
    Header always set Cache-Control "no-cache, max-age=0, must-revalidate"
  </FilesMatch>`,
  ],
];

export function checkCachePolicy(contents) {
  const normalized = contents.replaceAll('\r\n', '\n');
  return requiredCacheBlocks
    .filter(([, block]) => !normalized.includes(block))
    .map(([label]) => `dist/.htaccess is missing ${label}.`);
}
