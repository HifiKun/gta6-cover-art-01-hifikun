// Draws the multi-panel Vice City cover onto a canvas at export size.
// Layouts: trio (one tall panel + two stacked), duo (two diagonal halves),
// hero (one full-bleed photo). Grades tint the whole poster; the caption is
// set in Anton, an OFL font shipped under app/fonts/.

export const SIZES = {
  square: { w: 1080, h: 1080, label: '1080 × 1080' },
  portrait: { w: 1080, h: 1350, label: '1080 × 1350' },
  wide: { w: 1920, h: 1080, label: '1920 × 1080' },
};

const GRADES = {
  sunset: {
    sky: ['#ff9a3d', '#ff5e62', '#c724b1'],
    wash: 'rgba(255, 94, 60, 0.20)',
    deep: 'rgba(120, 10, 90, 0.55)',
    accent: '#ffb347',
    sun: '#ffd166',
  },
  neon: {
    sky: ['#00e5ff', '#7b2ff7', '#ff2e88'],
    wash: 'rgba(0, 229, 255, 0.16)',
    deep: 'rgba(20, 0, 60, 0.60)',
    accent: '#00e5ff',
    sun: '#ff2e88',
  },
  pastel: {
    sky: ['#ffd6e8', '#ffb3c8', '#a5e8ff'],
    wash: 'rgba(255, 214, 232, 0.18)',
    deep: 'rgba(90, 30, 90, 0.38)',
    accent: '#ff8fb3',
    sun: '#fff3b0',
  },
};

/** Panel rectangles (fractions of w/h) for each layout, with a diagonal slant. */
function panelRects(layout, w, h) {
  if (layout === 'duo') {
    return [
      { x: 0, y: 0, w: w * 0.56, h, slant: 0.06 * w },
      { x: w * 0.44, y: 0, w: w * 0.56, h, slant: -0.06 * w },
    ];
  }
  if (layout === 'hero') return [{ x: 0, y: 0, w, h, slant: 0 }];
  // trio: tall left panel, two stacked on the right
  return [
    { x: 0, y: 0, w: w * 0.60, h, slant: 0.05 * w },
    { x: w * 0.55, y: 0, w: w * 0.45, h: h * 0.52, slant: -0.05 * w },
    { x: w * 0.55, y: h * 0.48, w: w * 0.45, h: h * 0.52, slant: -0.05 * w },
  ];
}

/** Draws one photo cover-fit into a panel rect, honouring zoom and offsets. */
function drawPhotoInPanel(ctx, img, rect, crop) {
  const { x, y, w, h, slant } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + slant, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w - slant, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.clip();
  if (img) {
    const base = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const scale = base * (crop?.zoom ?? 1.2);
    const pw = img.naturalWidth * scale;
    const ph = img.naturalHeight * scale;
    const ox = ((crop?.ox ?? 0) / 100) * w;
    const oy = ((crop?.oy ?? 0) / 100) * h;
    ctx.drawImage(img, x + (w - pw) / 2 + ox, y + (h - ph) / 2 + oy, pw, ph);
  } else {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, '#3d1a5c');
    g.addColorStop(1, '#1a0b2e');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
}

/** Fits `text` to `maxWidth` by shrinking the font, then draws it centred. */
function fitText(ctx, text, cx, baseline, maxWidth, size, font, fill, stroke) {
  let s = size;
  ctx.font = `${s}px ${font}`;
  while (ctx.measureText(text).width > maxWidth && s > 20) {
    s -= 4;
    ctx.font = `${s}px ${font}`;
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(4, s * 0.09);
    ctx.strokeText(text, cx, baseline);
  }
  ctx.fillStyle = fill;
  ctx.fillText(text, cx, baseline);
  return s;
}

/**
 * Draws the whole cover. `state` holds layout, size, grade, caption,
 * subcaption, photos (array of images or null) and per-panel crops.
 */
export function drawCover(canvas, state) {
  const size = SIZES[state.size] ?? SIZES.square;
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const w = size.w;
  const h = size.h;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const rects = panelRects(state.layout, w, h);
  const photos = state.fillAll && state.photos[0]
    ? rects.map(() => state.photos[0])
    : state.photos;
  const crops = state.fillAll && state.crops[0]
    ? rects.map(() => state.crops[0])
    : state.crops;

  // Sunset sky base: fills the whole poster first, so the slanted panel
  // corners show a sunset stripe instead of bare dark background.
  const sky = ctx.createLinearGradient(0, 0, w * 0.7, h);
  sky.addColorStop(0, grade.sky[0]);
  sky.addColorStop(0.55, grade.sky[1]);
  sky.addColorStop(1, grade.sky[2]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  rects.forEach((rect, i) => {
    drawPhotoInPanel(ctx, photos[i] ?? null, rect, crops[i]);
  });

  // White gutters between panels, like a comic-book poster.
  ctx.fillStyle = '#f8f2ff';
  rects.forEach((r) => {
    ctx.fillRect(r.x + r.w - 3, r.y, 6, r.h);
  });
  if (state.layout === 'trio') ctx.fillRect(0, h * 0.5 - 3, w, 6);

  // Sunset sky wash over the top, deepening toward the caption band.
  const wash = ctx.createLinearGradient(0, 0, 0, h);
  wash.addColorStop(0, grade.wash);
  wash.addColorStop(0.55, 'rgba(0,0,0,0)');
  wash.addColorStop(1, grade.deep);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);

  // Low retro sun peeking above the caption band, small enough to stay
  // out of the faces: a disc with horizontal slats cut through it.
  const sunX = w * 0.80;
  const sunY = h * 0.74;
  const sunR = w * 0.055;
  const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 2.2);
  glow.addColorStop(0, grade.sun);
  glow.addColorStop(0.4, grade.sky[0] + '66');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - sunR * 2.2, sunY - sunR * 2.2, sunR * 4.4, sunR * 4.4);
  ctx.save();
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = grade.sun;
  ctx.fillRect(sunX - sunR, sunY - sunR, sunR * 2, sunR * 2);
  ctx.fillStyle = 'rgba(10, 4, 22, 0.85)';
  for (let i = 0; i < 3; i += 1) {
    const sy = sunY + sunR * (0.1 + i * 0.28);
    ctx.fillRect(sunX - sunR, sy, sunR * 2, sunR * 0.09);
  }
  ctx.restore();

  // Thin neon horizon line across the poster.
  ctx.fillStyle = grade.accent;
  ctx.fillRect(0, h * 0.66, w, Math.max(3, h * 0.004));

  // Caption band: big Anton capitals, white with a dark outline.
  const caption = (state.caption || 'VICE CITY').trim().toUpperCase();
  const bandH = h * 0.22;
  ctx.fillStyle = 'rgba(10, 4, 22, 0.55)';
  ctx.fillRect(0, h - bandH, w, bandH);
  ctx.shadowColor = 'rgba(0,0,0,0.65)';
  ctx.shadowBlur = h * 0.012;
  ctx.shadowOffsetY = h * 0.004;
  fitText(ctx, caption, w / 2, h - bandH * 0.28, w * 0.92, h * 0.115, 'Anton, sans-serif', '#ffffff', '#160a24');
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  const sub = (state.subcaption || '').trim().toUpperCase();
  if (sub) {
    fitText(ctx, sub, w / 2, h - bandH * 0.08, w * 0.8, h * 0.032, 'bold sans-serif', grade.accent, null);
  }

  // Vignette to hold the edges together.
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(10,2,24,0.42)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}
