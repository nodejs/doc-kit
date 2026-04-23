import { GeneratorMetadata, Generate } from '#core/generators/types';

import {
  MiscSection,
  Section,
  SignatureSection,
  ModuleSection,
} from '../json/types';

export interface Output {
  miscs: Array<MiscSection>;
  modules: Array<Section>;
  classes: Array<SignatureSection>;
  globals: Array<ModuleSection | { type: 'global' }>;
  methods: Array<SignatureSection>;
}

export type Generator = GeneratorMetadata<
  {},
  Generate<Array<Section>, Promise<Output>>
>;
