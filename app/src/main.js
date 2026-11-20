// Wires the Vice Cover Maker: photo uploads per panel, crop sliders, layout /
// grade / size picks, caption editing, live preview and PNG export. A
// `?shot=` query instead sets up a fixed scene for screenshots (./shots.js).
import { drawCover, SIZES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const captionInput = document.getElementById('caption');
const subcaptionInput = document.getElementById('subcaption');
const status = document.getElementById('status');
const fillAll = document.getElementById('fillAll');

const state = {
  layout: 'trio',
  grade: 'sunset',
  size: 'square',
  caption: 'Sunset Heist',
  subcaption: 'VICE CITY · EST. 2026',
  fillAll: false,
  photos: [null, null, null],
  crops: [
    { zoom: 1.2, ox: 0, oy: 0 },
    { zoom: 1.2, ox: 0, oy: 0 },
    { zoom: 1.2, ox: 0, oy: 0 },
  ],
};
let selectedPanel = 0;

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function redraw() {
  drawCover(canvas, state);
}

function setStatus(text) {
  status.textContent = text;
}

/** Refreshes the crop sliders from the selected panel's stored crop. */
function syncSliders() {
  const crop = state.crops[selectedPanel];
  const zoom = document.getElementById('zoom');
  const offX = document.getElementById('offX');
  const offY = document.getElementById('offY');
  zoom.value = crop.zoom;
  offX.value = crop.ox;
  offY.value = crop.oy;
  document.getElementById('zoomOut').textContent = `${Number(crop.zoom).toFixed(2)}×`;
  document.getElementById('offXOut').textContent = String(crop.ox);
  document.getElementById('offYOut').textContent = String(crop.oy);
}

function bindSlider(id, key, outId, format) {
  document.getElementById(id).addEventListener('input', (e) => {
    const value = Number(e.target.value);
    state.crops[selectedPanel][key] = value;
    document.getElementById(outId).textContent = format(value);
    redraw();
  });
}
bindSlider('zoom', 'zoom', 'zoomOut', (v) => `${v.toFixed(2)}×`);
bindSlider('offX', 'ox', 'offXOut', (v) => String(v));
bindSlider('offY', 'oy', 'offYOut', (v) => String(v));

/** Builds the three photo upload slots and the three crop tabs. */
function buildPhotoSlots() {
  const row = document.getElementById('photoRow');
  const tabs = document.getElementById('panelTabs');
  for (let i = 0; i < 3; i += 1) {
    const slot = document.createElement('div');
    slot.className = 'photo-slot' + (i === 0 ? ' active' : '');
    slot.innerHTML = `<div class="thumb">Panel ${i + 1}</div><button type="button">Add photo ${i + 1}</button><input type="file" accept="image/*">`;
    const thumb = slot.querySelector('.thumb');
    const button = slot.querySelector('button');
    const input = slot.querySelector('input');
    button.addEventListener('click', () => input.click());
    thumb.addEventListener('click', () => selectPanel(i));
    input.addEventListener('change', async () => {
      const file = input.files[0];
      if (!file) return;
      state.photos[i] = await loadImage(URL.createObjectURL(file));
      thumb.style.backgroundImage = `url(${URL.createObjectURL(file)})`;
      thumb.textContent = '';
      selectPanel(i);
      redraw();
      setStatus(`Photo ${i + 1} loaded — crop it, then export.`);
    });
    slot.dataset.slot = String(i);
    row.appendChild(slot);

    const tab = document.createElement('button');
    tab.type = 'button';
    tab.textContent = `Panel ${i + 1}`;
    if (i === 0) tab.classList.add('on');
    tab.addEventListener('click', () => selectPanel(i));
    tabs.appendChild(tab);
  }
}

function selectPanel(i) {
  selectedPanel = i;
  document.querySelectorAll('.photo-slot').forEach((s) => {
    s.classList.toggle('active', Number(s.dataset.slot) === i);
  });
  document.querySelectorAll('#panelTabs button').forEach((b, j) => {
    b.classList.toggle('on', j === i);
  });
  syncSliders();
}

/** Sets a photo into a slot from a URL (samples and screenshots use this). */
export async function setPhoto(i, url) {
  const img = await loadImage(url);
  state.photos[i] = img;
  const slot = document.querySelectorAll('.photo-slot')[i];
  if (slot) {
    const thumb = slot.querySelector('.thumb');
    thumb.style.backgroundImage = `url(${url})`;
    thumb.textContent = '';
  }
  redraw();
  return img;
}

function bindChoiceRow(rowId, key) {
  document.getElementById(rowId).addEventListener('click', (e) => {
    const button = e.target.closest('button[data-' + key + ']');
    if (!button) return;
    state[key] = button.dataset[key];
    document.querySelectorAll(`#${rowId} button`).forEach((b) => {
      b.classList.toggle('on', b === button);
    });
    redraw();
  });
}
bindChoiceRow('layoutRow', 'layout');
bindChoiceRow('gradeRow', 'grade');

document.getElementById('size').addEventListener('change', (e) => {
  state.size = e.target.value;
  redraw();
});
captionInput.addEventListener('input', () => { state.caption = captionInput.value; redraw(); });
subcaptionInput.addEventListener('input', () => { state.subcaption = subcaptionInput.value; redraw(); });
fillAll.addEventListener('change', () => { state.fillAll = fillAll.checked; redraw(); });

document.querySelectorAll('[data-sample]').forEach((button) => {
  button.addEventListener('click', async () => {
    const which = button.dataset.sample;
    if (which === 'pier') await setPhoto(0, 'samples/pier.jpg');
    if (which === 'boulevard') await setPhoto(0, 'samples/boulevard.jpg');
    if (which === 'both') {
      await setPhoto(0, 'samples/pier.jpg');
      await setPhoto(1, 'samples/boulevard.jpg');
      await setPhoto(2, 'samples/boulevard.jpg');
    }
    setStatus('Sample photo loaded — edit the caption and export.');
  });
});

document.getElementById('shuffle').addEventListener('click', () => {
  const grades = ['sunset', 'neon', 'pastel'];
  const next = grades[(grades.indexOf(state.grade) + 1) % grades.length];
  state.grade = next;
  document.querySelectorAll('#gradeRow button').forEach((b) => {
    b.classList.toggle('on', b.dataset.grade === next);
  });
  redraw();
});

document.getElementById('export').addEventListener('click', () => {
  const size = SIZES[state.size];
  const offscreen = document.createElement('canvas');
  drawCover(offscreen, state);
  offscreen.toBlob((blob) => {
    if (!blob) { setStatus('Export failed — try again.'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${size.w}x${size.h}.png`;
    a.click();
    setStatus(`Saved vice-cover-${size.w}x${size.h}.png`);
  }, 'image/png');
});

buildPhotoSlots();
syncSliders();

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, { state, setPhoto, setStatus, redraw });
} else {
  redraw();
}
