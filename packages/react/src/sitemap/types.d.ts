import type { MetadataEntry } from '@nodejs/doc-kit/generators/metadata/types';

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?:
    | 'always'
    | 'hourly'
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'yearly'
    | 'never';
  priority?: string;
}

export type Generator = GeneratorMetadata<
  {
    indexURL: string;
    pageURL: string;
  },
  Generate<Array<MetadataEntry>, Promise<string>>
>;
