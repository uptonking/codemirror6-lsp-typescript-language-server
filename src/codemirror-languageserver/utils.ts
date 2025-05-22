import type { Text } from '@codemirror/state';
import { ChangeSet, StateEffect } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { marked } from 'marked';
import type * as LSP from 'vscode-languageserver-protocol';

export const clearDefUnderline = StateEffect.define<null>();

export const addDefUnderline = StateEffect.define<{ from: number; to: number }>(
  {
    map: ({ from, to }, change) => ({
      from: change.mapPos(from),
      to: change.mapPos(to),
    }),
  },
);

let latestHoverResult: LSP.Hover | null = null;
export function getLatestHoverResult() {
  return latestHoverResult;
}
export function setLatestHoverResult(result: LSP.Hover | null) {
  latestHoverResult = result;
}
export function clearHoverResult() {
  latestHoverResult = null;
}

/** cache mouse position at editor for showing underline */
let mousePosAtEditor: number | null = null;
export function getMousePosAtEditor() {
  return mousePosAtEditor;
}
export function setMousePosAtEditor(pos: number | null) {
  mousePosAtEditor = pos;
}

let isCmdOrCtrlPressed = false;
export function getIsCmdOrCtrlPressed() {
  return isCmdOrCtrlPressed;
}
export function setIsCmdOrCtrlPressed(isPressed: boolean) {
  isCmdOrCtrlPressed = isPressed;
}

export function markRangeAsUnderlined(
  view: EditorView,
  hoverRange?: LSP.Range,
) {
  if (!hoverRange) {
    hoverRange = getLatestHoverResult()?.range;
  }
  if (hoverRange) {
    const start = posToOffset(view.state.doc, hoverRange.start)!;
    const end = posToOffset(view.state.doc, hoverRange.end)!;

    const mousePosAtEditor = getMousePosAtEditor();

    // console.log(';; try-line ', mousePosAtEditor, start, end);
    if (
      mousePosAtEditor == null ||
      mousePosAtEditor < start ||
      mousePosAtEditor > end
    ) {
      view.dispatch({
        effects: clearDefUnderline.of(null),
      });
      return;
    }

    view.dispatch({
      effects: addDefUnderline.of({
        from: posToOffset(view.state.doc, hoverRange.start)!,
        to: posToOffset(view.state.doc, hoverRange.end)!,
      }),
    });
  } else {
    view.dispatch({
      effects: clearDefUnderline.of(null),
    });
  }
}

export function posToOffset(
  doc: Text,
  pos: { line: number; character: number },
): number | undefined {
  if (pos.line >= doc.lines) {
    // Next line (implying the end of the document)
    if (pos.character === 0) {
      return doc.length;
    }
    return;
  }
  const offset = doc.line(pos.line + 1).from + pos.character;
  if (offset > doc.length) {
    return;
  }
  return offset;
}

export function posToOffsetOrZero(
  doc: Text,
  pos: { line: number; character: number },
): number {
  return posToOffset(doc, pos) || 0;
}

export function offsetToPos(doc: Text, offset: number) {
  const line = doc.lineAt(offset);
  return {
    character: offset - line.from,
    line: line.number - 1,
  };
}

export function formatContents(
  contents:
    | LSP.MarkupContent
    | LSP.MarkedString
    | LSP.MarkedString[]
    | undefined,
): string {
  if (!contents) {
    return '';
  }
  if (isLSPMarkupContent(contents)) {
    let value = contents.value;
    if (contents.kind === 'markdown') {
      value = marked(value, { async: false });
    }
    return value;
  }
  if (Array.isArray(contents)) {
    return contents.map((c) => `${formatContents(c)}\n\n`).join('');
  }
  if (typeof contents === 'string') {
    return contents;
  }
  return '';
}

/**
 * Finds the longest common prefix among an array of strings.
 *
 * @param strs - Array of strings to analyze
 * @returns The longest common prefix string
 */
function longestCommonPrefix(strs: string[]): string {
  if (strs.length === 0) return '';
  if (strs.length === 1) return strs[0] || '';

  // Sort the array
  strs.sort();

  // Get the first and last string after sorting
  const firstStr = strs[0] || '';
  const lastStr = strs[strs.length - 1] || '';

  // Find the common prefix between the first and last string
  let i = 0;
  while (i < firstStr.length && firstStr[i] === lastStr[i]) {
    i++;
  }

  return firstStr.substring(0, i);
}

/**
 * Analyzes completion items to generate a regex pattern for matching prefixes.
 * Used to determine what text should be considered part of the current token
 * when filtering completion items.
 *
 * @param items - Array of LSP completion items to analyze
 * @returns A RegExp object that matches anywhere in a string
 */
export function prefixMatch(items: LSP.CompletionItem[]) {
  if (items.length === 0) {
    return undefined;
  }

  const labels = items.map((item) => item.textEdit?.newText || item.label);
  const prefix = longestCommonPrefix(labels);

  if (prefix === '') {
    return undefined;
  }

  const explodedPrefixes: string[] = [];
  for (let i = 0; i < prefix.length; i++) {
    const slice = prefix.slice(0, i + 1);
    if (slice.length > 0) {
      // Escape special regex characters to avoid pattern errors
      const escapedSlice = slice.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      explodedPrefixes.push(escapedSlice);
    }
  }
  const orPattern = explodedPrefixes.join('|');
  // Create regex pattern that matches the common prefix for each possible prefix by dropping the last character
  const pattern = new RegExp(`(${orPattern})$`);

  return pattern;
}

export function isLSPTextEdit(
  textEdit?: LSP.TextEdit | LSP.InsertReplaceEdit,
): textEdit is LSP.TextEdit {
  return (textEdit as LSP.TextEdit)?.range !== undefined;
}

export function isLSPMarkupContent(
  contents: LSP.MarkupContent | LSP.MarkedString | LSP.MarkedString[],
): contents is LSP.MarkupContent {
  return (contents as LSP.MarkupContent).kind !== undefined;
}

export function showErrorMessage(view: EditorView, message: string) {
  const tooltip = document.createElement('div');
  tooltip.className = 'cm-error-message';
  tooltip.style.cssText = `
  position: absolute;
  padding: 8px;
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 4px;
  color: #c00;
  font-size: 14px;
  z-index: 100;
  max-width: 300px;
  box-shadow: 0 2px 8px rgba(0,0,0,.15);
`;
  tooltip.textContent = message;

  // Position near the cursor
  const cursor = view.coordsAtPos(view.state.selection.main.head);
  if (cursor) {
    tooltip.style.left = `${cursor.left}px`;
    tooltip.style.top = `${cursor.bottom + 5}px`;
  }

  document.body.appendChild(tooltip);

  // Remove after 3 seconds
  setTimeout(() => {
    tooltip.style.opacity = '0';
    tooltip.style.transition = 'opacity 0.2s';
    setTimeout(() => tooltip.remove(), 200);
  }, 3000);
}

export function isEmptyDocumentation(
  documentation:
    | LSP.MarkupContent
    | LSP.MarkedString
    | LSP.MarkedString[]
    | undefined,
) {
  if (documentation == null) {
    return true;
  }
  if (Array.isArray(documentation)) {
    return (
      documentation.length === 0 || documentation.every(isEmptyDocumentation)
    );
  }
  if (typeof documentation === 'string') {
    return isEmptyIshValue(documentation);
  }
  const value = documentation.value;
  if (typeof value === 'string') {
    return isEmptyIshValue(value);
  }
  return false;
}

function isEmptyIshValue(value: unknown) {
  if (value == null) {
    return true;
  }
  if (typeof value === 'string') {
    // Empty string or string with only whitespace or backticks
    return value.trim() === '' || /^[\s\n`]*$/.test(value);
  }
  return false;
}

/**
 * Map a `ChangeSet` into `TextDocumentContentChangeEvent[]` to be applied by an LSP
 * @param doc The doc before applying the ChangeSet
 * @param changes The `ChangeSet` to map
 */
export function eventsFromChangeSet(
  doc: Text,
  changes: ChangeSet,
): LSP.TextDocumentContentChangeEvent[] {
  const events: {
    range?: LSP.Range;
    text: string;
  }[] = [];

  changes.iterChanges((fromA, toA, _, __, inserted) => {
    const text = inserted.toString();
    // Represents a full document change
    if (fromA == 0 && toA == doc.length) {
      events.push({ text });
      return;
    }

    // An incremental change event, converting (index) to (line, col)
    const start = offsetToPos(doc, fromA);
    const end = offsetToPos(doc, toA);
    events.push({ range: { start, end }, text });
  });

  // Sort in reverse order to prevent index shift
  events.sort((a, b) => {
    if (a.range!.start.line !== b.range!.start.line) {
      return b.range!.start.line - a.range!.start.line;
    }
    return b.range!.start.character - a.range!.start.character;
  });
  return events;
}

export function isMacOS() {
  return (
    typeof window !== 'undefined' &&
    window.navigator.userAgent.includes('Mac OS')
  );
}
