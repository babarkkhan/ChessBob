/**
 * Chess piece artwork.
 *
 * Drawn for this project, so the repository carries no third-party asset licence at
 * all -- no attribution requirement, no share-alike, nothing to resolve before a
 * commercial build (see docs/adr/0007-build-stages.md). They are MIT with the rest of
 * the repo.
 *
 * Deliberately geometric rather than Staunton. A flat set reads more clearly at the
 * ~65px squares this board uses on a 1024x600 panel than a detailed carved set would,
 * and it is honest about being its own thing rather than an imitation of anyone's.
 *
 * Each piece is drawn on a 45x45 viewBox, matching the convention most chess sets use.
 * Colour comes from CSS custom properties so the same paths serve both sides.
 */

const PATHS = {
  // Round head, flared body, wide base.
  p: `
    <circle cx="22.5" cy="13" r="6.5"/>
    <path d="M16 20 h13 c0 5 -3 7 -3.5 11 h-6 C19 27 16 25 16 20 Z"/>
    <path d="M12.5 37 c0 -4 4 -5 5.5 -6 h9 c1.5 1 5.5 2 5.5 6 z"/>
  `,
  // Three battlements, straight body, wide base.
  r: `
    <path d="M11 11 h4.5 v3 h4 v-3 h4 v3 h4 v-3 H32 v6 l-3 3 v11 l3 3 v4 H11 v-4 l3 -3 V20 l-3 -3 Z"/>
    <path d="M9 37 h27 v4 H9 z"/>
  `,
  // Mitre with the traditional slit, small finial.
  b: `
    <circle cx="22.5" cy="9" r="2.8"/>
    <path d="M22.5 12 c6 4 9 9 9 14 c0 4 -3 7 -9 7 s-9 -3 -9 -7 c0 -5 3 -10 9 -14 Z"/>
    <path d="M19.6 24.6 l7.2 -8.2 l2 1.8 l-7.2 8.2 z" class="cut"/>
    <path d="M12 37 c2 -3 5 -4 10.5 -4 s8.5 1 10.5 4 z"/>
  `,
  // Stylised horse head. Chunky on purpose so it survives being scaled down.
  n: `
    <path d="M24 6 l3.2 4.6 c4.6 2.8 6.8 8.6 6.8 14.4 0 3.6 -0.5 6.4 -1 8h-19
             c0.4 -4 2 -7 4.6 -9.4 l-4.2 2.4 c-3 1 -5.2 -2 -3.2 -4.8 l7 -9
             c1.8 -2.6 3.6 -4.4 5.8 -6.2 z"/>
    <circle cx="19.4" cy="16.2" r="1.5" class="cut"/>
    <path d="M11.5 37 h22 v4 h-22 z"/>
  `,
  // Five-point crown, tapered body, wide base.
  q: `
    <circle cx="8" cy="12" r="2.6"/><circle cx="15.5" cy="9" r="2.6"/>
    <circle cx="22.5" cy="7.5" r="2.8"/>
    <circle cx="29.5" cy="9" r="2.6"/><circle cx="37" cy="12" r="2.6"/>
    <path d="M9 15 l3.5 13 h20 L36 15 l-5.5 6 l-2 -8 l-3 8 h-6 l-3 -8 l-2 8 Z"/>
    <path d="M12 30 h21 c1 3 1 5 0 7 H12 c-1 -2 -1 -4 0 -7 Z"/>
  `,
  // Cross above a rounded body.
  k: `
    <path d="M21.2 5 h2.6 v3.2 H27 v2.6 h-3.2 V14 h-2.6 v-3.2 H18 V8.2 h3.2 Z" class="cross"/>
    <path d="M22.5 15 c5 0 9 3.5 9 8 c0 4 -3 7 -4 10 h-10 c-1 -3 -4 -6 -4 -10
             c0 -4.5 4 -8 9 -8 Z"/>
    <path d="M12 37 c2 -3 5 -4 10.5 -4 s8.5 1 10.5 4 z"/>
  `,
};

/**
 * SVG markup for one piece.
 *
 * @param {'p'|'n'|'b'|'r'|'q'|'k'} type
 * @param {'w'|'b'} colour
 * @returns {string}
 */
export function pieceSvg(type, colour) {
  return `<svg class="piece piece--${colour}" viewBox="0 0 45 45" aria-hidden="true">
    <g>${PATHS[type]}</g>
  </svg>`;
}

/** Full names, for the promotion picker and announcements. */
export const PIECE_NAME = {
  p: 'Pawn',
  n: 'Knight',
  b: 'Bishop',
  r: 'Rook',
  q: 'Queen',
  k: 'King',
};
