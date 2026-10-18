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
 * It does nothing in MDX, where `{...}` is a real expression, handled by
 * remark-mdx instead.
 *
 * @this {import('unified').Processor}
 */
export default function remarkTypeAnnotations() {
  if (this.data('mdx')) {
    return;
  }

  const data = this.data();

  (data.micromarkExtensions ??= []).push(typeAnnotationSyntax());
  (data.fromMarkdownExtensions ??= []).push(typeAnnotationFromMarkdown());
  (data.toMarkdownExtensions ??= []).push(typeAnnotationToMarkdown());
}
