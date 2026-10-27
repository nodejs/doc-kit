import withIsland from '@doc-kit/generator-react/html/ui/islands/withIsland.jsx';
import { useEffect, useRef } from 'preact/hooks';

import {
  CAT,
  COLORS,
  DIM,
  animate,
  drawFloor,
  fitCanvas,
  polygon,
  projection,
  readColors,
  slab,
  withAlpha,
} from './canvas.mjs';

const INPUTS = ['.md', '.mdx', '.ts', '.js'];
const OUTPUTS = ['HTML', 'JSON', 'SEARCH', 'LLMS', 'MAN'];

// The scene, in isometric units: the platform's half size and height, where
// the tiles sit, and how high the typed tree floats above the platform
const PLATFORM = 1.6;
const PLATFORM_HEIGHT = 0.32;
const TILE = 0.34;
// Tiles run longer along their rails, where their labels read
const TILE_LENGTH = 0.46;
const TILE_HEIGHT = 0.16;
const RAIL = 3.1;
const LAYER = 2.7;
const LAYER_HALF = 1.1;

const inputY = INPUTS.map(
  (_, index) => (index - (INPUTS.length - 1) / 2) * 0.78
);
const outputY = OUTPUTS.map(
  (_, index) => (index - (OUTPUTS.length - 1) / 2) * 0.74
);

// Seconds between chunks leaving the sources, and a chunk's speed in units/s
const SPAWN_EVERY = 0.32;
const SPEED = 1.35;
// The chance a chunk reaching the platform leaves it for two outputs, not one
const FANOUT = 0.4;
// Seconds a written file takes to rise off its output and fade
const SHEET_LIFE = 1.1;
// How fast the platform's glow dims, per second
const GLOW_DIM = 1.8;

// The scene's extent, in units: about 9 across and 6.6 down, with a margin
const SCENE = [9.2, 6.9];
// Below this many pixels per unit the labels are too small to read, so they
// are left out
const LABEL_SCALE = 40;

const labelFont = size =>
  `600 ${size}px "IBM Plex Mono", ui-monospace, monospace`;

/**
 * Writes text lying on the plane at height `z`, centered on `x`, `y`.
 */
const planeText = (context, view, { x, y, z, text, size, color, ratio }) => {
  context.save();
  const [a, b, c, d, e, f] = view.plane(x, y, z, 1 / view.scale);
  context.setTransform(
    a * ratio,
    b * ratio,
    c * ratio,
    d * ratio,
    e * ratio,
    f * ratio
  );
  context.font = labelFont(size);
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = color;
  context.fillText(text, 0, 0);
  context.restore();
};

/**
 * The cat, flat on the platform, its eyes and nose in the platform's color.
 */
const drawCat = (context, view, paths, colors, ratio) => {
  const size = 2.3 / 32;
  context.save();
  const [a, b, c, d, e, f] = view.plane(-1.15, -1.2, PLATFORM_HEIGHT, size);
  context.setTransform(
    a * ratio,
    b * ratio,
    c * ratio,
    d * ratio,
    e * ratio,
    f * ratio
  );
  context.fillStyle = colors['c-fg'];
  context.fill(paths.head);
  context.fillStyle = colors['c-face'];
  context.fill(paths.eyes);
  context.fill(paths.nose);
  context.restore();
};

/**
 * doc-kit's build, in isometric: sources slide along their rails into the
 * platform, where they become one typed tree, and leave along other rails for
 * the outputs, which write their files.
 */
const HeroFlow = () => {
  const canvas = useRef(null);

  useEffect(() => {
    const element = canvas.current;
    const paths = Object.fromEntries(
      Object.entries(CAT).map(([name, d]) => [name, new Path2D(d)])
    );

    let context;
    let width = 0;
    let height = 0;
    let ratio = 1;
    let colors = {};
    let view;
    let labels = true;
    let outputSize = 9;

    let clock = 0;
    let sinceSpawn = 0;
    let glow = 0;
    let chunks = [];
    let sheets = [];
    const lit = OUTPUTS.map(() => 0);

    // Chunks already on their way, for the first frame (or the only one)
    const seed = () => [
      ...inputY.map((_, rail) => ({
        rail,
        inbound: true,
        progress: 0.2 + rail * 0.2,
      })),
      ...outputY.map((_, rail) => ({
        rail,
        inbound: false,
        progress: 0.15 + (rail % 3) * 0.3,
      })),
    ];

    const railPoint = ({ rail, inbound, progress }) => {
      const start = inbound ? -RAIL + TILE_LENGTH : PLATFORM;
      const end = inbound ? -PLATFORM : RAIL - TILE_LENGTH;
      const y = inbound ? inputY[rail] : outputY[rail];

      return [start + (end - start) * progress, y];
    };

    const frame = (_time, delta) => {
      if (!context) {
        return;
      }

      const seconds = delta / 1000;
      clock += seconds;

      if (seconds > 0) {
        sinceSpawn += seconds;
        while (sinceSpawn > SPAWN_EVERY) {
          sinceSpawn -= SPAWN_EVERY;
          chunks.push({
            rail: Math.floor(Math.random() * INPUTS.length),
            inbound: true,
            progress: 0,
          });
        }

        const length = RAIL - TILE_LENGTH - PLATFORM;
        for (const chunk of chunks) {
          chunk.progress += (SPEED * seconds) / length;
        }

        for (const chunk of chunks.filter(({ progress }) => progress >= 1)) {
          if (chunk.inbound) {
            glow = 1;
            const fanout = Math.random() < FANOUT ? 2 : 1;
            for (let i = 0; i < fanout; i++) {
              chunks.push({
                rail: Math.floor(Math.random() * OUTPUTS.length),
                inbound: false,
                progress: -0.25 - i * 0.2,
              });
            }
          } else {
            lit[chunk.rail] = 1;
            sheets.push({ rail: chunk.rail, age: 0 });
          }
        }

        chunks = chunks.filter(({ progress }) => progress < 1);
        sheets = sheets.filter(sheet => (sheet.age += seconds) < SHEET_LIFE);
        glow = Math.max(0, glow - seconds * GLOW_DIM);
        lit.forEach(
          (value, index) => (lit[index] = Math.max(0, value - seconds * DIM))
        );
      }

      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);

      // The floor: a grid fading out from the platform
      drawFloor(context, view.point, colors);

      // Rails
      context.lineWidth = 1.2;
      context.strokeStyle = colors['c-fg-3'];
      for (const y of inputY) {
        context.beginPath();
        context.moveTo(...view.point(-RAIL + TILE_LENGTH, y));
        context.lineTo(...view.point(-PLATFORM, y));
        context.stroke();
      }
      for (const y of outputY) {
        context.beginPath();
        context.moveTo(...view.point(PLATFORM, y));
        context.lineTo(...view.point(RAIL - TILE_LENGTH, y));
        context.stroke();
      }

      // Chunks, as short bright dashes along the rails
      for (const chunk of chunks) {
        if (chunk.progress <= 0) {
          continue;
        }
        const [x, y] = railPoint(chunk);
        const [tailX] = railPoint({
          ...chunk,
          progress: Math.max(0, chunk.progress - 0.14),
        });
        const from = view.point(tailX, y);
        const to = view.point(x, y);
        const gradient = context.createLinearGradient(...from, ...to);
        gradient.addColorStop(0, withAlpha(colors['c-pulse'], 0));
        gradient.addColorStop(1, colors['c-pulse']);
        context.strokeStyle = gradient;
        context.lineWidth = 2.2;
        context.lineCap = 'round';
        context.beginPath();
        context.moveTo(...from);
        context.lineTo(...to);
        context.stroke();
      }

      // Sources, behind the platform
      INPUTS.forEach((label, index) => {
        slab(context, view.point, colors, {
          x: -RAIL,
          y: inputY[index],
          hx: TILE_LENGTH,
          hy: TILE,
          h: TILE_HEIGHT,
        });
        if (labels) {
          planeText(context, view, {
            x: -RAIL,
            y: inputY[index],
            z: TILE_HEIGHT,
            text: label,
            size: 10,
            color: colors['c-fg-2'],
            ratio,
          });
        }
      });

      // The platform, with the kitten on it
      slab(context, view.point, colors, {
        x: 0,
        y: 0,
        hx: PLATFORM,
        h: PLATFORM_HEIGHT,
        light: glow * 0.6,
      });

      // The typed tree, floating above it
      const float = LAYER + Math.sin(clock * 1.1) * 0.06;
      const corner = (dx, dy, z) =>
        view.point(dx * LAYER_HALF, dy * LAYER_HALF, z);

      // Its corners' drop lines go under the kitten, not across its face
      context.setLineDash([2, 5]);
      context.strokeStyle = withAlpha(colors['c-fg-3'], 0.7);
      context.lineWidth = 1;
      for (const [dx, dy] of [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ]) {
        context.beginPath();
        context.moveTo(...corner(dx, dy, PLATFORM_HEIGHT + 0.05));
        context.lineTo(...corner(dx, dy, float));
        context.stroke();
      }
      context.setLineDash([]);

      drawCat(context, view, paths, colors, ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      polygon(context, [
        corner(-1, -1, float),
        corner(1, -1, float),
        corner(1, 1, float),
        corner(-1, 1, float),
      ]);
      context.fillStyle = withAlpha(colors['c-face'], 0.92);
      context.fill();
      context.strokeStyle = withAlpha(colors['c-pulse'], 0.45 + glow * 0.4);
      context.lineWidth = 1.2;
      context.stroke();

      // Its entries, as rows
      for (let row = 0; row < 4; row++) {
        const y = -0.62 + row * 0.36;
        const length = [1.3, 0.9, 1.15, 0.7][row];
        context.strokeStyle = withAlpha(colors['c-fg-3'], 0.6);
        context.lineWidth = 2;
        context.lineCap = 'round';
        context.beginPath();
        context.moveTo(...view.point(-0.65, y, float));
        context.lineTo(...view.point(-0.65 + length, y, float));
        context.stroke();
      }

      if (labels) {
        planeText(context, view, {
          x: 0,
          y: 0.86,
          z: float,
          text: 'API ENTRIES',
          size: 9,
          color: colors['c-fg-2'],
          ratio,
        });
      }

      // Outputs, in front
      OUTPUTS.forEach((label, index) => {
        slab(context, view.point, colors, {
          x: RAIL,
          y: outputY[index],
          hx: TILE_LENGTH,
          hy: TILE,
          h: TILE_HEIGHT,
          light: lit[index],
        });
        if (labels) {
          planeText(context, view, {
            x: RAIL,
            y: outputY[index],
            z: TILE_HEIGHT,
            text: label,
            size: outputSize,
            color: lit[index] > 0.05 ? colors['c-fg'] : colors['c-fg-2'],
            ratio,
          });
        }
      });

      // The files they write, rising off them
      for (const sheet of sheets) {
        const rise = TILE_HEIGHT + 0.12 + sheet.age * 0.45;
        const alpha = Math.max(0, 1 - sheet.age / SHEET_LIFE);
        const y = outputY[sheet.rail];
        const s = 0.15;
        polygon(context, [
          view.point(RAIL - s, y - s, rise),
          view.point(RAIL + s, y - s, rise),
          view.point(RAIL + s, y + s, rise),
          view.point(RAIL - s, y + s, rise),
        ]);
        context.fillStyle = withAlpha(colors['c-face'], 0.8 * alpha);
        context.fill();
        context.strokeStyle = withAlpha(colors['c-pulse'], 0.6 * alpha);
        context.lineWidth = 1;
        context.stroke();
      }
    };

    chunks = seed();

    return animate(element, {
      resize: () => {
        ({ width, height, context, ratio } = fitCanvas(element));
        // The scene sits a little off center: the typed tree floats above,
        // the outputs reach out in front
        const scale = Math.min(width / SCENE[0], height / SCENE[1]);
        labels = scale > LABEL_SCALE;
        // One size for every output's label, the longest filling most of its
        // tile
        context.font = labelFont(9);
        const longest = Math.max(
          ...OUTPUTS.map(label => context.measureText(label).width)
        );
        outputSize = Math.min(9, (9 * 0.8 * 2 * TILE_LENGTH * scale) / longest);
        view = projection(
          scale,
          width / 2 - scale * 0.13,
          height / 2 + scale * 0.6
        );
      },
      retheme: () => {
        colors = readColors(element, COLORS);
      },
      frame,
    });
  }, []);

  return (
    <canvas
      ref={canvas}
      class="dk-hero-flow"
      role="img"
      aria-label="Markdown, MDX, TypeScript and JSDoc sources flow into doc-kit, which parses them once into typed API entries and writes HTML, JSON, the search index, llms.txt and a man page from them."
    />
  );
};

export default withIsland(HeroFlow, { name: 'HeroFlow', on: { idle: true } });
