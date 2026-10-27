// Helpers shared by the canvas animations of the home page.

/**
 * The cat's head (see `Brand.jsx`), as paths on its 32 × 32 grid.
 */
export { CAT } from './Brand.jsx';

/**
 * The colors both animations draw with, as custom properties without `--dk-`.
 */
export const COLORS = [
  'c-fg',
  'c-fg-2',
  'c-fg-3',
  'c-line-strong',
  'c-face',
  'c-side',
  'c-shade',
  'c-glow',
  'c-pulse',
];

// How fast a light dims, per second
export const DIM = 1.5;

// The longest step a frame moves an animation on, in ms, so that a slow frame
// doesn't make it jump
const MAX_DELTA = 64;

// How far across the screen an isometric unit runs along either axis
export const COS = Math.cos(Math.PI / 6);

/**
 * Reads the colors the animations draw with from the canvas's custom
 * properties, so they follow the color scheme.
 *
 * @param {HTMLElement} element
 * @param {Array<string>} names - Custom property names, without `--dk-`
 */
export const readColors = (element, names) => {
  const style = getComputedStyle(element);

  return Object.fromEntries(
    names.map(name => [name, style.getPropertyValue(`--dk-${name}`).trim()])
  );
};

/**
 * Sizes a canvas for its CSS box and the device's pixel ratio, and scales
 * its context to draw in CSS pixels.
 *
 * @param {HTMLCanvasElement} canvas
 * @returns {{ width: number, height: number, context: CanvasRenderingContext2D, ratio: number }}
 */
export const fitCanvas = canvas => {
  const { width, height } = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);

  const context = canvas.getContext('2d');
  context.setTransform(ratio, 0, 0, ratio, 0, 0);

  return { width, height, context, ratio };
};

/**
 * Applies an alpha to a hexadecimal color (`#rgb` or `#rrggbb`), as the
 * custom properties the animations read define them.
 *
 * @param {string} color
 * @param {number} alpha
 */
export const withAlpha = (color, alpha) => {
  const hex = color.replace('#', '');
  const full =
    hex.length === 3
      ? [...hex].map(digit => digit + digit).join('')
      : hex.slice(0, 6);
  const value = Number.parseInt(full, 16);

  if (Number.isNaN(value)) {
    return color;
  }

  return `rgba(${value >> 16}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
};

/**
 * The isometric projection of a scene onto the canvas: x runs down to the
 * right, y down to the left and z up.
 *
 * @param {number} scale - Pixels per unit
 * @param {number} originX
 * @param {number} originY
 */
export const projection = (scale, originX, originY) => ({
  scale,
  point: (x, y, z = 0) => [
    originX + (x - y) * COS * scale,
    originY + (x + y) * 0.5 * scale - z * scale,
  ],
  // The 2D transform drawing onto the horizontal plane at height `z`,
  // `size` units per drawing unit, its origin at `x`, `y`
  plane: (x, y, z, size) => [
    COS * scale * size,
    0.5 * scale * size,
    -COS * scale * size,
    0.5 * scale * size,
    originX + (x - y) * COS * scale,
    originY + (x + y) * 0.5 * scale - z * scale,
  ],
});

/**
 * Traces a polygon through projected points.
 *
 * @param {CanvasRenderingContext2D} context
 * @param {Array<[number, number]>} points
 */
export const polygon = (context, points) => {
  context.beginPath();
  points.forEach(([x, y], index) =>
    index ? context.lineTo(x, y) : context.moveTo(x, y)
  );
  context.closePath();
};

/**
 * Draws a slab: a box `hx` units from its center along x and `hy` along y,
 * from `z` up to `z + h`, its top lit by `light` (0 to 1).
 *
 * @param {CanvasRenderingContext2D} context
 * @param {(x: number, y: number, z?: number) => [number, number]} point - The projection
 * @param {Record<string, string>} colors
 * @param {{ x: number, y: number, z?: number, hx: number, hy?: number, h: number, light?: number }} box
 * @param {(point: [number, number]) => [number, number]} [place] - Where each projected corner goes, such as onto a pixel
 */
export const slab = (
  context,
  point,
  colors,
  { x, y, z = 0, hx, hy = hx, h, light = 0 },
  place = corner => corner
) => {
  const p = (dx, dy, dz) => place(point(x + dx, y + dy, z + dz));

  context.lineWidth = 1;
  context.lineJoin = 'round';
  context.strokeStyle = colors['c-line-strong'];

  polygon(context, [p(hx, -hy, h), p(hx, hy, h), p(hx, hy, 0), p(hx, -hy, 0)]);
  context.fillStyle = colors['c-side'];
  context.fill();
  context.stroke();

  polygon(context, [p(-hx, hy, h), p(hx, hy, h), p(hx, hy, 0), p(-hx, hy, 0)]);
  context.fillStyle = colors['c-shade'];
  context.fill();
  context.stroke();

  polygon(context, [
    p(-hx, -hy, h),
    p(hx, -hy, h),
    p(hx, hy, h),
    p(-hx, hy, h),
  ]);
  context.fillStyle = colors['c-face'];
  context.fill();

  if (light > 0.01) {
    context.fillStyle = withAlpha(colors['c-glow'], 0.22 * light);
    context.fill();
  }

  context.strokeStyle =
    light > 0.01
      ? withAlpha(colors['c-pulse'], 0.35 + 0.55 * light)
      : colors['c-line-strong'];
  context.stroke();
};

/**
 * Draws the floor: a grid on the ground, fading out from `center`.
 *
 * @param {CanvasRenderingContext2D} context
 * @param {(x: number, y: number, z?: number) => [number, number]} point - The projection
 * @param {Record<string, string>} colors
 * @param {[number, number]} [center]
 */
export const drawFloor = (context, point, colors, [cx, cy] = [0, 0]) => {
  const reach = 5;
  context.lineWidth = 1;

  for (let i = -reach; i <= reach; i++) {
    const fade = 1 - Math.abs(i) / (reach + 1);

    for (const [from, to] of [
      [point(cx + i, cy - reach), point(cx + i, cy + reach)],
      [point(cx - reach, cy + i), point(cx + reach, cy + i)],
    ]) {
      const gradient = context.createLinearGradient(...from, ...to);
      gradient.addColorStop(0, withAlpha(colors['c-line-strong'], 0));
      gradient.addColorStop(
        0.5,
        withAlpha(colors['c-line-strong'], 0.6 * fade)
      );
      gradient.addColorStop(1, withAlpha(colors['c-line-strong'], 0));
      context.strokeStyle = gradient;
      context.beginPath();
      context.moveTo(...from);
      context.lineTo(...to);
      context.stroke();
    }
  }
};

/**
 * Runs `frame` on every animation frame while the canvas is on screen, the
 * page is visible and motion isn't reduced, and draws once otherwise, after
 * calling `settle` whenever motion is (or becomes) reduced. Calls `resize`
 * whenever the canvas changes size or the pixel ratio changes, first from the
 * size observer's first callback, and `retheme` whenever the color scheme
 * changes.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {{ resize: () => void, retheme: () => void, frame: (time: number, delta: number) => void, settle?: () => void }} handlers
 * @returns {() => void} Stops the animation
 */
export const animate = (canvas, { resize, retheme, frame, settle }) => {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = motion.matches;
  let visible = false;
  let handle = 0;
  let last = 0;
  let resolution;

  const loop = time => {
    const delta = Math.min(time - (last || time), MAX_DELTA);
    last = time;
    frame(time, delta);
    handle = requestAnimationFrame(loop);
  };

  const start = () => {
    if (!handle && visible && !document.hidden && !reduced) {
      last = 0;
      handle = requestAnimationFrame(loop);
    }
  };

  const stop = () => {
    cancelAnimationFrame(handle);
    handle = 0;
  };

  const redraw = () => {
    if (reduced || !handle) {
      frame(performance.now(), 0);
    }
  };

  const onVisibility = () => (document.hidden ? stop() : start());

  const onMotion = () => {
    reduced = motion.matches;

    if (reduced) {
      stop();
      settle?.();
      redraw();
    } else {
      start();
    }
  };

  const onResolution = () => {
    resize();
    redraw();
    watchResolution();
  };

  // A media query on the current ratio, renewed each time it stops matching:
  // zooming and moving the window to another screen change the ratio but not
  // the canvas's CSS size, so the size observer misses them
  const watchResolution = () => {
    resolution?.removeEventListener('change', onResolution);
    resolution = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    resolution.addEventListener('change', onResolution);
  };

  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;

    if (visible) {
      start();
    } else {
      stop();
    }
  });

  // Resizing clears the canvas after this frame's drawing, so it is drawn
  // again at once, animating or not
  const sizes = new ResizeObserver(() => {
    resize();
    frame(performance.now(), 0);
  });

  const theme = new MutationObserver(() => {
    retheme();
    redraw();
  });

  retheme();

  if (reduced) {
    settle?.();
  }

  intersection.observe(canvas);
  sizes.observe(canvas);
  watchResolution();
  theme.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  motion.addEventListener('change', onMotion);
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    stop();
    intersection.disconnect();
    sizes.disconnect();
    theme.disconnect();
    resolution.removeEventListener('change', onResolution);
    motion.removeEventListener('change', onMotion);
    document.removeEventListener('visibilitychange', onVisibility);
  };
};
