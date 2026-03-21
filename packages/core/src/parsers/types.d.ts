import type { SemVer } from 'semver';

export interface ReleaseEntry {
  version: SemVer;
  isLts: boolean;
  isCurrent: boolean;
}
