import { GlobalConfiguration } from '../../../utils/configuration/types';
import { MetadataEntry } from '../../metadata/types';
import { Configuration } from '../types';
import { SemVer } from 'semver';

declare global {
  const SERVER: boolean;
  const CLIENT: boolean;
}

declare module '#theme/config' {
  // From global configuration
  export const repository: GlobalConfiguration['repository'];
  export const input: GlobalConfiguration['input'];
  export const ignore: GlobalConfiguration['ignore'];
  export const output: GlobalConfiguration['output'];
  export const minify: GlobalConfiguration['minify'];
  export const baseURL: GlobalConfiguration['baseURL'];
  export const ref: GlobalConfiguration['ref'];

  // From web configuration
  export const templatePath: Configuration['templatePath'];
  export const title: Configuration['title'];
  export const useAbsoluteURLs: Configuration['useAbsoluteURLs'];

  // From config generation
  export const version: SemVer;
  export const versions: Array<{
    url: string;
    label: string;
    major: number;
  }>;
  export const editURL: string;
  export const pages: Array<[string, string]>;
  export const languageDisplayNameMap: Map<string[], string>;
  export const remoteConfigUrl: string;
}

// Omit Primitives from Metadata
type Primitive = string | number | boolean | symbol | bigint | null | undefined;
type OnlyPrimitives<T> = {
  [K in keyof T as T[K] extends Primitive ? K : never]: T[K];
};

export type SerializedMetadata = OnlyPrimitives<MetadataEntry>;
