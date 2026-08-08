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
    /**
     * `YYYY-MM-DD` date emitted as every entry's `<lastmod>`. When unset, the
     * element is omitted entirely — the sitemap spec allows it, and stamping
     * the build date would misstate when the content actually changed.
     */
    lastmod?: string;
  },
  Generate<Array<MetadataEntry>, Promise<string>>
>;
