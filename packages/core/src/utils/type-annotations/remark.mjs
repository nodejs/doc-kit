'use strict';

import {
  typeAnnotationFromMarkdown,
  typeAnnotationToMarkdown,
} from './mdast.mjs';
import { typeAnnotationSyntax } from './syntax.mjs';

/**
 * Remark plugin that teaches the parser to treat any balanced `{...}` span in
 * text as a `typeAnnotation` node whose value is a TypeScript type expression.
 *
 * Only registered on the non-MDX pipeline — in MDX, `{...}` is a real
 * expression and is handled by remark-mdx instead.
 *
 * @this {import('unified').Processor}
 */
export default function remarkTypeAnnotations() {
  const data = this.data();

  (data.micromarkExtensions ??= []).push(typeAnnotationSyntax());
  (data.fromMarkdownExtensions ??= []).push(typeAnnotationFromMarkdown());
  (data.toMarkdownExtensions ??= []).push(typeAnnotationToMarkdown());
}
