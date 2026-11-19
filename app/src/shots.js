// Screenshot scenes for shots.mjs.
//
// Each scene is a full editor state plus the export size the shot shows.
// The scenes are the app's own drawing: "cover" shots render the cover on
// its own canvas at the export's proportions; the "editor" shot shows the
// editor UI with the sample photos loaded across the panels.
//
// Photo indexes: 0 = boulevard.jpg (woman by the convertible, sunset),
// 1 = pier.jpg (fisherman on the pier). Panels alternate the two so every
// cover shows both photos.

export const SHOT_SCENES = {
  cover: {
    layout: 'Hero + Four',
    grade: 'Vice Sunset',
    fill: 'per-panel',
    size: [1920, 1080],
    caption: 'Sunset Heist',
    kicker: 'Leonida Nights',
    texture: 1,
    panels: [0, 1, 0, 1, 0],
  },
  editor: {
    layout: 'Slanted Six',
    grade: 'Neon Nights',
    fill: 'per-panel',
    size: [1920, 1080],
    caption: 'Boulevard Queen',
    kicker: 'Vice After Dark',
    texture: 1,
    panels: [0, 1, 0, 1, 0, 1],
  },
  portrait: {
    layout: 'Cover Story',
    grade: 'Leonida Gold',
    fill: 'per-panel',
    size: [1080, 1350],
    caption: 'Boulevard Queen',
    kicker: 'Golden Hour',
    texture: 1,
    panels: [0, 1, 0, 1],
  },
  square: {
    layout: 'Five Panel',
    grade: 'Midnight Neon',
    fill: 'per-panel',
    size: [1080, 1080],
    caption: 'Neon Palms',
    kicker: 'After Midnight',
    texture: 1,
    panels: [1, 0, 1, 0, 1],
  },
};

// Build the per-panel state array a scene needs: zoom 1, centred, photo
// indexes taken from the scene (cycling if the layout has more panels).
export function scenePanels(scene, count) {
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push({
      photo: scene.panels[i % scene.panels.length],
      zoom: 1,
      ox: 0,
      oy: 0,
    });
  }
  return out;
}
