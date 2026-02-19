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

export type Generator = GeneratorMetadata<{}>;

export type Implementation = GeneratorImpl<
  Generate<Array<ApiDocMetadataEntry>, Promise<string>>
>;
