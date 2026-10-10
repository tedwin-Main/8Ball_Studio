// The Intro Draft 1 rack: ball colours and the order the numbered balls are set in the rack.
// Plain data with no three.js import, so node tests and the Pool Table look can read it too.

// Colour of ball N at index N - 1 (the stripes 9-15 repeat the solids 1-7).
export const BALL_COLORS = Object.freeze( [
  '#f5b818', '#1b46a2', '#cb242a', '#59287a', '#e76317',
  '#126d40', '#7a1d33', '#0a0c0a', '#f5b818', '#1b46a2',
  '#cb242a', '#59287a', '#e76317', '#126d40', '#7a1d33',
] )

// Keep the rack legal while placing the 7-ball on the right corner's sideways release path.
// Simulation ball index i + 1 is this list's entry i; simulation index 0 is the striker 8-ball.
export const RACK_BALL_NUMBERS = Object.freeze( [
  1,
  5, 11,
  3, 8, 10,
  4, 13, 14, 2,
  9, 12, 15, 6, 7,
] )
