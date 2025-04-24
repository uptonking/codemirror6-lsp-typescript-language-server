import { StateField } from '@codemirror/state';
import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
} from '@codemirror/view';
import {
  addDefUnderline,
  clearDefUnderline,
  clearHoverResult,
  markRangeAsUnderlined,
  setIsCmdOrCtrlPressed,
  setMousePosAtEditor,
} from './utils';

const defUnderlineTheme = EditorView.baseTheme({
  '.cm-def-underline': {
    color: '#6366F1',
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    textDecoration: 'underline 1px #6366F1',
    cursor: 'pointer',
  },
});

const defUnderlineDeco = Decoration.mark({ class: 'cm-def-underline' });

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

const defUnderlineEvents = () =>
  EditorView.domEventHandlers({
    keydown(evt, view) {
      // console.log(
      //   ';;kdw ',
      //   evt.key,
      //   evt.metaKey,
      //   evt.ctrlKey,
      // );

      if ((evt.metaKey || evt.ctrlKey) && !evt.altKey && !evt.shiftKey) {
        markRangeAsUnderlined(view);
        setIsCmdOrCtrlPressed(true);
      }
      // 不能使用setTimeout，否则鼠标移到空白处按ctrl还会高亮上个定义
      // setTimeout(() => {
      //   console.log(';;kdw-line ', evt.key);
      // }, 100);`
    },
    keyup(evt, view) {
      // console.log(';;kup ', evt.key, evt.metaKey, evt.ctrlKey);
      view.dispatch({
        effects: clearDefUnderline.of(null),
      });
      setIsCmdOrCtrlPressed(false);
    },
    mousemove(evt, view) {
      const pos = view.posAtCoords({
        x: evt.clientX,
        y: evt.clientY,
      });
      setMousePosAtEditor(pos);

      if (evt.metaKey || evt.ctrlKey) {
        // console.log(';;mmv ', evt.metaKey, evt.ctrlKey, latestHoverResult);
        markRangeAsUnderlined(view);
      }
    },
    blur(evt, view) {
      // console.log(';; ms-blur ');
      view.dispatch({
        effects: clearDefUnderline.of(null),
      });
      clearHoverResult();
      setMousePosAtEditor(null);
    },
    mouseleave(event, view) {
      // console.log(';; ms-leave ');
      setMousePosAtEditor(null);
    },
  });

const cleanupDefUnderline = ViewPlugin.fromClass(
  class CleanupDefUnderline {
    destroy() {
      clearHoverResult();
      setMousePosAtEditor(null);
      setIsCmdOrCtrlPressed(false);
    }
  },
);

export const defUnderlinePlugin = () => [
  defUnderlineTheme,
  defUnderlineState,
  defUnderlineEvents(),
  cleanupDefUnderline,
];
