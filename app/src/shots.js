// Fixed scenes for screenshots: ?shot=cover renders one exported cover alone on
// the page (the app's own drawing of it, at the export's own proportions);
// ?shot=editor shows the editor with the sample photos loaded across the
// panels. window.__shotReady is set once the scene is painted, fonts included.
export async function runShot(shot, query, api) {
  const { state, samples, redraw } = api;
  if (query.get('layout')) state.layout = query.get('layout');
  if (query.get('grade')) state.grade = query.get('grade');
  if (query.get('size')) state.size = query.get('size');
  if (query.get('mode')) state.mode = query.get('mode');
  if (query.get('caption')) state.caption = query.get('caption');
  if (query.get('kicker')) state.kicker = query.get('kicker');
  document.getElementById('caption').value = state.caption;
  document.getElementById('kicker').value = state.kicker;
  document.getElementById('layout').value = state.layout;
  document.getElementById('grade').value = state.grade;
  document.getElementById('size').value = state.size;
  document.getElementById('mode').value = state.mode;
  const [pier, boulevard] = samples;
  const hero = query.get('photo') === 'boulevard' ? boulevard : pier;
  const other = hero === pier ? boulevard : pier;
  const count = state.panels.length || 3;
  state.panels = Array.from({ length: Math.max(count, 5) }, (_, i) => ({
    img: i === 0 ? hero : (i % 2 ? other : hero),
    ox: 0, oy: 0, zoom: i === 0 ? 1 : 1.12,
  }));
  if (shot === 'cover') document.body.classList.add('shot-cover');
  try { await document.fonts.ready; } catch { /* the fallback face still letters */ }
  redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
