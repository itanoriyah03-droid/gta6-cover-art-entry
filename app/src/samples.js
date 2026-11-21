// Golden Tide Cover Studio — sample scenes.
//
// Seven original illustrations painted for this studio (see the painter in the
// build notes): portraits, a car, a boat and a motel sign, all in the same Vice
// City sunset palette. Each portrait carries its face anchor — the point the
// face-aware crop keeps in frame — so a face is never cut by a panel edge.
// Photos a person uploads have no anchor; the editor lets them drag the photo
// and tap "Center on face" after clicking the face instead.

export const SAMPLES = [
  {
    id: 'boulevard',
    name: 'Boulevard',
    src: 'samples/boulevard.jpg',
    face: { x: 0.59, y: 0.41 },
    blurb: 'Golden-hour portrait by the convertible',
  },
  {
    id: 'rooftop',
    name: 'Rooftop',
    src: 'samples/rooftop.jpg',
    face: { x: 0.5, y: 0.35 },
    blurb: 'Dusk on the hotel roof, skyline behind',
  },
  {
    id: 'neon',
    name: 'Neon Street',
    src: 'samples/neon.jpg',
    face: { x: 0.4, y: 0.38 },
    blurb: 'Two friends laughing outside the diner',
  },
  {
    id: 'pier',
    name: 'The Pier',
    src: 'samples/pier.jpg',
    face: { x: 0.5, y: 0.3 },
    blurb: 'Bucket hat, fishing rod, turquoise water',
  },
  {
    id: 'car',
    name: 'The Getaway',
    src: 'samples/car.jpg',
    face: null,
    focus: { x: 0.5, y: 0.55 },
    blurb: 'Red supercar, sunset boulevard',
  },
  {
    id: 'boat',
    name: 'The Boat',
    src: 'samples/boat.jpg',
    face: null,
    focus: { x: 0.5, y: 0.48 },
    blurb: 'Speedboat cutting turquoise water',
  },
  {
    id: 'motel',
    name: 'Palm Court',
    src: 'samples/motel.jpg',
    face: null,
    focus: { x: 0.5, y: 0.42 },
    blurb: 'The motel sign, vacancy lit',
  },
];

// The cover the studio opens with: six panels from the samples, each with its
// role tag, the hero close-up in the top centre of the grid.
export const DEFAULT_PANELS = [
  { photo: 'boulevard', role: 'THE DRIVER' },
  { photo: 'rooftop', role: 'THE BOSS' },
  { photo: 'neon', role: 'THE LOOKOUT' },
  { photo: 'car', role: 'THE GETAWAY' },
  { photo: 'pier', role: 'THE CAPTAIN' },
  { photo: 'motel', role: 'THE HIDEOUT' },
];

// Role tags the editor offers when a panel gets a new photo.
export const ROLE_SUGGESTIONS = [
  'THE DRIVER',
  'THE BOSS',
  'THE LOOKOUT',
  'THE GETAWAY',
  'THE CAPTAIN',
  'THE HIDEOUT',
  'THE FIXER',
  'THE BRAINS',
  'THE RIDER',
  'THE MECHANIC',
  'THE ESCAPE',
  'THE ENFORCER',
];

export function sampleById(id) {
  return SAMPLES.find((s) => s.id === id) ?? SAMPLES[0];
}
