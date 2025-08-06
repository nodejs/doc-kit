import { Root } from 'mdast';
import { VFile } from 'vfile';

export type IssueLevel = 'info' | 'warn' | 'error';

export interface Position {
  start: { line: number };
  end: { line: number };
}

export interface LintIssueLocation {
  path: string; // The absolute path to the file
  position?: Position;
}

export interface LintIssue {
  level: IssueLevel;
  message: string;
  location: LintIssueLocation;
}

type LintRule = (context: LintContext) => void;

export interface Linter {
  readonly issues: LintIssue[];
  lint: (file: VFile, tree: Root) => void;
  report: () => void;
  hasError: () => boolean;
}

export interface IssueDescriptor {
  level: IssueLevel;
  message: string;
  position?: Position;
}

export interface LintContext {
  readonly tree: Root;
  report(descriptor: IssueDescriptor): void;
  getIssues(): LintIssue[];
}
