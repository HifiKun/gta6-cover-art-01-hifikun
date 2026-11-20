// Fixed scenes for screenshots: ?shot=editor shows the editor with sample photos
// loaded in the panels; ?shot=cover shows the exported-style cover alone.
// `photo` picks the first sample, `photo2` the second, `caption` the words,
// `size` the export size (square, portrait, wide) and `grade` the colour grade.
// window.__shotReady is set once the cover is painted with fonts loaded.
export async function runShot(shot, query, api) {
  const { state, setPhoto, setStatus, redraw } = api;
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const first = query.get('photo') ?? 'pier';
  const second = query.get('photo2') ?? 'boulevard';
  const size = query.get('size');
  if (size === 'square' || size === 'portrait' || size === 'wide') {
    state.size = size;
    const select = document.getElementById('size');
    if (select) select.value = size;
  }
  const grade = query.get('grade');
  if (grade === 'sunset' || grade === 'neon' || grade === 'pastel') {
    state.grade = grade;
    document.querySelectorAll('#gradeRow button').forEach((b) => {
      b.classList.toggle('on', b.dataset.grade === grade);
    });
  }
  const caption = query.get('caption');
  if (caption !== null) {
    state.caption = caption;
    const input = document.getElementById('caption');
    if (input) input.value = caption;
  }
  const sub = query.get('sub');
  if (sub !== null) {
    state.subcaption = sub;
    const input = document.getElementById('subcaption');
    if (input) input.value = sub;
  }
  await setPhoto(0, `samples/${first}.jpg`);
  await setPhoto(1, `samples/${second}.jpg`);
  await setPhoto(2, `samples/${second}.jpg`);
  setStatus('Sample photos loaded — edit the caption and export.');
  try { await document.fonts.load('100px Anton'); } catch { /* fall back to sans-serif */ }
  await document.fonts.ready;
  redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
