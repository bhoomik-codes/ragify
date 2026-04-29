import { Block } from '../../types/blocks';

/**
 * Parses a string (potentially incomplete during streaming) into a list of blocks.
 * It identifies special fenced code blocks and separates them from markdown text.
 */
export function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  
  // This regex matches fenced code blocks: ```[type] [filename]\n [content] ```
  // It handles the case where the closing fence is missing (e.g., during streaming)
  const regex = /```(\w+)?(?:\s+([^\n]+))?\n([\s\S]*?)(?:```|$)/g;
  
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const [fullMatch, type = '', arg2 = '', content] = match;
    const startIndex = match.index;

    // 1. Add preceding markdown text
    if (startIndex > lastIndex) {
      blocks.push({
        type: 'markdown',
        content: text.substring(lastIndex, startIndex),
      });
    }

    // 2. Identify the block type
    const normalizedType = type.toLowerCase();
    
    if (normalizedType === 'chart') {
      blocks.push({ type: 'chart', content: content.trim(), raw: content.trim() });
    } else if (normalizedType === 'mermaid') {
      blocks.push({ type: 'mermaid', content: content.trim() });
    } else if (normalizedType === 'html') {
      blocks.push({ type: 'html', content: content.trim(), title: arg2.trim() || undefined });
    } else if (normalizedType === 'react') {
      blocks.push({ type: 'react', content: content.trim(), title: arg2.trim() || undefined });
    } else if (normalizedType === 'svg') {
      blocks.push({ type: 'svg', content: content.trim() });
    } else if (normalizedType === 'table') {
      blocks.push({ type: 'table', content: content.trim() });
    } else if (normalizedType === 'math') {
      blocks.push({ type: 'math', content: content.trim(), display: true });
    } else {
      // Default to code block
      blocks.push({ 
        type: 'code', 
        content: content.trim(), 
        language: type, 
        filename: arg2.trim() || undefined 
      });
    }

    lastIndex = regex.lastIndex;
  }

  // 3. Add any remaining text as markdown
  if (lastIndex < text.length) {
    blocks.push({
      type: 'markdown',
      content: text.substring(lastIndex),
    });
  }

  // Special case: if we are at the end of a string and it ends with an open fence,
  // the regex might have already handled it (due to (?:```|$)), 
  // but we should ensure the last block is marked correctly if it's still "streaming".
  
  return blocks;
}

/**
 * Enhanced version for streaming that can optionally return 
 * whether the last block is still open.
 */
export function parseBlocksStreaming(text: string): { blocks: Block[], isLastBlockOpen: boolean } {
  const blocks = parseBlocks(text);
  const isLastBlockOpen = text.trim().endsWith('```') === false && text.includes('```'); 
  // Simplified check: if the last occurrence of ``` isn't at the end, or there's only one.
  
  // A better check for open fence:
  const lastFenceIndex = text.lastIndexOf('```');
  const isPending = lastFenceIndex !== -1 && (text.indexOf('```', lastFenceIndex + 3) === -1);

  return { blocks, isLastBlockOpen: isPending };
}
