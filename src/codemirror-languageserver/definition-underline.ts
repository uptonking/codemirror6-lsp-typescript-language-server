import { StateEffect, StateField } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView } from '@codemirror/view';
import { clearHoverResult, getLatestHoverResult, posToOffset } from './utils';

const defUnderlineTheme = EditorView.baseTheme({
  '.cm-def-underline': {
    color: '#6366F1',
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    textDecoration: 'underline 1px #6366F1',
    cursor: 'pointer',
  },
});

const defUnderlineDeco = Decoration.mark({ class: 'cm-def-underline' });

export const addDefUnderline = StateEffect.define<{ from: number; to: number }>(
  {
    map: ({ from, to }, change) => ({
      from: change.mapPos(from),
      to: change.mapPos(to),
    }),
  },
);

export const clearDefUnderline = StateEffect.define<null>();

export const defUnderlineState = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(underlines, tr) {
    let _underlines = underlines.map(tr.changes);
    for (const ef of tr.effects) {
      if (ef.is(clearDefUnderline)) {
        return Decoration.none;
      } else if (ef.is(addDefUnderline)) {
        _underlines = Decoration.none;
        _underlines = _underlines.update({
          add: [defUnderlineDeco.range(ef.value.from, ef.value.to)],
        });
      }
    }
    return _underlines;
  },
  provide: (f) => EditorView.decorations.from(f),
});

export function markHoverRangeAsUnderlined(view: EditorView) {
  const hoverRange = getLatestHoverResult()?.range;
  if (hoverRange) {
    view.dispatch({
      effects: addDefUnderline.of({
        from: posToOffset(view.state.doc, hoverRange.start)!,
        to: posToOffset(view.state.doc, hoverRange.end)!,
      }),
    });
  }
}

const defUnderlineEvents = () =>
  EditorView.domEventHandlers({
    keydown(evt, view) {
      const latestHoverResult = getLatestHoverResult();
      // console.log(
      //   ';;kdw ',
      //   evt.key,
      //   evt.metaKey,
      //   evt.ctrlKey,
      //   latestHoverResult,
      // );
      if (
        latestHoverResult?.range &&
        (evt.metaKey || evt.ctrlKey) &&
        !evt.altKey &&
        !evt.shiftKey
      ) {
        markHoverRangeAsUnderlined(view);
      }
    },
    keyup(evt, view) {
      // console.log(';;kup ', evt.key, evt.metaKey, evt.ctrlKey);
      view.dispatch({
        effects: clearDefUnderline.of(null),
      });
      // clearHoverResult();
    },
    mousemove(evt, view) {
      const latestHoverResult = getLatestHoverResult();
      if (!latestHoverResult?.range) {
        view.dispatch({
          effects: clearDefUnderline.of(null),
        });
        // clearHoverResult();
        return;
      }
      if (evt.metaKey || evt.ctrlKey) {
        // console.log(';;mmv ', evt.metaKey, evt.ctrlKey, latestHoverResult);
        // console.log(';;mmv ', getLastHoverResult()?.range);
        markHoverRangeAsUnderlined(view);
      }
    },
    blur(evt, view) {
      // console.log(';;blur');
      clearHoverResult();
      view.dispatch({
        effects: clearDefUnderline.of(null),
      });
    },
  });

export const defUnderlinePlugin = () => [
  defUnderlineTheme,
  defUnderlineState,
  defUnderlineEvents(),
];
