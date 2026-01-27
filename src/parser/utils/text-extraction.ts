/**
 * Text extraction and normalization utilities
 */

import { JsxText } from 'ts-morph';

/**
 * Check if a JsxText node contains only whitespace (formatting between elements)
 */
export function isWhitespaceOnlyText(node: JsxText): boolean {
  return node.containsOnlyTriviaWhiteSpaces();
}

/**
 * Normalize whitespace in text content
 *
 * Collapses multiple spaces/newlines to a single space and trims edges.
 */
export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Normalize whitespace for inline text content
 *
 * Collapses multiple spaces/newlines to a single space but preserves
 * leading/trailing spaces (they separate inline elements).
 */
export function normalizeInlineWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ');
}

/**
 * Extract text content from a JsxText node
 *
 * Returns null for whitespace-only nodes (formatting between elements).
 * Otherwise returns normalized text content.
 */
export function extractText(node: JsxText): string | null {
  if (isWhitespaceOnlyText(node)) {
    return null;
  }
  const normalized = normalizeWhitespace(node.getText());
  return normalized || null;
}

/**
 * Extract text content from a JsxText node for inline context
 *
 * For inline context, we need to preserve whitespace that separates
 * inline elements. Only skip nodes that are purely formatting whitespace
 * (newlines + indentation between block elements).
 *
 * Preserves leading/trailing spaces as they separate inline elements.
 */
export function extractInlineText(node: JsxText): string | null {
  const raw = node.getText();

  // Skip purely structural whitespace (newlines with optional indentation)
  // These are formatting between block-level elements
  if (/^\s*\n\s*$/.test(raw)) {
    return null;
  }

  // Normalize multiple whitespace to single space, preserving edges
  const normalized = normalizeInlineWhitespace(raw);
  return normalized || null;
}
