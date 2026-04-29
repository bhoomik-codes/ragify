import { defaultSchema } from 'rehype-sanitize';
import type { Options as SanitizeOptions } from 'rehype-sanitize';

/**
 * Sanitization schema for the rich markdown renderer.
 * Extends rehype-sanitize's defaultSchema to allow:
 *  - className (for KaTeX, syntax highlighting, custom components)
 *  - style (for inline styling from rehype-katex)
 *  - data-* attributes (for component hooks)
 */
export const sanitizeSchema: SanitizeOptions = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    // Allow on all elements
    '*': [
      ...(defaultSchema.attributes?.['*'] ?? []),
      'className',
      'style',
      'dataType',
      'dataLanguage',
    ],
    // Allow on specific elements
    span: [...(defaultSchema.attributes?.['span'] ?? []), 'style', 'className'],
    div: [...(defaultSchema.attributes?.['div'] ?? []), 'style', 'className'],
    math: ['xmlns', 'display'],
    annotation: ['encoding'],
    semantics: [],
    mrow: [],
    mi: [],
    mn: [],
    mo: [],
    mfrac: [],
    msup: [],
    msub: [],
    msubsup: [],
    munder: [],
    mover: [],
    munderover: [],
    msqrt: [],
    mroot: [],
    mtable: [],
    mtr: [],
    mtd: [],
    mtext: [],
    mspace: ['width', 'height', 'depth'],
    svg: ['xmlns', 'viewBox', 'width', 'height', 'style', 'class'],
    path: ['d', 'fill', 'stroke', 'strokeWidth', 'strokeLinecap', 'strokeLinejoin'],
  },
  // Allow SVG tags (needed for Mermaid inline SVGs)
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    'math', 'annotation', 'semantics', 'mrow', 'mi', 'mn', 'mo',
    'mfrac', 'msup', 'msub', 'msubsup', 'munder', 'mover', 'munderover',
    'msqrt', 'mroot', 'mtable', 'mtr', 'mtd', 'mtext', 'mspace',
    'svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'g',
    'defs', 'use', 'text', 'tspan', 'title', 'desc', 'clipPath',
  ],
};
