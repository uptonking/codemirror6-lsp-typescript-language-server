import { type StateEffect } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { Text } from '@codemirror/state';

export function scrollToAndCenterAtPos(view: EditorView, pos = 0) {
  const docLen = view.state.doc.length;
  pos = pos > docLen - 1 ? docLen : pos;

  const effects: StateEffect<unknown>[] = [];
  effects.push(
    EditorView.scrollIntoView(pos, {
      y: 'center',
      // y: 'nearest',
      // y: 'end',
    }),
  );
  console.log(';; docLen/targetSel ', docLen, pos);

  view.state.doc;
  view.focus();
  view.dispatch({
    effects: effects,
    selection: {
      anchor: pos,
    },
  });
}
