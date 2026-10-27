import withIsland from '@doc-kit/generator-react/html/ui/islands/withIsland.jsx';
import { useEffect, useRef } from 'preact/hooks';

import {
  COLORS,
  DIM,
  animate,
  drawFloor,
  fitCanvas,
  polygon,
  readColors,
  slab,
  withAlpha,
} from './canvas.mjs';
import {
  HOP,
  IDS,
  LINGER,
  RISE,
  SAMPLE,
  STAGES,
  advance,
  createBuild,
  record,
} from './pipeline/build.mjs';
import {
  FILE,
  LANE,
  LANE_HEIGHT,
  LANES,
  LIFT,
  MONO,
  PILE,
  POOL_HEIGHT,
  POOL_LINE,
  POOL_NAME,
  SHEET,
  SHEETS,
  SMALL,
  TILE,
  TILE_HEIGHT,
  arc,
  layout,
  piecesOf,
  pointOn,
  rounded,
  snap,
  stopsOf,
} from './pipeline/layout.mjs';

// The hero's colors, the memory trace's base line, and the page's muted
// tone, which a freed result's outline is drawn in, as the diagrams draw a
// ghost
const PALETTE = [...COLORS, 'c-line', 'fg-3'];

// In ms: the rest on the finished build, and its fading back to idle before
// the next
const PAUSE = 2200;
const RESET = 500;

// In ms: a result fading once it is freed, and half a breath of the work on
// the main thread
const FADE = 500;
const BREATH = 700;

// The pulse a result sends along its rails, and the trail a chunk leaves,
// in pixels
const TRAIL = 28;
const WAKE = 12;

const ease = t => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/**
 * Draws a moment of a build onto `context`: `build` as `scene` lays it out,
 * in `colors`, and under it the memory `profile` of a whole run. `lights`
 * holds how lit each tile, lane and the pool show, which ease down by `dim`
 * this frame.
 *
 * @param {CanvasRenderingContext2D} context
 * @param {object} state
 */
const paint = (
  context,
  { scene, colors, profile, build, lights, dim, width, height, ratio }
) => {
  const measure = text => context.measureText(text).width;

  // A light easing down from where it was, rather than going out at once
  const lightOf = (key, target) => {
    lights[key] = Math.max(target, (lights[key] ?? 0) - dim);
    return lights[key];
  };

  // A freed result's tile: only its edges, dashed, in the muted tone, as
  // the diagrams draw a ghost, each edge once so the dashes stay even
  const ghost = (x, y) => {
    const p = (dx, dy, dz) =>
      snap(scene.view(x + dx * TILE, y + dy * TILE, dz * TILE_HEIGHT));
    const edges = [
      [p(-1, -1, 1), p(1, -1, 1)],
      [p(1, -1, 1), p(1, 1, 1)],
      [p(1, 1, 1), p(-1, 1, 1)],
      [p(-1, 1, 1), p(-1, -1, 1)],
      [p(-1, 1, 1), p(-1, 1, 0)],
      [p(1, 1, 1), p(1, 1, 0)],
      [p(1, -1, 1), p(1, -1, 0)],
      [p(-1, 1, 0), p(1, 1, 0)],
      [p(1, 1, 0), p(1, -1, 0)],
    ];
    context.beginPath();
    for (const [from, to] of edges) {
      context.moveTo(...from);
      context.lineTo(...to);
    }
    context.setLineDash([3, 4]);
    context.lineWidth = 1;
    context.strokeStyle = colors['fg-3'];
    context.stroke();
    context.setLineDash([]);
  };

  // A chunk, or a file: a sheet lying flat, `half` units across
  const sheet = (x, y, z, half, alpha = 1) => {
    const { view } = scene;
    polygon(context, [
      view(x - half, y - half, z),
      view(x + half, y - half, z),
      view(x + half, y + half, z),
      view(x - half, y + half, z),
    ]);
    context.fillStyle = withAlpha(colors['c-face'], 0.9 * alpha);
    context.fill();
    context.lineWidth = 1;
    context.strokeStyle = withAlpha(colors['c-pulse'], 0.75 * alpha);
    context.stroke();
  };

  // Traces a rail from its start to `distance` along it
  const traceTo = (stops, distance) => {
    context.moveTo(...stops[0][0]);
    for (let index = 1; index < stops.length; index++) {
      const [[px, py], from] = stops[index - 1];
      const [[x, y], to] = stops[index];
      if (distance >= to) {
        context.lineTo(x, y);
        continue;
      }
      const t = (distance - from) / (to - from);
      context.lineTo(px + (x - px) * t, py + (y - py) * t);
      return;
    }
  };

  // A junction, where a reader's spur leaves the rail its result runs on
  const dot = ([x, y], color) => {
    context.beginPath();
    context.arc(x, y, 2.5, 0, Math.PI * 2);
    context.fillStyle = color;
    context.fill();
  };

  // The rails each result takes to its readers, as the hero's, stroked
  // together so the stretches they share are drawn once
  const drawRails = () => {
    context.beginPath();
    for (const { stops, length } of Object.values(scene.paths)) {
      traceTo(stops, length);
    }
    context.lineWidth = 1.2;
    context.lineJoin = 'round';
    context.strokeStyle = colors['c-fg-3'];
    context.stroke();
    for (const { junctions } of Object.values(scene.branches)) {
      for (const [point] of junctions) {
        dot(point, colors['c-fg-3']);
      }
    }
  };

  /**
   * A short bright dash, from `head - tail` to `head` along a line split
   * into straight `pieces` (each from one point to another, and how far
   * along the line they lie), fading towards its tail: each piece stroked
   * once with its own stretch of the fade, as the hero strokes its chunks,
   * up to `strength` at its head.
   */
  const trail = (pieces, head, tail, thickness, strength = 1) => {
    const back = head - tail;
    context.lineWidth = thickness;
    context.lineCap = 'butt';
    for (const [[px, py], [x, y], from, to] of pieces) {
      const start = Math.max(from, back);
      const end = Math.min(to, head);
      if (end - start < 0.01) {
        continue;
      }
      const point = distance => {
        const t = (distance - from) / (to - from);
        return [px + (x - px) * t, py + (y - py) * t];
      };
      const [sx, sy] = point(start);
      const [ex, ey] = point(end);
      const gradient = context.createLinearGradient(sx, sy, ex, ey);
      gradient.addColorStop(
        0,
        withAlpha(colors['c-pulse'], (strength * (start - back)) / tail)
      );
      gradient.addColorStop(
        1,
        withAlpha(colors['c-pulse'], (strength * (end - back)) / tail)
      );
      context.strokeStyle = gradient;
      context.beginPath();
      context.moveTo(sx, sy);
      context.lineTo(ex, ey);
      context.stroke();
    }
  };

  // Whole results on their way to their readers: one pulse running along
  // the rail they share and down every spur at once, lighting the rails
  // and junctions it passes, which stay lit a little once it has arrived
  const drawHandOffs = () => {
    const { paths, branches } = scene;
    const sent = new Map();
    for (const handOff of build.handOffs) {
      sent.set(handOff.from, [...(sent.get(handOff.from) ?? []), handOff]);
    }

    for (const [from, handOffs] of sent) {
      const { t } = handOffs[0];
      const { pieces, junctions, reach } = branches[from];
      const head = ease(Math.min(1, t)) * reach;
      const lit = t < 1 ? 1 : Math.max(0, 1 - (t - 1) / LINGER);

      context.beginPath();
      for (const { to } of handOffs) {
        traceTo(paths[to].stops, Math.min(head, paths[to].length));
      }
      context.lineWidth = 1.2;
      context.lineJoin = 'round';
      context.strokeStyle = withAlpha(colors['c-pulse'], 0.75 * lit);
      context.stroke();

      for (const [point, along] of junctions) {
        if (head >= along) {
          dot(point, withAlpha(colors['c-pulse'], lit));
        }
      }

      if (t < 1) {
        trail(pieces, head, TRAIL, 2.2);
      }
    }
  };

  // Where a thread's chunk sits, on its lane
  const laneOf = slot => [LANES[slot], 0, POOL_HEIGHT + LANE_HEIGHT];

  // The pool: its slab, lit while its threads work, and a lane for each
  // thread, lit while it works on a chunk
  const drawPool = () => {
    const busy = build.threads.some(Boolean);
    slab(
      context,
      scene.view,
      colors,
      {
        x: 0,
        y: 0,
        hx: 1,
        h: POOL_HEIGHT,
        light: lightOf('pool', busy ? 0.2 : 0),
      },
      snap
    );

    LANES.forEach((x, slot) => {
      const job = build.threads[slot];
      // Once its chunk has flown in
      const working = job && job.duration - job.left >= HOP;
      slab(
        context,
        scene.view,
        colors,
        {
          x,
          y: 0,
          z: POOL_HEIGHT,
          hx: LANE[0],
          hy: LANE[1],
          h: LANE_HEIGHT,
          light: lightOf(`lane ${slot}`, working ? 0.8 : 0),
        },
        snap
      );
      if (working) {
        sheet(...laneOf(slot), 0.12);
      }
    });
  };

  // How many sheets a generator's result shows: one for each chunk it has
  // collected, four at most, or the sources' pages
  const pileOf = id => {
    if (id === 'docs') {
      return 3;
    }
    const { collected, chunks } = build.stages[id];
    return STAGES[id].size && chunks
      ? Math.ceil((collected * Math.min(SHEETS, chunks)) / chunks)
      : 0;
  };

  // How much of a generator's result is still held: all of it, until it
  // fades once it is freed, or once the run returns it
  const heldOf = id => {
    const { status, freed } = build.stages[id];
    const gone =
      status === 'freed'
        ? freed
        : id !== 'docs' && build.returned !== null
          ? build.returned
          : null;
    return gone === null ? 1 : Math.max(0, 1 - (build.clock - gone) / FADE);
  };

  // Where a chunk leaves a tile and lands back on it: the top of its pile,
  // settling as the pile goes
  const landingOf = id => {
    const { x, y } = scene.tiles[id];
    const pile = pileOf(id) * heldOf(id);
    return [x, y, TILE_HEIGHT + (pile * SHEET) / scene.scale];
  };

  // A check standing on a tile once its output is written
  const drawCheck = id => {
    const [x, y] = scene.view(...landingOf(id));
    context.beginPath();
    context.moveTo(x - 3.5, y - 1);
    context.lineTo(x - 1, y + 1.5);
    context.lineTo(x + 4, y - 4);
    context.strokeStyle = colors['c-fg'];
    context.lineWidth = 1.5;
    context.lineJoin = 'round';
    context.lineCap = 'round';
    context.stroke();
    context.lineCap = 'butt';
  };

  // A generator's tile, lit while it runs and resting a little lit once
  // done, only an outline once its result is freed, and its result piled
  // on it
  const drawTile = ({ id, x, y }) => {
    const { status, main } = build.stages[id];
    const running = status === 'running';
    const lit = build.flash[id] ?? 0;
    // Work on the main thread breathes, having no chunks to show it
    const breath =
      running && main > 0
        ? (1 - Math.cos((build.clock / BREATH) * Math.PI)) / 2
        : 0;
    const held = heldOf(id);

    if (status === 'freed') {
      ghost(x, y);
    } else {
      slab(
        context,
        scene.view,
        colors,
        {
          x,
          y,
          hx: TILE,
          h: TILE_HEIGHT,
          light: lightOf(
            id,
            running
              ? 0.6 + 0.4 * Math.max(lit, breath)
              : status === 'done'
                ? 0.4 + 0.6 * lit
                : 0
          ),
        },
        snap
      );
    }

    // A sheet for each chunk collected, with a gap between them
    const count = pileOf(id);
    if (count && held > 0) {
      const { view, scale } = scene;
      const half = TILE * PILE;
      context.lineWidth = 1;
      for (let index = 1; index <= count; index++) {
        const z = TILE_HEIGHT + (index * SHEET) / scale;
        polygon(context, [
          snap(view(x - half, y - half, z)),
          snap(view(x + half, y - half, z)),
          snap(view(x + half, y + half, z)),
          snap(view(x - half, y + half, z)),
        ]);
        context.fillStyle = withAlpha(colors['c-face'], held);
        context.fill();
        context.strokeStyle = withAlpha(colors['c-fg-3'], held);
        context.stroke();
      }
    }
  };

  // Files rising off the outputs as they write them, as off the hero's
  const drawFiles = () => {
    for (const file of build.files) {
      const { x, y } = scene.tiles[file.id];
      const t = file.age / RISE;
      sheet(
        x,
        y,
        TILE_HEIGHT + 0.1 + t * (LIFT / scene.scale),
        TILE * FILE,
        Math.max(0, 1 - t)
      );
    }
  };

  // The way a chunk flies from its generator to a thread, or back: in an
  // arc clearing the other tiles and the labels, or, from below `metadata`
  // on a phone, across to the aisle, up it and in under the pool's front
  const routeOf = (id, slot, back) => {
    const { view, scale, aisle } = scene;
    const { x, y } = scene.tiles[id];
    const tile = view(...landingOf(id));
    const lane = view(...laneOf(slot));
    let points;

    if (aisle && x + y > aisle.past) {
      points = rounded(
        [
          tile,
          [aisle.x, tile[1] - 0.15 * scale],
          [aisle.x, lane[1] + 0.9 * scale],
          lane,
        ],
        0.6 * scale
      );
    } else {
      points = arc(tile, lane, scene.lifts[id][slot]);
    }

    return stopsOf(back ? points.reverse() : points);
  };

  // Chunks flying to a thread, and back onto their generator's result:
  // each a sheet, a thin trail behind it
  const drawHops = () => {
    const { scale } = scene;
    for (const hop of build.hops) {
      const stops = routeOf(hop.job.id, hop.slot, hop.back);
      const head = ease(hop.t) * stops.at(-1)[1];
      trail(piecesOf(stops), head, WAKE, 1, 0.7);

      const [hx, hy] = pointOn(stops, head);
      const half = 0.12 * scale;
      const tall = half / Math.sqrt(3);
      polygon(context, [
        [hx, hy - tall],
        [hx + half, hy],
        [hx, hy + tall],
        [hx - half, hy],
      ]);
      context.fillStyle = colors['c-face'];
      context.fill();
      context.lineWidth = 1;
      context.strokeStyle = withAlpha(colors['c-pulse'], 0.85);
      context.stroke();
    }
  };

  // A label, beside its tile or the pool: its title, and what it does,
  // has written, or that it is freed
  const drawLabel = (id, title, line, strong) => {
    const { style } = scene;
    const { left, right, top, side } = scene.places[id];
    const titleY = Math.round(top + style.title - 1);
    const lineY = Math.round(titleY + style.line + 4);
    // Right-aligned on the left, so the labels line up on their tiles
    const [align, anchor] =
      side === 'left'
        ? ['right', right]
        : side === 'right'
          ? ['left', left]
          : ['center', (left + right) / 2];

    context.textBaseline = 'alphabetic';
    context.textAlign = align;
    context.font = scene.titleFont;
    context.fillStyle = strong ? colors['c-fg'] : colors['c-fg-2'];
    context.fillText(title, Math.round(anchor), titleY);
    if (line) {
      context.font = line.font;
      context.fillStyle = line.strong ? colors['c-fg'] : colors['c-fg-2'];
      context.fillText(line.text, Math.round(anchor), lineY);
    }
    context.textAlign = 'start';
  };

  const drawTileLabel = ({ id }) => {
    const { status, written } = build.stages[id];
    const { sub, count } = STAGES[id];
    const { style } = scene;
    const lit = build.flash[id] ?? 0;
    const strong = lit > 0.05 || status === 'done';
    const line =
      status === 'freed'
        ? { text: 'freed', font: scene.subFont }
        : count
          ? {
              // What it has written so far
              text: count(written),
              font: `${strong ? 600 : 500} ${style.line}px ${MONO}`,
              strong,
            }
          : style.subs.includes(id)
            ? { text: sub, font: scene.subFont }
            : null;
    drawLabel(
      id,
      scene.labels[id].text,
      line,
      status !== 'waiting' && status !== 'freed'
    );
  };

  // Memory over the build: what has run, then faintly what is to come
  const drawMemory = () => {
    const top = scene.memoryTop;
    const band = 30;
    const chartTop = top + 16;
    const base = chartTop + band;
    const { samples, duration, peak, frees } = profile;
    const xOf = time => (time / duration) * width;
    const yOf = value => base - 2 - (value / peak) * (band - 6);
    const now = Math.min(build.clock, duration);
    const reached = Math.min(samples.length - 1, Math.round(now / SAMPLE));

    context.textBaseline = 'alphabetic';
    context.font = SMALL;
    context.fillStyle = colors['c-fg-2'];
    context.fillText('memory', 0, top + 11);
    context.font = scene.subFont;
    context.fillText(scene.note, width - measure(scene.note), top + 11);

    context.strokeStyle = colors['c-line'];
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(0, base + 0.5);
    context.lineTo(width, base + 0.5);
    context.stroke();

    const trace = (from, to) => {
      context.beginPath();
      for (let index = from; index <= to; index++) {
        const point = [xOf(index * SAMPLE), yOf(samples[index])];
        if (index === from) {
          context.moveTo(...point);
        } else {
          context.lineTo(...point);
        }
      }
    };

    context.lineJoin = 'round';
    if (reached < samples.length - 1) {
      trace(reached, samples.length - 1);
      context.strokeStyle = colors['c-line-strong'];
      context.lineWidth = 1;
      context.stroke();
    }

    if (reached > 0) {
      trace(0, reached);
      context.lineTo(xOf(reached * SAMPLE), base);
      context.lineTo(0, base);
      const fill = context.createLinearGradient(0, chartTop, 0, base);
      fill.addColorStop(0, withAlpha(colors['c-fg-3'], 0.28));
      fill.addColorStop(1, withAlpha(colors['c-fg-3'], 0));
      context.fillStyle = fill;
      context.fill();

      trace(0, reached);
      context.strokeStyle = colors['c-fg-2'];
      context.lineWidth = 1.4;
      context.stroke();
    }

    // Where the build is
    if (build.clock < duration) {
      const x = Math.round(xOf(now) - 0.5) + 0.5;
      context.strokeStyle = colors['c-line-strong'];
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(x, chartTop - 2);
      context.lineTo(x, base);
      context.stroke();
      context.beginPath();
      context.arc(xOf(now), yOf(samples[reached]), 2.5, 0, Math.PI * 2);
      context.fillStyle = colors['c-pulse'];
      context.fill();
    }

    // Each result freed, named under the moment it goes, kept apart
    context.font = SMALL;
    const labels = frees.map(({ id, at }) => {
      const text = STAGES[id].title;
      const across = measure(text);
      return {
        text,
        at,
        across,
        left: Math.min(width - across, Math.max(0, xOf(at) - across / 2)),
      };
    });
    labels.forEach((label, index) => {
      if (index) {
        const before = labels[index - 1];
        label.left = Math.max(label.left, before.left + before.across + 8);
      }
    });
    for (let index = labels.length - 1; index >= 0; index--) {
      const after = labels[index + 1];
      const limit = after ? after.left - 8 : width;
      labels[index].left = Math.min(
        labels[index].left,
        limit - labels[index].across
      );
    }

    for (const { text, at, left } of labels) {
      const past = build.clock >= at;
      const x = Math.round(xOf(at) - 0.5) + 0.5;
      context.strokeStyle = past ? colors['c-fg-2'] : colors['c-line-strong'];
      context.beginPath();
      context.moveTo(x, base + 1);
      context.lineTo(x, base + 5);
      context.stroke();
      context.fillStyle = past ? colors['c-fg'] : colors['c-fg-2'];
      context.fillText(text, left, base + 16);
    }
  };

  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  // The floor: a grid fading out from the middle of the scene, as under
  // the hero's platform
  drawFloor(context, scene.view, colors, scene.floor);
  // Results run along the rails under the tiles
  drawRails();
  drawHandOffs();

  // The tiles and the pool, back to front
  const tiles = scene.order.map(id => scene.tiles[id]);
  tiles.filter(({ x, y }) => x + y < 0).forEach(drawTile);
  drawPool();
  tiles.filter(({ x, y }) => x + y >= 0).forEach(drawTile);

  // The checks over the files rising past them, the chunks over both
  drawFiles();
  IDS.filter(
    id => STAGES[id].output && build.stages[id].status === 'done'
  ).forEach(drawCheck);
  drawHops();

  // The labels last, over anything passing by
  tiles.forEach(drawTileLabel);
  drawLabel(
    'pool',
    POOL_NAME,
    { text: POOL_LINE, font: scene.countFont },
    true
  );
  drawMemory();
};

/**
 * How doc-kit's pipeline runs, in the hero's isometric tiles: the worker
 * pool in the middle, a lane on it for each of its threads, and around it a
 * tile for every generator this site's build runs. A generator sends its
 * chunks to the pool and collects every one of them into its result, and
 * only then hands the whole result to its readers along the rails, all of
 * them at once. The outputs that read the same entries run side by side, the
 * site and JSON writing their files chunk by chunk, and each result is freed
 * once its last reader is done, which the memory trace shows.
 *
 * @param {{ pages: number, documents: number }} props - How many pages the
 *   website writes, and how many documents the JSON
 */
const PipelineFlow = ({ pages, documents }) => {
  const canvas = useRef(null);

  useEffect(() => {
    const totals = { pages, documents };
    const element = canvas.current;
    const profile = record(totals);
    // The idle build, drawn here to fade the finished one back to it
    const idle = document.createElement('canvas');

    let context;
    let width = 0;
    let height = 0;
    let ratio = 1;
    let colors = {};
    let scene;
    let build = createBuild(totals);
    // How lit each tile, lane and the pool show
    let lights = {};

    const frame = (_time, delta) => {
      if (!context) {
        return;
      }

      if (delta > 0) {
        advance(build, delta);
        // Start over after a rest on the finished build, and its fading
        if (
          build.returned !== null &&
          build.clock - build.returned > PAUSE + RESET
        ) {
          build = createBuild(totals);
          lights = {};
        }
      }

      const state = { scene, colors, profile, width, height, ratio };
      paint(context, { ...state, build, lights, dim: (delta / 1000) * DIM });

      // The finished build fading back to idle, the next one before it starts
      const fading =
        build.returned === null
          ? 0
          : (build.clock - build.returned - PAUSE) / RESET;
      if (fading > 0) {
        paint(idle.getContext('2d'), {
          ...state,
          build: createBuild(totals),
          lights: {},
          dim: 0,
        });
        // A crossfade: the finished build dimmed by as much of the idle one
        // as is added, so whatever both show stays as it is
        const alpha = Math.min(1, fading);
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.globalAlpha = alpha;
        context.globalCompositeOperation = 'destination-out';
        context.fillRect(0, 0, element.width, element.height);
        context.globalCompositeOperation = 'lighter';
        context.drawImage(idle, 0, 0);
        context.globalCompositeOperation = 'source-over';
        context.globalAlpha = 1;
      }
    };

    const stop = animate(element, {
      resize: () => {
        ({ width, height, context, ratio } = fitCanvas(element));
        idle.width = element.width;
        idle.height = element.height;
        scene = layout(context, width, height, totals);
      },
      retheme: () => {
        colors = readColors(element, PALETTE);
      },
      frame,
      // With motion reduced, the outputs at work side by side, without the
      // chunks and files caught in the air, which would seem to be another's
      settle: () => {
        build = createBuild(totals);
        lights = {};
        for (let elapsed = 0; elapsed < profile.still; elapsed += SAMPLE) {
          advance(build, SAMPLE);
        }
        build.hops = [];
        build.files = [];
      },
    });

    // Laid out again whenever fonts finish loading, should the ones it
    // measures come in late
    const relayout = () => {
      if (context) {
        scene = layout(context, width, height, totals);
        frame(0, 0);
      }
    };
    document.fonts?.addEventListener('loadingdone', relayout);

    return () => {
      stop();
      document.fonts?.removeEventListener('loadingdone', relayout);
    };
  }, [pages, documents]);

  return (
    <canvas
      ref={canvas}
      class="dk-pipeline-flow"
      role="img"
      aria-label="doc-kit's worker pool, a slab with a lane for each of its four threads, and around it a tile for each generator this site's build runs, joined by rails from each generator to the ones that read its result. ast parses the docs and metadata turns them into API entries: each sends its files to the pool in chunks of ten, collects every chunk back, and only then hands its whole result on. metadata's result runs out along its rails, branching to the search index, jsx-ast, json, llms-txt, llms-txt-full and sitemap, which all start at once and run side by side, sharing the pool. Once jsx-ast is done, html bundles the site and writes its pages on the pool. json and html count up their files as each chunk is written. Each result is freed once its last reader is done, leaving only its tile's dashed outline, and the memory trace below dips each time."
    />
  );
};

export default withIsland(PipelineFlow, {
  name: 'PipelineFlow',
  on: { idle: true },
});
