/**
 * Options of a build.
 */
export interface BuildOptions {
  /**
   * The entry module.
   *
   * Relative to the working directory.
   */
  input: string;
  /**
   * Whether to minify the output.
   *
   * @default false
   */
  minify?: boolean;
  /**
   * Where to write the output.
   *
   * @experimental
   */
  output?: Readonly<{ dir: string; format?: Format }>;
}

/**
 * Options of a watched build. Changes wait for {@link WatchOptions.delay},
 * then rebuild as {@link BuildOptions.input} says.
 */
export interface WatchOptions extends BuildOptions {
  /** Milliseconds to wait for further changes. */
  delay?: number;
}

/**
 * The events of a {@link Watcher}, with the arguments of their listeners.
 */
export interface WatcherEvents {
  /** A build finished. */
  done: [duration: number];
  /** A build failed. */
  error: [error: Error, details: { file: string }];
}

// Stands in for `node:events`, whose type argument maps events to arguments
declare class EventEmitter<_Events> {}

/**
 * Watches files and rebuilds.
 */
export class Watcher extends EventEmitter<WatcherEvents> {
  /** Whether it is watching. */
  get running(): boolean {
    return true;
  }

  /**
   * Stops watching.
   *
   * @param force Whether to stop running builds too.
   * @returns Whether it was watching.
   */
  close(force?: boolean): boolean {
    return Boolean(force);
  }

  /** Watches with the default options. */
  static create(): Watcher {
    return new Watcher();
  }
}

/**
 * Builds once.
 *
 * @param options The options.
 * @returns The output files.
 * @kind async
 * @example
 * ```js
 * await build({ input: 'main.js' });
 * ```
 */
export function build(options: BuildOptions): Promise<string[]> {
  return Promise.resolve([options.input]);
}

/**
 * Watches and rebuilds.
 *
 * @deprecated Use {@link build} in a loop.
 */
export function watch(options: WatchOptions): Watcher {
  return options && new Watcher();
}

/** A function compiling a module. */
export interface Compile {
  /**
   * Compiles a module.
   *
   * @param source The module's source.
   */
  (source: string): string;
}

/** Compiles a module with the default options. */
export const compile: Compile = source => source;

/** The supported formats. */
export type Format = 'esm' | 'cjs';

/** Transforms a module's code. */
export type Transform = (code: string) => string;

/** Returns the code it is given. */
export const identity: Transform = code => code;

/**
 * Prints a module.
 *
 * @param printer Where to print to.
 */
export function print(printer: {
  /**
   * Indents a line.
   *
   * @param level How deep.
   */
  indent(level?: number): string;
}): void {
  printer.indent();
}

/**
 * The events of a {@link Server}, with the arguments of their listeners.
 */
export interface ServerEvents {
  /** A client connected. */
  connect: [id: string];
}

/**
 * Serves the output, emitting the events of {@link ServerEvents}.
 */
export interface Server {
  /**
   * Listens to an event.
   *
   * @param event The event.
   * @param listener Called with the arguments of the event.
   */
  on<E extends keyof ServerEvents>(
    event: E,
    listener: (...args: ServerEvents[E]) => void
  ): this;
}

/** How much to log. */
export enum Level {
  /** Everything. */
  Info,
  /** Problems only. */
  Warn,
}

/** The version. */
export const VERSION: string = '1.0.0';

/** Plugins shipped with the bundler. */
export namespace plugins {
  /** Prepends a banner to every chunk. */
  export class BannerPlugin {
    /** The banner. */
    banner = '';
  }
}
