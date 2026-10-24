import type { SemVer } from 'verkit';

export interface ReleaseEntry {
  version: SemVer;
  isLts: boolean;
  isCurrent: boolean;
}
