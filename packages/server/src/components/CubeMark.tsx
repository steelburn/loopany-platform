/**
 * Static brand mark: an isometric Rubik's cube whose three visible faces spell
 * L-O-O — the left face an L, the right and top faces an O (the O is rotationally
 * symmetric, so it reads on the foreshortened top). Classic Rubik stickers on
 * dark plastic like the spinning {@link LoopLogo} — top white, left red, right
 * blue — but a single crisp SVG, also the source of `public/favicon.svg`.
 *
 * `size` is the rendered px box (the cube sits in a 0–100 viewBox).
 */

// 3x3 sticker maps, row-major (1 = lit with the face hue, 0 = dark plastic).
//   L            O
//   X . .        X X X
//   X . .        X . X
//   X X X        X X X
const L = [1, 0, 0, 1, 0, 0, 1, 1, 1]
const O = [1, 1, 1, 1, 0, 1, 1, 1, 1]

const FRAME = '#0b0b0b' // cube body showing through the sticker gaps
const OFF = '#232323' // unlit plastic

// Sticker grid in each face's local 0–30 space (ratios mirror LoopLogo's CSS).
const PAD = 1.65
const STEP = 9.45
const CELL = 7.8
const RC = 1.8 // sticker corner radius
const RF = 3.9 // face corner radius
const DV = 34 / 30 // vertical foreshortening of the side faces

// Each visible face: a 2x3 affine matrix mapping local 0–30 → the iso parallelogram,
// its letter map, and its classic Rubik hue (matching LoopLogo's L/O/O order).
const FACES: Array<{ m: number[]; map: number[]; on: string }> = [
  { m: [1, 0.5, 1, -0.5, 20, 29], map: O, on: '#ededed' }, // top — white O
  { m: [1, 0.5, 0, DV, 20, 29], map: L, on: '#D71921' }, // left — red L
  { m: [1, -0.5, 0, DV, 50, 44], map: O, on: '#0051BA' }, // right — blue O
]

function Face({ m, map, on }: { m: number[]; map: number[]; on: string }) {
  return (
    <g transform={`matrix(${m.join(' ')})`}>
      <rect x={0} y={0} width={30} height={30} rx={RF} fill={FRAME} />
      {map.map((cell, k) => (
        <rect
          key={k}
          x={PAD + (k % 3) * STEP}
          y={PAD + Math.floor(k / 3) * STEP}
          width={CELL}
          height={CELL}
          rx={RC}
          fill={cell ? on : OFF}
        />
      ))}
    </g>
  )
}

export function CubeMark({ size = 52 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="LoopAny">
      {FACES.map((f, i) => (
        <Face key={i} {...f} />
      ))}
    </svg>
  )
}
