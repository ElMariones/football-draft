// A contact sheet of every brand mark, at public/_brandsheet.html.
//
// Useful when adding logo files: it shows all 33 side by side and labels which
// are real marks and which are still on the drawn fallback.
//
//   npm run brands:sheet      then open http://localhost:3000/_brandsheet.html
//
// The output is gitignored — it is a local dev tool, not part of the site.
import { writeFileSync } from 'node:fs';
import { BRANDS } from '@/data/career/brands';
import { BRAND_LOGOS } from '@/data/career/brandLogos';

const isLight = hex => {
  const h = hex.replace('#',''); if (h.length < 6) return false;
  const [r,g,b] = [0,2,4].map(i => parseInt(h.slice(i,i+2),16));
  return (0.299*r+0.587*g+0.114*b)/255 > 0.62;
};
const GLYPH = {
  wedge:'M12 70 C34 66 62 50 88 24 C84 44 66 68 34 78 Z',
  bars:'M22 78 L40 22 L52 22 L34 78 Z M44 78 L62 22 L74 22 L56 78 Z M66 78 L84 22 L96 22 L78 78 Z',
  chevron:'M50 18 L82 44 L70 54 L50 38 L30 54 L18 44 Z M50 46 L82 72 L70 82 L50 66 L30 82 L18 72 Z',
  orbit:'M50 14 A36 36 0 1 1 49.9 14 Z M50 32 A18 18 0 1 0 50.1 32 Z M74 66 L92 84 L84 92 L66 74 Z',
  blade:'M20 82 C24 44 46 20 84 14 C80 52 58 76 20 82 Z',
  grid:'M18 18 H46 V46 H18 Z M54 30 H82 V58 H54 Z M18 54 H46 V82 H18 Z',
  wave:'M10 62 C26 38 38 38 52 54 C64 68 76 68 92 44 L92 68 C76 90 62 90 50 74 C38 58 26 58 10 82 Z',
  star:'M50 12 L61 40 L91 41 L67 59 L76 88 L50 71 L24 88 L33 59 L9 41 L39 40 Z',
  shard:'M56 8 L34 50 H52 L40 92 L74 44 H54 Z',
  ring:'M50 10 A40 40 0 1 1 49.9 10 Z M50 26 A24 24 0 1 0 50.1 26 Z M50 38 A12 12 0 1 1 49.9 38 Z',
  bolt:'M60 6 L22 56 H46 L40 94 L80 42 H54 Z',
  diamond:'M50 8 L92 50 L50 92 L8 50 Z M50 32 L68 50 L50 68 L32 50 Z',
  flame:'M50 8 C66 30 82 40 82 60 A32 32 0 0 1 18 60 C18 44 30 40 36 28 C40 44 50 44 50 8 Z',
  arch:'M12 84 C12 40 34 14 50 14 C66 14 88 40 88 84 L68 84 C68 50 58 34 50 34 C42 34 32 50 32 84 Z',
  crown:'M12 76 L20 26 L36 48 L50 18 L64 48 L80 26 L88 76 Z',
  pulse:'M6 54 H30 L38 26 L50 78 L60 44 L68 54 H94 V64 H62 L54 90 L42 34 L34 64 H6 Z',
};
const ROUND = ['orbit','ring','flame','star'];
const S = 56;
const mark = b => {
  const lg = BRAND_LOGOS[b.id];
  if (lg?.path) {
    const field = lg.hex ?? b.primary;
    const ink = isLight(field) ? '#111111' : '#FFFFFF';
    return `<svg width="${S}" height="${S}" viewBox="0 0 24 24"><rect width="24" height="24" rx="5.6" fill="${field}"/><g transform="translate(12 12) scale(0.66) translate(-12 -12)"><path d="${lg.path}" fill="${ink}"/></g></svg>`;
  }
  const r = ROUND.includes(b.glyph);
  return `<svg width="${S}" height="${S}" viewBox="0 0 100 100">${
    r ? `<circle cx="50" cy="50" r="50" fill="${b.primary}"/>`
      : `<rect width="100" height="100" rx="24" fill="${b.primary}"/>`
  }<g transform="translate(50 50) scale(0.72) translate(-50 -50)"><path d="${GLYPH[b.glyph]}" fill="${b.secondary}" fill-rule="evenodd"/></g></svg>`;
};
const cell = b => {
  const real = !!BRAND_LOGOS[b.id]?.path || !!BRAND_LOGOS[b.id]?.file;
  return `<div class="c"><div class="m">${mark(b)}</div><div class="n">${b.name}</div>
  <div class="t ${real?'r':'d'}">${real ? 'REAL' : 'drawn'}</div></div>`;
};
const group = (title, list) => `<h2>${title}</h2><div class="g">${list.map(cell).join('')}</div>`;
const html = `<!doctype html><meta charset="utf-8"><title>brand marks</title><style>
body{background:#0b0f14;color:#fff;font:14px/1.4 system-ui;padding:24px;margin:0}
h1{font-size:20px;margin:0 0 4px}h2{font-size:12px;letter-spacing:.3em;text-transform:uppercase;color:#ffffff66;margin:26px 0 10px}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:14px}
.c{text-align:center}.m{display:grid;place-items:center;height:${S+8}px}
.n{font-size:11px;color:#fffc;margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.t{font-size:9px;letter-spacing:.12em;margin-top:3px}
.r{color:#00DFA2}.d{color:#ffffff44}
p{color:#ffffff77;font-size:12px;margin:0 0 8px}
</style><h1>Brand marks</h1><p>REAL = official logo geometry &middot; drawn = original fallback glyph, not a logo</p>
${group('Boots', BRANDS.filter(b=>b.family==='boot'))}
${group('Lifestyle', BRANDS.filter(b=>b.family==='lifestyle'))}`;
writeFileSync('public/_brandsheet.html', html);
console.log('wrote public/_brandsheet.html');
