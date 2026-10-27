// The build the pipeline animation plays: the generators this site's build
// runs, how they share the worker pool and hand their results on, and the
// memory it holds along the way.

// doc-kit's defaults: a worker thread per CPU core, up to four, each handed
// ten items at a time (`threads` and `chunkSize`)
export const THREADS = 4;
const CHUNK_SIZE = 10;

// In ms: a generator's whole result crossing to its readers, a chunk flying
// between its generator and a thread, and the run returning once the last
// output is written
const HAND_OFF = 700;
export const HOP = 400;
const TAIL = 500;

// How long the rails a result took stay lit once it has arrived, in hand-offs
export const LINGER = 0.6;

// In ms, how long a thread takes over an item, before its generator's pace,
// and how that varies from chunk to chunk, so they come back out of order
const ITEM = 105;
const JITTER = [1, 1.2, 0.85, 1.1, 0.95, 1.15];

// In ms: a written file rising off its output, and a generator's flash
// fading
export const RISE = 1100;
const FLASH = 600;

// How often the memory trace is sampled, in ms
export const SAMPLE = 20;

/**
 * The generators this site's build runs (see `www/doc-kit.config.mjs`), and
 * the sources they start from. Each names the generator it reads (its
 * `dependsOn`), its title (and a shorter one), what it does, or whether it
 * writes an output and how it counts what it has written, and how it works:
 * on the worker pool, in chunks of the `items` it is given, at `pace`, after
 * `main` ms on the main thread, if any. `size` is what each chunk it collects
 * holds in memory, until its last reader is done.
 */
export const STAGES = {
  docs: { title: 'docs/', sub: '*.md, *.mdx' },
  ast: {
    from: 'docs',
    title: 'ast',
    sub: 'parse',
    items: 'pages',
    pace: 1,
    size: 0.12,
  },
  metadata: {
    from: 'ast',
    title: 'metadata',
    sub: 'API entries',
    items: 'pages',
    pace: 0.85,
    size: 0.1,
  },
  // A target, so the run returns its documents: they stay until it does
  json: {
    from: 'metadata',
    title: 'json',
    output: true,
    count: written => `${written} .json`,
    items: 'documents',
    pace: 0.7,
    size: 0.04,
  },
  search: {
    from: 'metadata',
    title: 'search index',
    short: 'orama-db',
    output: true,
    main: 1800,
  },
  llms: {
    from: 'metadata',
    title: 'llms-txt',
    output: true,
    main: 700,
  },
  full: {
    from: 'metadata',
    title: 'llms-txt-full',
    output: true,
    main: 1000,
  },
  sitemap: {
    from: 'metadata',
    title: 'sitemap',
    output: true,
    main: 500,
  },
  jsx: {
    from: 'metadata',
    title: 'jsx-ast',
    sub: 'page JSX',
    items: 'pages',
    pace: 1,
    size: 0.11,
  },
  // Bundles once on the main thread, then writes the pages on the pool
  html: {
    from: 'jsx',
    title: 'html',
    output: true,
    count: written => `${written} pages`,
    items: 'pages',
    main: 1800,
    pace: 0.8,
  },
};

export const IDS = Object.keys(STAGES);
export const READERS = Object.fromEntries(
  IDS.map(id => [id, IDS.filter(other => STAGES[other].from === id)])
);
// The results freed once their last reader is done: all but the sources'
// and the outputs'
export const FREED = IDS.filter(id => id !== 'docs' && READERS[id].length);

/**
 * A build, from the sources handing their files to `ast` until the run
 * returns. It runs the same every time.
 *
 * @param {{ pages: number, documents: number }} totals
 */
export const createBuild = totals => ({
  totals,
  clock: 0,
  stages: Object.fromEntries(
    IDS.map(id => [
      id,
      {
        status: id === 'docs' ? 'done' : 'waiting',
        chunks: 0,
        collected: 0,
        written: 0,
        main: 0,
        readers: READERS[id].length,
        freed: 0,
      },
    ])
  ),
  threads: Array.from({ length: THREADS }, () => null),
  queue: [],
  hops: [],
  handOffs: [{ from: 'docs', to: 'ast', t: 0 }],
  files: [],
  frees: [],
  flash: { docs: 1 },
  done: null,
  returned: null,
});

// A generator's chunks join the pool's queue, behind any already waiting
const enqueue = (build, id) => {
  const { items, pace } = STAGES[id];
  const total = build.totals[items];
  const offset = IDS.indexOf(id);
  const stage = build.stages[id];
  stage.chunks = Math.ceil(total / CHUNK_SIZE);

  // With nothing to hand the pool (none, or a missing total), it is done at
  // once, or the run would never return
  if (!(stage.chunks > 0)) {
    stage.chunks = 0;
    finish(build, id);
    return;
  }

  for (let index = 0; index < stage.chunks; index++) {
    const count = Math.min(CHUNK_SIZE, total - index * CHUNK_SIZE);
    const jitter = JITTER[(index + offset) % JITTER.length];
    const duration = HOP + ITEM * count * pace * jitter;
    build.queue.push({ id, count, duration, left: duration });
  }
};

const start = (build, id) => {
  const stage = build.stages[id];
  stage.status = 'running';
  stage.main = STAGES[id].main ?? 0;

  if (!stage.main) {
    enqueue(build, id);
  }
};

const finish = (build, id) => {
  build.stages[id].status = 'done';
  build.flash[id] = 1;

  // An output that writes one file writes it once it has everything
  if (STAGES[id].output && !STAGES[id].items) {
    build.files.push({ id, age: 0 });
  }

  // The whole result goes to every reader at once
  for (const reader of READERS[id]) {
    build.handOffs.push({ from: id, to: reader, t: 0 });
  }

  // What it read is freed once the last of its readers is done
  const { from } = STAGES[id];
  const input = build.stages[from];
  if (from !== 'docs' && --input.readers === 0) {
    input.status = 'freed';
    input.freed = build.clock;
    build.flash[from] = 1;
    build.frees.push({ id: from, at: build.clock });
  }
};

// A chunk back from its thread joins the generator's result
const collect = (build, { id, count }) => {
  const stage = build.stages[id];
  stage.collected++;
  stage.written += count;

  // The site and JSON write their files as each chunk comes back
  if (STAGES[id].output) {
    build.flash[id] = 1;
    build.files.push({ id, age: 0 });
  }

  if (stage.collected === stage.chunks) {
    finish(build, id);
  }
};

export const advance = (build, delta) => {
  const { stages, threads } = build;
  build.clock += delta;

  // Results reaching their readers, which start only then, and the rails
  // they took staying lit a little longer
  for (const handOff of build.handOffs) {
    handOff.t += delta / HAND_OFF;
    if (handOff.t >= 1 && !handOff.arrived) {
      handOff.arrived = true;
      start(build, handOff.to);
    }
  }
  build.handOffs = build.handOffs.filter(({ t }) => t < 1 + LINGER);

  // Work on the main thread: all of it for some, the bundling for the site
  for (const id of IDS) {
    const stage = stages[id];
    if (stage.status !== 'running' || stage.main <= 0) {
      continue;
    }
    stage.main -= delta;
    if (stage.main <= 0) {
      if (STAGES[id].items) {
        enqueue(build, id);
      } else {
        finish(build, id);
      }
    }
  }

  // Chunks on their threads, and on their way there and back
  threads.forEach((job, slot) => {
    if (job && (job.left -= delta) <= 0) {
      threads[slot] = null;
      build.hops.push({ job, slot, back: true, t: 0 });
    }
  });
  for (const hop of build.hops) {
    hop.t += delta / HOP;
  }
  const landed = build.hops.filter(({ t }) => t >= 1);
  build.hops = build.hops.filter(({ t }) => t < 1);
  for (const hop of landed) {
    if (hop.back) {
      collect(build, hop.job);
    }
  }

  // A free thread takes the next chunk in line, whichever generator it is from
  threads.forEach((job, slot) => {
    if (!job && build.queue.length) {
      const next = build.queue.shift();
      threads[slot] = next;
      build.hops.push({ job: next, slot, back: false, t: 0 });
    }
  });

  for (const file of build.files) {
    file.age += delta;
  }
  build.files = build.files.filter(({ age }) => age < RISE);

  for (const key of Object.keys(build.flash)) {
    build.flash[key] = Math.max(0, build.flash[key] - delta / FLASH);
  }

  // The run returns once every output is written
  if (IDS.every(id => READERS[id].length || stages[id].status === 'done')) {
    build.done ??= build.clock;
    if (build.clock - build.done >= TAIL) {
      build.returned ??= build.clock;
    }
  }
};

// What the build holds: every result collected and not yet freed
const memoryOf = build => {
  if (build.returned !== null) {
    return 0;
  }

  let held = 0;
  for (const id of IDS) {
    const { status, collected } = build.stages[id];
    if (status !== 'freed') {
      held += collected * (STAGES[id].size ?? 0);
    }
  }

  return held;
};

/**
 * Runs a build start to finish, for the memory it holds along the way, when
 * each result is freed, and the moment the still frame shows: the outputs at
 * work side by side, on the pool and on the main thread.
 *
 * @param {{ pages: number, documents: number }} totals
 */
export const record = totals => {
  const build = createBuild(totals);
  const samples = [0];
  let still = null;
  let busiest = 0;

  while (build.returned === null) {
    advance(build, SAMPLE);
    // Eased as it climbs, so it reads as a level rather than every chunk,
    // but dropping at once when a result is freed
    const level = samples.at(-1);
    const held = memoryOf(build);
    samples.push(held < level - 0.1 ? held : level + (held - level) * 0.3);

    // The still frame: while JSON is halfway written and the search index
    // builds, the most threads at work on a chunk that has landed
    const { json, search } = build.stages;
    const busy = build.threads.filter(
      job => job && job.duration - job.left >= HOP
    ).length;
    if (
      json.collected &&
      json.status === 'running' &&
      search.status === 'running' &&
      busy > busiest
    ) {
      busiest = busy;
      still = build.clock;
    }
  }

  return {
    samples,
    frees: build.frees,
    duration: build.clock,
    peak: Math.max(...samples),
    still: still ?? build.clock / 2,
  };
};
