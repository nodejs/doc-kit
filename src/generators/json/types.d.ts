import {
  Class,
  Method,
  Module,
  Property,
  SectionBase,
  Text,
} from './generated.d.ts';

export type Section = SectionBase &
  (Module | Class | Method | Property | Text) &
  GeneratorMetadata;

/**
 * This is metadata that's only relevant to the generator and should be removed
 * before the file is output.
 */
export type GeneratorMetadata = {
  parent?: Section;
};
