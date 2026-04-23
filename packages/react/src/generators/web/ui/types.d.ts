import type { createStaticData } from '../utils/data.mjs';

declare global {
  const __STATIC_DATA__: ReturnType<typeof createStaticData>;
  const SERVER: boolean;
  const CLIENT: boolean;
}
