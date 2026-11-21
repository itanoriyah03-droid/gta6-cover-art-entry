// Golden Tide Cover Studio — cover render engine.
//
// Everything the poster is, drawn on a 2D canvas from the editor's state:
// a six-panel comic grid (or the Full Bleed / Tilted Snapshots layouts), a
// face-aware crop per panel, six sunset grades, striped-chrome title lettering
// with a neon script subtitle, and the poster furniture — stars-and-quote
// strip, VOL. 1, tagline, COMING SOON, billing block, barcode and gold seal.
// The same drawCover() paints the live preview, the PNG export and the
// ?shot=cover scene, so what the screenshots show is what the app makes.
//
// Fonts (shipped under app/fonts/, SIL OFL): 'CoverTitle' is Noto Sans Display
// ExtraCondensed Black for the title and role tags; 'CoverScript' is Noto Serif
// Display Black Italic for the neon subtitle.

export const SIZES = {
  wide: { w: 1920, h: 1080, label: 'Wide 1920×1080' },
  story: { w: 1080, h: 1350, label: 'Story 1080×1350' },
  square: { w: 1080, h: 1080, label: 'Square 1080×1080' },
};

// Six grades. sky* paint the poster's sky, wash is the colour laid over every
// photo with the 'overlay' blend, deep shades the bottom of each panel, script
// is the neon subtitle colour, accent is the furniture gold.
export const GRADES = {
  sunset: {
    name: 'Sunset',
    skyTop: '#2b0f3c', skyMid: '#c2275b', skyBot: '#ff8a3d',
    sun: '#ffd76a', wash: '#ff7a3d', deep: '#7a1e4e',
    script: '#ff5ea8', accent: '#f2b23e',
  },
  neon: {
    name: 'Neon Nights',
    skyTop: '#0d0626', skyMid: '#7a1e6e', skyBot: '#ff2e88',
    sun: '#ff5ea8', wash: '#c44dff', deep: '#1e0f4e',
    script: '#2dd4bf', accent: '#ffd76a',
  },
  golden: {
    name: 'Golden Hour',
    skyTop: '#3a1c07', skyMid: '#b45a1b', skyBot: '#ffc53d',
    sun: '#fff3b0', wash: '#ffb03d', deep: '#6e2f0b',
    script: '#ff4d8d', accent: '#ffe9a3',
  },
  vice: {
    name: 'Vice Pink',
    skyTop: '#1c0533', skyMid: '#a4138c', skyBot: '#ff5e78',
    sun: '#ffb3c8', wash: '#ff4d8d', deep: '#4a0f5e',
    script: '#ffd76a', accent: '#ff8ab0',
  },
  teal: {
    name: 'Teal Dawn',
    skyTop: '#04263b', skyMid: '#0e6f7a', skyBot: '#2dd4bf',
    sun: '#d8fff4', wash: '#2dd4bf', deep: '#073b4d',
    script: '#ffb03d', accent: '#ffd76a',
  },
  noir: {
    name: 'Noir',
    skyTop: '#0d0d0f', skyMid: '#3a3a40', skyBot: '#8a8a92',
    sun: '#f5f5f0', wash: '#9a9aa2', deep: '#101014',
    script: '#f2b23e', accent: '#e8e8e0',
  },
};

export const GRADE_IDS = Object.keys(GRADES);
export const LAYOUT_IDS = ['hero', 'bleed', 'tilted'];
export const LAYOUT_NAMES = { hero: 'Hero Grid', bleed: 'Full Bleed', tilted: 'Tilted Snapshots' };

// --- small deterministic helpers -------------------------------------------

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

// mulberry32: a tiny seeded PRNG, so grain, barcode and skyline are identical
// on every render of the same cover.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function roundRectPath(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function starPath(ctx, cx, cy, rOuter, rInner) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function fitFont(ctx, text, startSize, maxWidth, family, weight = 900) {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > 8 && ctx.measureText(text).width > maxWidth) {
    size *= 0.94;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

// --- background: sky, sun and skyline ---------------------------------------

function drawSky(ctx, W, H, grade) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, grade.skyTop);
  g.addColorStop(0.55, grade.skyMid);
  g.addColorStop(1, grade.skyBot);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function drawSun(ctx, W, H, grade, cx, cy, r) {
  const glow = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r * 3.2);
  glow.addColorStop(0, grade.sun);
  glow.addColorStop(0.35, grade.sun + '55');
  glow.addColorStop(1, grade.sun + '00');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - r * 3.2, cy - r * 3.2, r * 6.4, r * 6.4);
  ctx.fillStyle = grade.sun;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

// A dark skyline silhouette with a few lit windows, deterministic per grade.
function drawSkyline(ctx, W, H, grade, baseY) {
  const rand = mulberry32(hashString(grade.name) ^ 0x51ab);
  ctx.fillStyle = '#160a18';
  let x = -W * 0.02;
  while (x < W * 1.02) {
    const bw = W * (0.04 + rand() * 0.07);
    const bh = H * (0.06 + rand() * 0.13);
    ctx.fillRect(x, baseY - bh, bw, bh + H * 0.02);
    ctx.fillStyle = '#ffd76a';
    for (let wy = baseY - bh + H * 0.015; wy < baseY - H * 0.01; wy += H * 0.028) {
      for (let wx = x + bw * 0.2; wx < x + bw * 0.85; wx += bw * 0.28) {
        if (rand() < 0.28) ctx.fillRect(wx, wy, Math.max(2, W * 0.004), Math.max(2, H * 0.008));
      }
    }
    ctx.fillStyle = '#160a18';
    x += bw + W * 0.008;
  }
  drawPalm(ctx, W * 0.06, baseY, H * 0.16, -0.12);
  drawPalm(ctx, W * 0.94, baseY, H * 0.19, 0.14);
}

function drawPalm(ctx, x, baseY, h, lean) {
  ctx.save();
  ctx.translate(x, baseY);
  ctx.rotate(lean);
  ctx.strokeStyle = '#160a18';
  ctx.lineWidth = Math.max(3, h * 0.03);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(h * 0.06, -h * 0.55, h * 0.02, -h);
  ctx.stroke();
  ctx.fillStyle = '#160a18';
  for (let i = 0; i < 7; i++) {
    const a = (-Math.PI / 2 + (i - 3) * 0.42) * 0.9;
    const len = h * (0.42 + (i % 2) * 0.08);
    ctx.beginPath();
    ctx.moveTo(h * 0.02, -h);
    ctx.quadraticCurveTo(
      h * 0.02 + Math.cos(a) * len * 0.6,
      -h + Math.sin(a) * len * 0.6 - h * 0.12,
      h * 0.02 + Math.cos(a) * len,
      -h + Math.sin(a) * len + h * 0.16,
    );
    ctx.quadraticCurveTo(
      h * 0.02 + Math.cos(a) * len * 0.5,
      -h + Math.sin(a) * len * 0.5 + h * 0.1,
      h * 0.02,
      -h,
    );
    ctx.fill();
  }
  ctx.restore();
}

// --- photos: face-aware crop, grade wash, frame -----------------------------

function drawPhotoInPanel(ctx, img, panel, photo, grade) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const zoom = photo.zoom || 1;
  const focus = photo.face || photo.focus || { x: 0.5, y: 0.5 };
  const base = Math.max(panel.w / iw, panel.h / ih);
  const s = base * zoom;
  const fx = focus.x * iw;
  const fy = focus.y * ih;
  let dx = panel.x + panel.w / 2 - fx * s + (photo.dx || 0);
  let dy = panel.y + panel.h / 2 - fy * s + (photo.dy || 0);
  dx = Math.min(dx, panel.x);
  dx = Math.max(dx, panel.x + panel.w - iw * s);
  dy = Math.min(dy, panel.y);
  dy = Math.max(dy, panel.y + panel.h - ih * s);

  ctx.save();
  ctx.beginPath();
  ctx.rect(panel.x, panel.y, panel.w, panel.h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, iw * s, ih * s);
  // The grade's wash unifies every photo into the poster's palette.
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = grade.wash;
  ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  const shade = ctx.createLinearGradient(0, panel.y, 0, panel.y + panel.h);
  shade.addColorStop(0, 'rgba(0,0,0,0)');
  shade.addColorStop(1, grade.deep + '44');
  ctx.fillStyle = shade;
  ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
  ctx.restore();
}

function drawEmptyPanel(ctx, panel, grade) {
  const g = ctx.createLinearGradient(panel.x, panel.y, panel.x + panel.w, panel.y + panel.h);
  g.addColorStop(0, grade.skyMid);
  g.addColorStop(1, grade.skyBot);
  ctx.fillStyle = g;
  ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = `700 ${Math.max(12, panel.h * 0.07)}px 'StudioUI', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ADD A PHOTO', panel.x + panel.w / 2, panel.y + panel.h / 2);
}

function drawPanelFrame(ctx, panel, hero, grade) {
  ctx.lineJoin = 'miter';
  ctx.strokeStyle = '#14090f';
  ctx.lineWidth = Math.max(2, panel.w * 0.008);
  ctx.strokeRect(panel.x, panel.y, panel.w, panel.h);
  ctx.strokeStyle = hero ? grade.accent : 'rgba(255,255,255,0.55)';
  ctx.lineWidth = hero ? Math.max(3, panel.w * 0.01) : 1.5;
  ctx.strokeRect(panel.x + 2, panel.y + 2, panel.w - 4, panel.h - 4);
}

// The slanted black role tag in a panel's corner — top-left, or bottom-left
// when the title band crosses the panel's top (the grid's bottom row).
function drawRoleTag(ctx, panel, role, grade, at = 'top') {
  if (!role) return;
  const h = Math.max(16, panel.h * 0.085);
  const pad = h * 0.55;
  const slant = h * 0.45;
  ctx.font = `900 ${h * 0.62}px 'CoverTitle', 'StudioUI', sans-serif`;
  const tw = ctx.measureText(role).width;
  const w = tw + pad * 2 + slant;
  const x = panel.x + panel.w * 0.03;
  const y = at === 'bottom'
    ? panel.y + panel.h - h - panel.h * 0.045
    : panel.y + panel.h * 0.045;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w - slant, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fillStyle = 'rgba(10,4,8,0.92)';
  ctx.fill();
  ctx.fillStyle = grade.accent;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(role, x + pad, y + h / 2 + 1);
  ctx.restore();
}

// --- poster furniture -------------------------------------------------------

function drawTopStrip(ctx, W, H, grade, quote) {
  const y = H * 0.028;
  const starR = H * 0.02;
  let x = W * 0.022;
  ctx.fillStyle = grade.accent;
  for (let i = 0; i < 5; i++) {
    starPath(ctx, x, y, starR, starR * 0.45);
    ctx.fill();
    x += starR * 2.5;
  }
  const quoteX = x + W * 0.015;
  const volW = W * 0.075;
  const quoteMax = W - volW - quoteX - W * 0.03;
  ctx.font = `700 ${Math.max(11, H * 0.021)}px 'StudioUI', sans-serif`;
  ctx.fillStyle = '#fff8ea';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  let q = (quote || '').toUpperCase();
  while (q.length > 1 && ctx.measureText(`“${q}”`).width > quoteMax) q = q.slice(0, -1);
  ctx.fillText(`“${q}”`, quoteX, y);
  // VOL. 1 box, top right.
  const boxH = H * 0.038;
  const boxX = W - W * 0.022 - volW;
  ctx.strokeStyle = '#fff8ea';
  ctx.lineWidth = Math.max(1.5, H * 0.002);
  ctx.strokeRect(boxX, y - boxH / 2, volW, boxH);
  ctx.fillStyle = '#fff8ea';
  ctx.font = `900 ${Math.max(11, H * 0.02)}px 'CoverTitle', 'StudioUI', sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('VOL. 1', boxX + volW / 2, y + 1);
}

function drawChromeTitle(ctx, W, H, grade, title, subtitle, tagline, bandY) {
  const cx = W / 2;
  const maxW = W * 0.94;
  // A dark scrim behind the lettering so the title reads over any photo.
  const scrim = ctx.createLinearGradient(0, bandY - H * 0.1, 0, bandY + H * 0.2);
  scrim.addColorStop(0, 'rgba(10,4,8,0)');
  scrim.addColorStop(0.35, 'rgba(10,4,8,0.62)');
  scrim.addColorStop(0.75, 'rgba(10,4,8,0.62)');
  scrim.addColorStop(1, 'rgba(10,4,8,0)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, bandY - H * 0.1, W, H * 0.3);

  const text = (title || 'GOLDEN TIDE').toUpperCase();
  // Sized by width on tall sizes, so the title never swallows a whole row.
  const size = fitFont(ctx, text, Math.min(H * 0.15, W * 0.155), maxW, `'CoverTitle', 'StudioUI', sans-serif`);
  const titleY = bandY + size * 0.28;
  const grad = ctx.createLinearGradient(0, titleY - size * 0.72, 0, titleY + size * 0.28);
  grad.addColorStop(0, '#7a4a12');
  grad.addColorStop(0.22, '#f7d774');
  grad.addColorStop(0.42, '#fff6c9');
  grad.addColorStop(0.55, '#f2b23e');
  grad.addColorStop(0.78, '#c07f1d');
  grad.addColorStop(1, '#5e3408');
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = size * 0.06;
  ctx.shadowOffsetY = size * 0.025;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#160a12';
  ctx.lineWidth = size * 0.085;
  ctx.strokeText(text, cx, titleY);
  ctx.fillStyle = grad;
  ctx.fillText(text, cx, titleY);
  // A horizontal shine across the chrome, clipped to the painted letters.
  ctx.globalCompositeOperation = 'source-atop';
  const shine = ctx.createLinearGradient(0, titleY - size * 0.35, 0, titleY + size * 0.05);
  shine.addColorStop(0, 'rgba(255,255,255,0)');
  shine.addColorStop(0.5, 'rgba(255,255,255,0.34)');
  shine.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shine;
  const tw = ctx.measureText(text).width;
  ctx.fillRect(cx - tw / 2, titleY - size * 0.72, tw, size);
  ctx.restore();

  // Neon script subtitle, tilted a touch, glowing.
  if (subtitle) {
    const subSize = fitFont(ctx, subtitle, H * 0.048, maxW * 0.8, `'CoverScript', serif`);
    ctx.save();
    ctx.translate(cx, titleY + subSize * 1.25);
    ctx.rotate(-0.035);
    ctx.font = `900 ${subSize}px 'CoverScript', serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = grade.script;
    ctx.shadowBlur = subSize * 0.45;
    ctx.fillStyle = grade.script;
    ctx.fillText(subtitle, 0, 0);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillText(subtitle, 0, 0);
    ctx.restore();
  }

  // Tagline in spaced small caps.
  if (tagline) {
    const tagSize = Math.max(11, H * 0.02);
    ctx.save();
    ctx.font = `700 ${tagSize}px 'StudioUI', sans-serif`;
    try { ctx.letterSpacing = `${Math.max(2, tagSize * 0.22)}px`; } catch { /* older canvas */ }
    ctx.fillStyle = '#fff8ea';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tagline.toUpperCase(), cx, titleY + H * 0.13);
    try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
    ctx.restore();
  }
}

function drawBarcode(ctx, x, y, w, h, seedText) {
  const rand = mulberry32(hashString(seedText || 'golden tide') ^ 0xba4c0de);
  ctx.fillStyle = '#fff8ea';
  ctx.fillRect(x - 4, y - 4, w + 8, h + 16);
  ctx.fillStyle = '#14090f';
  let bx = x;
  while (bx < x + w - 2) {
    const bw = 1 + Math.floor(rand() * 3) * (w / 220);
    if (rand() < 0.55) ctx.fillRect(bx, y, bw, h);
    bx += bw + (w / 220) * (1 + Math.floor(rand() * 2));
  }
  ctx.font = `400 ${Math.max(9, h * 0.16)}px 'StudioUI', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('0 12345 67890 1', x + w / 2, y + h + 3);
}

function drawSeal(ctx, cx, cy, r, grade) {
  ctx.save();
  ctx.translate(cx, cy);
  // Serrated rosette edge.
  ctx.beginPath();
  const teeth = 24;
  for (let i = 0; i <= teeth * 2; i++) {
    const a = (i / (teeth * 2)) * Math.PI * 2;
    const rr = i % 2 === 0 ? r : r * 0.88;
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  const g = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r);
  g.addColorStop(0, '#ffe9a3');
  g.addColorStop(0.6, grade.accent);
  g.addColorStop(1, '#8a5a10');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = '#5e3408';
  ctx.lineWidth = Math.max(1.5, r * 0.04);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#4a2408';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${r * 0.3}px 'CoverTitle', 'StudioUI', sans-serif`;
  ctx.fillText('BEST', 0, -r * 0.16);
  ctx.fillText('CAST', 0, r * 0.16);
  ctx.font = `700 ${r * 0.13}px 'StudioUI', sans-serif`;
  ctx.fillText('★ ORIGINAL ★', 0, r * 0.42);
  ctx.restore();
}

function drawBottomStrip(ctx, W, H, grade, title) {
  const y = H * 0.925;
  ctx.fillStyle = '#fff8ea';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${Math.max(12, H * 0.03)}px 'CoverTitle', 'StudioUI', sans-serif`;
  ctx.fillText('COMING SOON', W * 0.022, y);
  // Billing block, centred, two tiny lines — kept short so it clears
  // COMING SOON on the left and the seal on the right.
  ctx.textAlign = 'center';
  ctx.font = `400 ${Math.max(8, H * 0.0105)}px 'StudioUI', sans-serif`;
  ctx.fillStyle = 'rgba(255,248,234,0.85)';
  ctx.fillText('GOLDEN TIDE STUDIO  •  A SUNSET COAST PRODUCTION', W / 2, y - H * 0.013);
  ctx.fillText('STARRING THE CREW  •  DIRECTED BY YOU', W / 2, y + H * 0.013);
  // Barcode, bottom right.
  const bw = W * 0.085;
  const bh = H * 0.042;
  drawBarcode(ctx, W - W * 0.022 - bw, y - bh / 2, bw, bh, title);
  // Gold seal overlapping the bottom edge, left of the barcode.
  drawSeal(ctx, W * 0.815, H * 0.93, H * 0.055, grade);
}

// Film grain + vignette: the final pass that makes the poster feel printed.
function drawFinish(ctx, W, H, grade) {
  const rand = mulberry32(0xc0ffee);
  const dots = Math.floor((W * H) / 900);
  ctx.save();
  for (let i = 0; i < dots; i++) {
    const v = rand();
    ctx.fillStyle = v < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.045)';
    ctx.fillRect(rand() * W, rand() * H, 1.6, 1.6);
  }
  ctx.restore();
  const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.72);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(10,4,8,0.3)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
}

// --- layouts ----------------------------------------------------------------

// The hero grid: six panels in three columns and two rows (two columns and
// three rows on the tall story size), hero close-up top centre, title band
// overlapping the row boundary like the genre's posters do.
function heroPanels(W, H) {
  const top = H * 0.075;
  const bottom = H * 0.865;
  const left = W * 0.015;
  const right = W * 0.985;
  const gap = W * 0.008;
  const panels = [];
  if (W >= H * 0.95) {
    const cw = (right - left - gap * 2) / 3;
    const rh = (bottom - top - gap) / 2;
    const rects = [
      [left + cw + gap, top, cw, rh],
      [left, top, cw, rh],
      [left + (cw + gap) * 2, top, cw, rh],
      [left, top + rh + gap, cw, rh],
      [left + cw + gap, top + rh + gap, cw, rh],
      [left + (cw + gap) * 2, top + rh + gap, cw, rh],
    ];
    for (const [x, y, w, h] of rects) panels.push({ x, y, w, h });
  } else {
    const cw = (right - left - gap) / 2;
    const rh = (bottom - top - gap * 2) / 3;
    const rects = [
      [left, top, cw, rh],
      [left + cw + gap, top, cw, rh],
      [left, top + rh + gap, cw, rh],
      [left + cw + gap, top + rh + gap, cw, rh],
      [left, top + (rh + gap) * 2, cw, rh],
      [left + cw + gap, top + (rh + gap) * 2, cw, rh],
    ];
    for (const [x, y, w, h] of rects) panels.push({ x, y, w, h });
  }
  return panels;
}

function paintPanel(ctx, panel, photo, img, hero, grade, tagAt = 'top') {
  if (img) drawPhotoInPanel(ctx, img, panel, photo, grade);
  else drawEmptyPanel(ctx, panel, grade);
  drawPanelFrame(ctx, panel, hero, grade);
  drawRoleTag(ctx, panel, photo.role, grade, tagAt);
}

// The full-bleed layout: one photo fills the poster, two inset panels sit
// low left and low right, furniture over the top.
function drawBleed(ctx, W, H, state, images, grade) {
  const base = state.panels[0];
  const baseImg = base ? images.get(base.photo) : undefined;
  if (baseImg) {
    drawPhotoInPanel(ctx, baseImg, { x: 0, y: 0, w: W, h: H }, base, grade);
  } else {
    drawSky(ctx, W, H, grade);
  }
  const scrimTop = ctx.createLinearGradient(0, 0, 0, H * 0.3);
  scrimTop.addColorStop(0, 'rgba(10,4,8,0.55)');
  scrimTop.addColorStop(1, 'rgba(10,4,8,0)');
  ctx.fillStyle = scrimTop;
  ctx.fillRect(0, 0, W, H * 0.3);
  const scrimBot = ctx.createLinearGradient(0, H * 0.62, 0, H);
  scrimBot.addColorStop(0, 'rgba(10,4,8,0)');
  scrimBot.addColorStop(1, 'rgba(10,4,8,0.6)');
  ctx.fillStyle = scrimBot;
  ctx.fillRect(0, H * 0.62, W, H * 0.38);
  const insetW = W * 0.27;
  const insetH = H * 0.21;
  const insetY = H * 0.62;
  for (const [photo, x] of [
    [state.panels[3], W * 0.02],
    [state.panels[4], W * 0.98 - insetW],
  ]) {
    if (!photo) continue;
    const img = images.get(photo.photo);
    const rect = { x, y: insetY, w: insetW, h: insetH };
    if (img) drawPhotoInPanel(ctx, img, rect, photo, grade);
    else drawEmptyPanel(ctx, rect, grade);
    drawPanelFrame(ctx, rect, false, grade);
    drawRoleTag(ctx, rect, photo.role, grade);
  }
  drawChromeTitle(ctx, W, H, grade, state.title, state.subtitle, state.tagline, H * 0.42);
}

// The tilted layout: three snapshot panels, slightly rotated, over a sunset
// sky with sun and skyline — the scrapbook page of the crew's summer.
function drawTilted(ctx, W, H, state, images, grade) {
  drawSky(ctx, W, H, grade);
  drawSun(ctx, W, H, grade, W * 0.72, H * 0.2, H * 0.09);
  drawSkyline(ctx, W, H, grade, H * 0.86);
  const slots = [
    { photo: state.panels[1], x: W * 0.04, y: H * 0.1, w: W * 0.3, h: H * 0.42, rot: -0.06 },
    { photo: state.panels[0], x: W * 0.33, y: H * 0.07, w: W * 0.36, h: H * 0.52, rot: 0.015, hero: true },
    { photo: state.panels[5], x: W * 0.68, y: H * 0.11, w: W * 0.28, h: H * 0.4, rot: 0.05 },
  ];
  for (const slot of slots) {
    if (!slot.photo) continue;
    const img = images.get(slot.photo.photo);
    ctx.save();
    ctx.translate(slot.x + slot.w / 2, slot.y + slot.h / 2);
    ctx.rotate(slot.rot);
    ctx.translate(-slot.w / 2, -slot.h / 2);
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = H * 0.02;
    ctx.shadowOffsetY = H * 0.008;
    const rect = { x: 0, y: 0, w: slot.w, h: slot.h };
    if (img) drawPhotoInPanel(ctx, img, rect, slot.photo, grade);
    else drawEmptyPanel(ctx, rect, grade);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    drawPanelFrame(ctx, rect, slot.hero, grade);
    drawRoleTag(ctx, rect, slot.photo.role, grade);
    ctx.restore();
  }
  drawChromeTitle(ctx, W, H, grade, state.title, state.subtitle, state.tagline, H * 0.66);
}

// --- the cover ----------------------------------------------------------------

// state: { layout, grade, title, subtitle, quote, tagline,
//           panels: [{ photo, role, zoom, dx, dy, face?, focus? }] }
// images: Map<photoId, HTMLImageElement>
export function drawCover(ctx, W, H, state, images) {
  const grade = GRADES[state.grade] || GRADES.sunset;
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  if (state.layout === 'bleed') {
    drawBleed(ctx, W, H, state, images, grade);
  } else if (state.layout === 'tilted') {
    drawTilted(ctx, W, H, state, images, grade);
  } else {
    drawSky(ctx, W, H, grade);
    drawSun(ctx, W, H, grade, W * 0.5, H * 0.3, H * 0.075);
    const rects = heroPanels(W, H);
    // The title band crosses the grid's bottom row, so the bottom row's role
    // tags sit at the panels' bottom-left instead of their top-left.
    const tall = W < H * 0.95;
    for (let i = 0; i < rects.length; i++) {
      const photo = state.panels[i];
      if (!photo) continue;
      const img = images.get(photo.photo);
      const tagAt = tall ? (i < 4 ? 'top' : 'bottom') : (i < 3 ? 'top' : 'bottom');
      // On tall sizes the title band sits on the middle row's centre: pan the
      // middle row's photos up a little so their faces clear the lettering.
      const framed = tall && (i === 2 || i === 3)
        ? { ...photo, dy: (photo.dy || 0) - rects[i].h * 0.18 }
        : photo;
      paintPanel(ctx, rects[i], framed, img, i === 0, grade, tagAt);
    }
    // On tall sizes the title sits on the middle row's centre, clear of faces.
    drawChromeTitle(ctx, W, H, grade, state.title, state.subtitle, state.tagline, tall ? H * 0.47 : H * 0.52);
  }
  drawTopStrip(ctx, W, H, grade, state.quote);
  drawBottomStrip(ctx, W, H, grade, state.title);
  drawFinish(ctx, W, H, grade);
  ctx.restore();
}

// Render a cover at an exact export size and return the canvas.
export function renderCoverToCanvas(state, images, sizeKey) {
  const size = SIZES[sizeKey] || SIZES.wide;
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  const ctx = canvas.getContext('2d');
  drawCover(ctx, size.w, size.h, state, images);
  return canvas;
}

// The panel rectangles the editor uses for hit-testing, in preview pixels.
export function layoutRectsFor(sizeKey, previewW, previewH) {
  const size = SIZES[sizeKey] || SIZES.wide;
  const rects = heroPanels(size.w, size.h);
  const sx = previewW / size.w;
  const sy = previewH / size.h;
  return rects.map((r) => ({ x: r.x * sx, y: r.y * sy, w: r.w * sx, h: r.h * sy }));
}
