import { StateEffect, StateField } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView } from '@codemirror/view';
import { getLastHoverResult, posToOffset } from './utils';

const defCandidateTheme = EditorView.baseTheme({
  '.cm-underline-def': {
    color: '#6366F1',
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    textDecoration: 'underline 2px #6366F1',
  },
});

const defCandidateDeco = Decoration.mark({ class: 'cm-underline-def' });

const addDefCandidate = StateEffect.define<{ from: number; to: number }>({
  map: ({ from, to }, change) => ({
    from: change.mapPos(from),
    to: change.mapPos(to),
  }),
});

const clearDefCandidate = StateEffect.define<null>();

const defCandidateState = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(underlines, tr) {
    let _underlines = underlines.map(tr.changes);
    for (const ef of tr.effects) {
      if (ef.is(clearDefCandidate)) {
        return Decoration.none;
      } else if (ef.is(addDefCandidate)) {
        _underlines = _underlines.update({
          add: [defCandidateDeco.range(ef.value.from, ef.value.to)],
        });
      }
    }
    return _underlines;
  },
  provide: (f) => EditorView.decorations.from(f),
});

const defCandidateEvents = () =>
  EditorView.domEventHandlers({
    keydown(evt, view) {
      const lastHoverResult = getLastHoverResult();
      console.log(';;kdw ', evt.key, evt.metaKey, evt.ctrlKey, lastHoverResult);
      if (
        lastHoverResult?.range &&
        (evt.metaKey || evt.ctrlKey) &&
        !evt.altKey &&
        !evt.shiftKey
      ) {
        const hoverRange = lastHoverResult.range;
        view.dispatch({
          effects: addDefCandidate.of({
            from: posToOffset(view.state.doc, hoverRange.start)!,
            to: posToOffset(view.state.doc, hoverRange.end)!,
          }),
        });
      }
    },
    keyup(evt, view) {
      console.log(';;kup ', evt.key, evt.metaKey, evt.ctrlKey);
    },
    mousemove(evt, view) {
      const lastHoverResult = getLastHoverResult();
      if (!lastHoverResult?.range) {
        view.dispatch({
          effects: clearDefCandidate.of(null),
        });
        return;
      }
      if (evt.metaKey || evt.ctrlKey) {
        console.log(';;mmv ', getLastHoverResult()?.range);
      }
    },
  });

export const defCandidatePlugin = () => [
  defCandidateTheme,
  defCandidateState,
  defCandidateEvents(),
];
