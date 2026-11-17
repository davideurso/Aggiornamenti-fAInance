import React from 'react';

type TextBlock = { kind: 'paragraph' | 'heading'; text: string };
type ListItem = { text: string; number?: number };
type ListBlock = { kind: 'list'; ordered: boolean; items: ListItem[] };
type MessageBlock = TextBlock | ListBlock;
type InlinePart = { kind: 'text' | 'strong' | 'em' | 'code'; text: string };

// Deliberately small Markdown subset. HTML and links always remain text; no
// generated text can supply an element name, attribute, URL or event handler.
function messageBlocks(value: unknown): MessageBlock[] {
  const lines = String(value ?? '').replace(/\r\n?/g, '\n').trim().split('\n');
  const blocks: MessageBlock[] = [];
  let paragraph: string[] = [];
  let list: ListBlock | null = null;
  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ kind: 'paragraph', text: paragraph.join('\n') });
    paragraph = [];
  };
  for (const line of lines) {
    if (!line.trim()) {
      flushParagraph();
      continue;
    }
    const item = /^[ \t]{0,3}(?:([-+*•])|([0-9]{1,9})(?:\.\)|[.)]))[ \t]+(.*)$/.exec(line);
    if (item) {
      flushParagraph();
      const ordered = Boolean(item[2]);
      if (!list || list.ordered !== ordered) {
        list = { kind: 'list', ordered, items: [] };
        blocks.push(list);
      }
      list.items.push({ text: item[3], ...(ordered ? { number: Number(item[2]) } : {}) });
      continue;
    }
    // Explicitly indented lines continue the preceding item. Unmarked prose is
    // never split into invented expenses, titles or amounts.
    if (list && /^[ \t]{2,}\S/.test(line)) {
      list.items[list.items.length - 1].text += '\n' + line.trimStart();
      continue;
    }
    list = null;
    const heading = /^[ \t]{0,3}#{1,6}[ \t]+(.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      blocks.push({ kind: 'heading', text: heading[1] });
    } else {
      paragraph.push(line);
    }
  }
  flushParagraph();
  return blocks;
}

function closingMarker(text: string, marker: string, from: number): number {
  let at = text.indexOf(marker, from);
  while (at >= 0) {
    let escapes = 0;
    for (let i = at - 1; i >= 0 && text[i] === '\\'; i--) escapes++;
    if (escapes % 2 === 0 && at > from && !/\s/.test(text[at - 1])) return at;
    at = text.indexOf(marker, at + marker.length);
  }
  return -1;
}

function inlineParts(text: string, streaming = false): InlinePart[] {
  const parts: InlinePart[] = [];
  let plain = '';
  const flush = () => {
    if (plain) parts.push({ kind: 'text', text: plain });
    plain = '';
  };
  for (let i = 0; i < text.length;) {
    if (text[i] === '\\' && /[\\*_`]/.test(text[i + 1] || '')) {
      plain += text[i + 1];
      i += 2;
      continue;
    }
    const marker = text.startsWith('**', i) ? '**'
      : text.startsWith('__', i) && !/[\p{L}\p{N}]/u.test(text[i - 1] || '') ? '__'
      : text[i] === '*' ? '*'
      : text[i] === '`' ? '`' : '';
    const start = i + marker.length;
    if (marker && start < text.length && !/\s/.test(text[start])) {
      const end = closingMarker(text, marker, start);
      if (end >= 0) {
        flush();
        parts.push({ kind: marker.length === 2 ? 'strong' : marker === '*' ? 'em' : 'code', text: text.slice(start, end) });
        i = end + marker.length;
        continue;
      }
      // During streaming, a title may arrive before its closing **. Keep its
      // complete content visible and let the next render close the same span.
      if (streaming && marker.length === 2) {
        flush();
        parts.push({ kind: 'strong', text: text.slice(start) });
        break;
      }
    }
    plain += text[i++];
  }
  flush();
  return parts;
}

function inlineNodes(text: string, streaming: boolean) {
  return inlineParts(text, streaming).map((part, index) => {
    if (part.kind === 'strong') return <strong key={index} style={{ fontWeight: 700 }}>{part.text}</strong>;
    if (part.kind === 'em') return <em key={index}>{part.text}</em>;
    if (part.kind === 'code') return <code key={index} style={{ fontSize: 'inherit', whiteSpace: 'pre-wrap' }}>{part.text}</code>;
    return part.text;
  });
}

export function AssistantMessage({ text, streaming = false }: { text: unknown; streaming?: boolean }) {
  const blocks = messageBlocks(text);
  if (!blocks.length) return null;
  return <div style={{ minWidth: 0, maxWidth: '100%', overflowWrap: 'anywhere', whiteSpace: 'normal', fontWeight: 400 }}>
    {blocks.map((block, index) => {
      const marginBottom = index === blocks.length - 1 ? 0 : '0.6em';
      if (block.kind !== 'list') {
        return <p key={index} style={{ margin: 0, marginBottom, whiteSpace: 'pre-wrap' }}>
          {block.kind === 'heading'
            ? <strong style={{ fontWeight: 700 }}>{inlineNodes(block.text, streaming)}</strong>
            : inlineNodes(block.text, streaming)}
        </p>;
      }
      const items = block.items.map((item, itemIndex) => <li key={itemIndex} value={block.ordered ? item.number : undefined} style={{ paddingInlineStart: '0.1em', marginBottom: itemIndex === block.items.length - 1 ? 0 : '0.3em', whiteSpace: 'pre-wrap', fontWeight: 400 }}>
        {inlineNodes(item.text, streaming)}
      </li>);
      const style: React.CSSProperties = { margin: 0, marginBottom, paddingInlineStart: '1.35em', listStyleType: block.ordered ? 'decimal' : 'disc' };
      return block.ordered
        ? <ol key={index} start={block.items[0].number ?? 1} style={style}>{items}</ol>
        : <ul key={index} style={style}>{items}</ul>;
    })}
  </div>;
}

// Only the speech boundary uses this plain-text view. Never save it in chat or
// pass it to the rich renderer: titles, line breaks and lists must stay intact.
export function assistantSpeechText(value: unknown): string {
  const plain = (text: string) => inlineParts(text).map(part => part.text).join('')
    .replace(/!?\[([^\]\n]*)\]\([^\n)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[*_`#•]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();
  return messageBlocks(value).map(block => block.kind === 'list'
    ? block.items.map(item => plain(item.text)).filter(Boolean).join('\n')
    : plain(block.text)).filter(Boolean).join('\n\n');
}
