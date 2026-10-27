// Where the pipeline animation puts everything: the scene's geometry, the
// arrangements of the generators' tiles around the pool, and the layout
// picking the one that fits the canvas best.

import { COS, projection } from '../canvas.mjs';
import { FREED, IDS, READERS, STAGES, THREADS } from './build.mjs';

export const MONO = '"IBM Plex Mono", ui-monospace, monospace';
const SANS = '"Inter Variable", system-ui, sans-serif';
export const SMALL = `500 12px ${MONO}`;

// Onto the middle of a pixel, so the slabs' upright edges are crisp
export const snap = ([x, y]) => [
  Math.round(x - 0.5) + 0.5,
  Math.round(y - 0.5) + 0.5,
];

const distanceOf = ([x, y], [ox, oy]) => Math.hypot(ox - x, oy - y);

// A line through points, each with how far along it lies
export const stopsOf = points => {
  let along = 0;
  return points.map((point, index) => {
    along += index ? distanceOf(points[index - 1], point) : 0;
    return [point, along];
  });
};

// The point `distance` along a line through `stops`
export const pointOn = (stops, distance) => {
  for (let index = 1; index < stops.length; index++) {
    const [[px, py], from] = stops[index - 1];
    const [[x, y], to] = stops[index];
    if (distance <= to || index === stops.length - 1) {
      const t =
        to > from ? Math.min(1, Math.max(0, distance - from) / (to - from)) : 0;
      return [px + (x - px) * t, py + (y - py) * t];
    }
  }
  return stops[0][0];
};

// Each straight run of a line through `stops`, with how far along it starts
// and ends
export const piecesOf = stops =>
  stops
    .slice(1)
    .map(([point, to], index) => [stops[index][0], point, stops[index][1], to]);

// A line through points with its corners rounded off, `radius` pixels round,
// as points close enough together to draw it by
export const rounded = (points, radius) => [
  points[0],
  ...points.slice(1, -1).flatMap((corner, index) => {
    const [before, after] = [points[index], points[index + 2]];
    const round = Math.min(
      radius,
      distanceOf(before, corner) / 2,
      distanceOf(corner, after) / 2
    );
    const toward = (point, by) =>
      corner.map(
        (value, axis) =>
          value + ((point[axis] - value) * by) / distanceOf(corner, point)
      );
    const [from, to] = [toward(before, round), toward(after, round)];
    return Array.from({ length: 7 }, (_, step) => {
      const t = step / 6;
      return corner.map(
        (value, axis) =>
          (1 - t) ** 2 * from[axis] + 2 * (1 - t) * t * value + t * t * to[axis]
      );
    });
  }),
  points.at(-1),
];

// A chunk's flight from one point to another, in an arc rising `lift` pixels
// over the higher of them
export const arc = (from, to, lift) => {
  const bend = [
    (from[0] + to[0]) / 2,
    Math.max(4, Math.min(from[1], to[1]) - lift),
  ];
  return Array.from({ length: 13 }, (_, step) => {
    const t = step / 12;
    return from.map(
      (value, axis) =>
        (1 - t) ** 2 * value + 2 * (1 - t) * t * bend[axis] + t * t * to[axis]
    );
  });
};

// The scene, in the pool's units, its half width being 1: its slab, and a
// lane on it for each thread
export const POOL_HEIGHT = 0.2;
export const LANES = [-0.69, -0.23, 0.23, 0.69];
export const LANE = [0.17, 0.62];
export const LANE_HEIGHT = 0.05;
// A generator's tile, as the hero's
export const TILE = 0.3;
export const TILE_HEIGHT = 0.16;
// A result piled on its tile: a sheet for each chunk collected, four at
// most, this many pixels apart, and the pile's half width, in the tile's
export const SHEETS = 4;
export const SHEET = 3;
export const PILE = 0.66;
// A file rising off an output: how far, in pixels, and its half width, in
// the tile's
export const LIFT = 16;
export const FILE = 0.55;

/**
 * The arrangements. Each places a tile for every generator around the pool,
 * at `x`, `y` in its units (x running down to the right, y down to the left,
 * as in the hero), with the side its label reads on, the turns each rail
 * takes from a generator's tile to its reader's (readers sharing a rail as
 * far as they go the same way), where the pool's name reads, the middle of
 * the floor, and the smallest scale it is drawn at.
 *
 * Around the pool, the sources and `ast` run up its back to `metadata`, whose
 * result goes on to the search index and along a spine round its right, a
 * spur leaving it for each of its other readers: `jsx-ast` first, with `html`
 * beside it on a rail of its own, then `json` and the text outputs down the
 * side, `SIDE` apart. Whatever works on the pool stands next to it, so its
 * chunks fly over nothing but rails.
 */
const SIDE = 1.35;
const AROUND = {
  tiles: {
    docs: [-1.55, 1.7, 'left'],
    ast: [-1.55, 0, 'left'],
    metadata: [-1.55, -1.7, 'left'],
    search: [-1.55, -3.45, 'left'],
    jsx: [1.55, -2.45, 'right'],
    html: [-0.4, -2.45, 'right'],
    json: [2.3, -1, 'right'],
    llms: [2.3, -1 + SIDE, 'right'],
    full: [2.3, -1 + SIDE * 2, 'right'],
    sitemap: [2.3, -1 + SIDE * 3, 'right'],
  },
  turns: {
    jsx: [[1.55, -1.7]],
    json: [
      [1.55, -1.7],
      [1.55, -1],
    ],
    llms: [
      [1.55, -1.7],
      [1.55, -1 + SIDE],
    ],
    full: [
      [1.55, -1.7],
      [1.55, -1 + SIDE * 2],
    ],
    sitemap: [
      [1.55, -1.7],
      [1.55, -1 + SIDE * 3],
    ],
  },
  name: [-0.35, 2, 'center'],
  floor: [0, 0],
  min: 38,
};

/**
 * Readers hanging off a trunk running down from `start`: a step down to the
 * left and one down to the right for each, so it goes straight down the
 * screen, and from each junction a spur going on to the right to its tile,
 * `spur` units off, with its label beyond.
 */
const comb = ([x, y], step, spur, readers) => {
  const junction = index => [x + index * step, y + index * step];
  const tiles = {};
  const turns = {};
  readers.forEach((id, index) => {
    const [jx, jy] = junction(index);
    tiles[id] = [jx + spur, jy, 'right'];
    turns[id] = Array.from({ length: index * 2 + 1 }, (_, turn) =>
      turn % 2
        ? [junction((turn - 1) / 2)[0], junction((turn + 1) / 2)[1]]
        : junction(turn / 2)
    );
  });
  return { tiles, turns };
};

// On a phone: the sources and `ast` along the pool's back and right,
// `metadata` off its front, and its readers in a column under it, each on a
// spur off one trunk, `html` under `jsx-ast` on a rail of its own, a little
// further down for both their labels' second lines. Their chunks fly up the
// aisle between the trunk and the column (where floor x - y is `aisle`),
// over nothing but rails, and in under the pool's front.
const TRUNK = [2.4, 1.4];
const SPUR = 1.15;
const READ = comb(TRUNK, 0.9, SPUR, [
  'json',
  'search',
  'llms',
  'full',
  'sitemap',
  'jsx',
]);
const [JSX_X, JSX_Y] = READ.tiles.jsx;
const COMPACT = {
  tiles: {
    docs: [-0.15, -1.6, 'right'],
    ast: [1.6, -1.6, 'right'],
    metadata: [2.4, 0.4, 'right'],
    ...READ.tiles,
    html: [JSX_X + 1.05, JSX_Y + 1.05, 'right'],
  },
  turns: {
    metadata: [[1.6, 0.4]],
    ...READ.turns,
    html: [[JSX_X, JSX_Y + 1.05]],
  },
  name: [0.5, 2.4, 'center'],
  floor: [3, 3],
  // Midway between the trunk's junctions and the near corners of the tiles
  aisle: TRUNK[0] - TRUNK[1] + (SPUR - 2 * TILE) / 2,
  min: 24,
};

const LAYOUTS = [AROUND, COMPACT];

// The type sizes to try, roomiest first and none under 12px, and the labels
// with a line under them besides the outputs counting what they write and
// the results that get freed
const STYLES = [
  { title: 12.5, line: 12, subs: ['docs', 'metadata'] },
  { title: 12.5, line: 12, subs: [] },
  { title: 12, line: 12, subs: [], short: true },
];

// Room around the scene, and from a tile to its label, in pixels
const INSET = 6;
const LABEL = 7;
// How far apart tiles stand on the floor, at least, in units
const APART = 0.25;
// How high a chunk's arc may rise, lowest first, in units
const LIFTS = [0.2, 0.35, 0.5, 0.7, 0.9, 1.2, 1.5, 1.9];
// The height the memory trace takes, under the scene
const MEMORY = 82;

export const POOL_NAME = 'worker pool';
export const POOL_LINE = `${THREADS} threads`;

const NOTES = [
  'each result freed after its last reader',
  'freed after its last reader',
  'freed after last reader',
];

const overlaps = (a, b) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

// A rail from the edge of one tile to the edge of the other, not their
// middles, so a freed one, only an outline, shows none of it: out from under
// its top, on the two sides behind it
const trim = path =>
  path.map((point, index) => {
    if (index && index < path.length - 1) {
      return point;
    }
    const [x, y] = point;
    const [nx, ny] = path[index ? index - 1 : 1];
    const span = Math.hypot(nx - x, ny - y);
    const edge = nx < x || ny < y ? TILE + TILE_HEIGHT : TILE;
    return [x + ((nx - x) / span) * edge, y + ((ny - y) / span) * edge];
  });

// Whether a point on the floor lies on a rail between two others, short of
// both (the rails run along the floor's lines)
const between = ([x, y], [ax, ay], [bx, by]) =>
  Math.abs((bx - ax) * (y - ay) - (by - ay) * (x - ax)) < 1e-6 &&
  Math.min(ax, bx) - 1e-6 <= x &&
  x <= Math.max(ax, bx) + 1e-6 &&
  Math.min(ay, by) - 1e-6 <= y &&
  y <= Math.max(ay, by) + 1e-6 &&
  distanceOf([x, y], [ax, ay]) > 1e-6 &&
  distanceOf([x, y], [bx, by]) > 1e-6;

const keyOf = point => point.map(value => value.toFixed(3)).join();

/**
 * The rails from one generator to its readers, split wherever one leaves
 * another: each stretch once, with how far from the generator it starts and
 * ends, in units, and the junctions, where two or more set off.
 */
const branch = paths => {
  const corners = paths.flat();
  const pieces = new Map();

  for (const path of paths) {
    let along = 0;
    for (let index = 1; index < path.length; index++) {
      const [from, to] = [path[index - 1], path[index]];
      const span = distanceOf(from, to);
      const cuts = [
        0,
        ...corners
          .filter(corner => between(corner, from, to))
          .map(corner => distanceOf(from, corner)),
        span,
      ].sort((a, b) => a - b);
      const at = cut =>
        from.map((value, axis) => value + ((to[axis] - value) * cut) / span);
      for (let cut = 1; cut < cuts.length; cut++) {
        if (cuts[cut] - cuts[cut - 1] > 1e-6) {
          const [start, end] = [at(cuts[cut - 1]), at(cuts[cut])];
          pieces.set(`${keyOf(start)} ${keyOf(end)}`, [
            start,
            end,
            along + cuts[cut - 1],
            along + cuts[cut],
          ]);
        }
      }
      along += span;
    }
  }

  const starts = new Map();
  for (const [start, , from] of pieces.values()) {
    const [, , count = 0] = starts.get(keyOf(start)) ?? [];
    starts.set(keyOf(start), [start, from, count + 1]);
  }

  return {
    pieces: [...pieces.values()],
    junctions: [...starts.values()]
      .filter(([, , count]) => count > 1)
      .map(([point, along]) => [point, along]),
  };
};

/**
 * Where everything sits, for a canvas of the given size: the largest scene
 * that fits, its labels measured at their widest, in the first arrangement
 * where no label runs past the canvas or into a tile, the pool, a rail or
 * another label.
 *
 * @param {CanvasRenderingContext2D} context
 * @param {number} width
 * @param {number} height
 * @param {{ pages: number, documents: number }} totals
 */
export const layout = (context, width, height, totals) => {
  const graphHeight = height - MEMORY;

  const measure = (font, text) => {
    context.font = font;
    return context.measureText(text).width;
  };

  const arrange = ({ tiles, turns, name, floor, aisle, min }, style) => {
    const titleFont = `600 ${style.title}px ${MONO}`;
    const subFont = `400 ${style.line}px ${SANS}`;
    const countFont = `600 ${style.line}px ${MONO}`;
    const tallOf = line =>
      line ? style.title + style.line + 4 : style.title + 2;

    // Each label's title, whether it has a line under it, and its size
    const labels = Object.fromEntries(
      IDS.map(id => {
        const { title, short, sub, count, items } = STAGES[id];
        const text = style.short ? (short ?? title) : title;
        const lines = [
          count && measure(countFont, count(totals[items])),
          style.subs.includes(id) && measure(subFont, sub),
          FREED.includes(id) && measure(subFont, 'freed'),
        ].filter(Boolean);
        const across = Math.max(measure(titleFont, text), ...lines);
        return [
          id,
          {
            text,
            line: lines.length > 0,
            across,
            tall: tallOf(lines.length > 0),
          },
        ];
      })
    );
    labels.pool = {
      text: POOL_NAME,
      line: true,
      across: Math.max(
        measure(titleFont, POOL_NAME),
        measure(countFont, POOL_LINE)
      ),
      tall: tallOf(true),
    };

    // The way each result goes to a reader, from the edge of one tile to
    // the edge of the other
    const rails = Object.fromEntries(
      IDS.filter(id => STAGES[id].from).map(id => [
        id,
        trim([tiles[STAGES[id].from], ...(turns[id] ?? []), tiles[id]]),
      ])
    );

    // A label beside a point, `reach` pixels off it, on its side
    const place = (id, [cx, cy], side, reach) => {
      const { across, tall } = labels[id];
      const left =
        side === 'center'
          ? cx - across / 2
          : side === 'left'
            ? cx - reach - LABEL - across
            : cx + reach + LABEL;
      return {
        id,
        kind: 'label',
        side,
        left,
        right: left + across,
        top: cy - tall / 2,
        bottom: cy + tall / 2,
      };
    };

    // What the scene covers at a scale: each tile with what rises off it,
    // each label, and the pool, in strips across
    const boxesAt = (scale, originX = 0, originY = 0) => {
      const view = projection(scale, originX, originY).point;
      const boxes = [];
      const half = 2 * TILE * COS * scale;

      for (const id of IDS) {
        const [x, y, side] = tiles[id];
        const [cx, cy] = view(x, y);
        // Its back corner, or its pile's, or the files rising off it
        const above = Math.max(
          TILE * scale,
          STAGES[id].size || id === 'docs'
            ? TILE * PILE * scale + SHEETS * SHEET
            : 0,
          STAGES[id].output ? (TILE * FILE + 0.1) * scale + LIFT : 0
        );
        boxes.push({
          id,
          kind: 'tile',
          left: cx - half,
          right: cx + half,
          top: cy - TILE_HEIGHT * scale - above,
          bottom: cy + TILE * scale,
        });
        boxes.push(place(id, [cx, cy - TILE_HEIGHT * scale], side, half));
      }
      boxes.push(place('pool', view(name[0], name[1]), name[2], 0));

      // Its outline: up to its corners, down its sides, to its front
      const across = 2 * COS * scale;
      const top = originY - (1 + POOL_HEIGHT) * scale;
      const bottom = originY + scale;
      const halfAt = level =>
        level < originY - POOL_HEIGHT * scale
          ? (across * (level - top)) / scale
          : level <= originY
            ? across
            : across * (1 - (level - originY) / scale);
      const strips = 24;
      for (let strip = 0; strip < strips; strip++) {
        const from = top + ((bottom - top) * strip) / strips;
        const to = top + ((bottom - top) * (strip + 1)) / strips;
        const reach = Math.max(
          halfAt(from),
          halfAt(to),
          from <= originY && to >= originY - POOL_HEIGHT * scale ? across : 0
        );
        boxes.push({
          kind: 'pool',
          left: originX - reach,
          right: originX + reach,
          top: from,
          bottom: to,
        });
      }

      return boxes;
    };

    const extent = boxes => ({
      left: Math.min(...boxes.map(box => box.left)),
      right: Math.max(...boxes.map(box => box.right)),
      top: Math.min(...boxes.map(box => box.top)),
      bottom: Math.max(...boxes.map(box => box.bottom)),
    });

    const fits = scale => {
      const { left, right, top, bottom } = extent(boxesAt(scale));
      return (
        right - left <= width - INSET * 2 &&
        bottom - top <= graphHeight - INSET * 2
      );
    };

    let low = 4;
    let high = 90;
    for (let step = 0; step < 24; step++) {
      const middle = (low + high) / 2;
      if (fits(middle)) {
        low = middle;
      } else {
        high = middle;
      }
    }
    const scale = low;
    const bounds = extent(boxesAt(scale));
    const originX = Math.round(
      (width - (bounds.right - bounds.left)) / 2 - bounds.left
    );
    const originY = Math.round(
      (graphHeight - (bounds.bottom - bounds.top)) / 2 - bounds.top
    );
    const view = projection(scale, originX, originY).point;
    const boxes = boxesAt(scale, originX, originY);

    // A label clears every tile but its own, the pool and the other labels
    const labelled = boxes.filter(({ kind }) => kind === 'label');
    const clashes = labelled.some(box =>
      boxes.some(
        other => other !== box && other.id !== box.id && overlaps(box, other)
      )
    );

    // The tiles stand apart on the floor, and off the pool
    const stands = [
      ...IDS.map(id => [...tiles[id].slice(0, 2), TILE]),
      [0, 0, 1],
    ];
    const crowded = stands.some(([x, y, half], index) =>
      stands
        .slice(index + 1)
        .some(
          ([ox, oy, other]) =>
            Math.abs(x - ox) < half + other + APART &&
            Math.abs(y - oy) < half + other + APART
        )
    );

    // Each rail on screen, with how far along it each turn lies
    const paths = Object.fromEntries(
      Object.entries(rails).map(([id, path]) => {
        const stops = stopsOf(path);
        return [
          id,
          {
            stops: stops.map(([point, along]) => [
              snap(view(...point)),
              along * scale,
            ]),
            length: stops.at(-1)[1] * scale,
          },
        ];
      })
    );

    // And no rail runs under a label, checked every few pixels along it
    const under = ([x, y]) =>
      labelled.some(
        box =>
          x > box.left - 2 &&
          x < box.right + 2 &&
          y > box.top - 2 &&
          y < box.bottom + 2
      );
    const crossed = Object.values(paths).some(({ stops, length }) => {
      for (let along = 0; along <= length; along += 3) {
        if (under(pointOn(stops, along))) {
          return true;
        }
      }
      return false;
    });

    // For each generator, its rails to its readers, each stretch once, how
    // far its result goes, and the junctions where they part
    const branches = Object.fromEntries(
      IDS.filter(id => READERS[id].length).map(id => {
        const { pieces, junctions } = branch(
          READERS[id].map(reader => rails[reader])
        );
        return [
          id,
          {
            pieces: pieces.map(([start, end, from, to]) => [
              snap(view(...start)),
              snap(view(...end)),
              from * scale,
              to * scale,
            ]),
            junctions: junctions.map(([point, along]) => [
              snap(view(...point)),
              along * scale,
            ]),
            reach: Math.max(...READERS[id].map(reader => paths[reader].length)),
          },
        ];
      })
    );

    const memoryLabel = measure(SMALL, 'memory');
    const note =
      NOTES.find(text => memoryLabel + 16 + measure(subFont, text) <= width) ??
      NOTES.at(-1);

    return {
      fine: scale >= min && !clashes && !crowded && !crossed,
      scale,
      style,
      titleFont,
      subFont,
      countFont,
      labels,
      places: Object.fromEntries(labelled.map(box => [box.id, box])),
      view,
      tiles: Object.fromEntries(
        IDS.map(id => {
          const [x, y, side] = tiles[id];
          return [id, { id, x, y, side }];
        })
      ),
      // Back to front
      order: IDS.map(id => ({ id, depth: tiles[id][0] + tiles[id][1] }))
        .sort((a, b) => a.depth - b.depth)
        .map(({ id }) => id),
      boxes,
      paths,
      branches,
      floor,
      // Up the aisle fly the chunks of whatever stands past `metadata`
      aisle:
        aisle === undefined
          ? null
          : {
              x: originX + aisle * COS * scale,
              past: tiles.metadata[0] + tiles.metadata[1],
            },
      note,
      memoryTop: graphHeight + 12,
    };
  };

  const tries = LAYOUTS.flatMap(arrangement =>
    STYLES.map(style => arrange(arrangement, style))
  );

  // Of the arrangements that fit, in their roomiest type that does, the one
  // drawn largest
  const fitting = LAYOUTS.map((_, index) =>
    tries
      .slice(index * STYLES.length, (index + 1) * STYLES.length)
      .find(({ fine }) => fine)
  ).filter(Boolean);
  const scene = fitting.length
    ? fitting.reduce((best, next) => (next.scale > best.scale ? next : best))
    : tries.at(-1);

  // How high each chunk's arc rises, from its generator to each thread: the
  // lowest that passes clear of the labels and the other tiles
  const { tiles, view, scale, boxes } = scene;
  const margin = 0.12 * scale + 2;
  scene.lifts = Object.fromEntries(
    IDS.filter(id => STAGES[id].items).map(id => {
      const { x, y } = tiles[id];
      const from = view(x, y, TILE_HEIGHT + (SHEETS * SHEET) / scale);
      const hits = point =>
        boxes.some(
          box =>
            (box.kind === 'label' || (box.kind === 'tile' && box.id !== id)) &&
            point[0] > box.left - margin &&
            point[0] < box.right + margin &&
            point[1] > box.top - 3 &&
            point[1] < box.bottom + 3
        );
      const clear = to => lift => {
        const stops = stopsOf(arc(from, to, lift));
        for (let along = 0; along <= stops.at(-1)[1]; along += 3) {
          if (hits(pointOn(stops, along))) {
            return false;
          }
        }
        return true;
      };
      return [
        id,
        LANES.map(lane => {
          const to = view(lane, 0, POOL_HEIGHT + LANE_HEIGHT);
          return LIFTS.map(lift => lift * scale).find(clear(to)) ?? 0.5 * scale;
        }),
      ];
    })
  );

  return scene;
};
