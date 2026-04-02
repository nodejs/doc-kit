import { MetadataEntry } from '../../metadata/types';

declare global {
  const SERVER: boolean;
  const CLIENT: boolean;
}

declare module '#theme/config' {
  export const title: string;
  export const repository: string;
  export const version: string;
  export const versions: Array<{
    url: string;
    label: string;
    major: number;
  }>;
  export const editURL: string;
  export const pages: Array<[string, string, string?]>;
  export const languageDisplayNameMap: Map<string, string>;
}

// Omit Primitives from Metadata
type Primitive = string | number | boolean | symbol | bigint | null | undefined;
type OnlyPrimitives<T> = {
  [K in keyof T as T[K] extends Primitive ? K : never]: T[K];
};

export type SerializedMetadata = OnlyPrimitives<MetadataEntry>;
