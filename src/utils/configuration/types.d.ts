import { SemVer } from 'semver';

export type Configuration = {
  global: GlobalConfiguration;

  // A list of generators to be used in the API doc generation process;
  // This is considered a "sorted" list of generators, in the sense that
  // if the last entry of this list contains a generated value, we will return
  // the value of the last generator in the list, if any.
  target: Array<keyof AvailableGenerators>;

  // The number of threads the process is allowed to use
  threads: number;

  // Number of items to process per worker thread
  chunkSize: number;
} & {
  [K in keyof AllGenerators]: GlobalConfiguration &
    ResolvedGenerator<K>['defaultConfiguration'];
};

export type GlobalConfiguration = {
  // The repository
  repository: string;

  // The path to the input source files. This parameter accepts globs and can
  // be a glob when passed to a generator.
  input: string | string[];

  // The path or glob patterns used to ignore files from the input source files.
  ignore: string | string[];

  // The path used to output generated files, this is to be considered
  // the base path that any generator will use for generating files
  // This parameter accepts globs but when passed to generators will contain
  // the already resolved absolute path to the output folder
  output: string;

  // Whether or not the minify the output, in whatever form it may be
  minify: boolean;

  // Target Node.js version for the generation of the API docs
  version: SemVer;

  // A list of all major versions and their respective release information
  changelog: Array<ApiDocReleaseEntry>;

  // A list of all the titles of all the documentation files
  index: Array<{ section: string; api: string }>;

  // The base URL
  baseURL: string | URL;

  // Git ref (i.e. HEAD)
  ref: string;
};
