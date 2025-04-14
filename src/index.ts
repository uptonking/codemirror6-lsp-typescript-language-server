import { javascript } from '@codemirror/lang-javascript';
import { lintGutter } from '@codemirror/lint';
import { EditorState } from '@codemirror/state';
import { EditorView, tooltips } from '@codemirror/view';
import { basicSetup } from 'codemirror';
import { languageServer } from './codemirror-languageserver';

// Configure the language server plugin
const tsLspClient = languageServer({
    serverUri: 'ws://localhost:3000/typescript',
    workspaceFolders: [],
    //   workspaceFolders: [
    //     {
    //       name: 'workspace',
    //       uri: 'file:///home/yaoo/Documents/repos/editor/all-lsp/codemirror-languageserver',
    //     },
    //   ],
    rootUri:
      '/Users/yaoo/Documents/repos/com2024-showmebug/yaoo/codemirror6-lsp-typescript-language-server/example-project',
    documentUri:
      '/Users/yaoo/Documents/repos/com2024-showmebug/yaoo/codemirror6-lsp-typescript-language-server/example-project/jslang.ts',
    languageId: 'typescript',

    keyboardShortcuts: {
      rename: 'F2', // Default: F2
      // goToDefinition: 'ctrlcmd', // Ctrl/Cmd + Click
    },

    // Optional: Allow HTML content in tooltips
    allowHTMLContent: true,
  }),
  // Set up the editor
  doc = `// CodeMirror LSP Demo
// Try these features:
// 1. Hover over text
// 2. Press F2 to rename
// 3. Ctrl/Cmd+Click for definition
// 4. Type 'console.' for completion

let aabbC = { showMenu: 'fileTree' };

function example() {
  aabbC.showMenu = 'aiChat';

  console.log("Hello, World!");

}

example();

let hello11 = "Hello";
let hello12 = "World";


`,
  state = EditorState.create({
    doc,
    extensions: [
      basicSetup,
      javascript(),
      tooltips({
        position: 'absolute',
      }),
      lintGutter(),
      tsLspClient,
      // languageServerWithClient({
      //   client: new LanguageServerClient({
      //     rootUri: 'file:///',
      //     workspaceFolders: [],
      //     transport: mockTransport,
      //   }),
      //   allowHTMLContent: true,
      //   documentUri: 'file:///example.ts',
      //   languageId: 'typescript',
      //   onGoToDefinition: (result) => {
      //     // biome-ignore lint/suspicious/noConsoleLog: <explanation>
      //     console.log('Go to definition', result);
      //   },
      // }),
    ],
  }),
  view = new EditorView({
    state,
    parent: document.querySelector('#editor') as Element,
  });

// Set up diagnostic buttons
document.querySelector('#addError')?.addEventListener('click', () => {
  const line = view.state.doc.lineAt(view.state.selection.main.head).number - 1;
  // mockServer.addErrorDiagnostic('file:///example.ts', line);
});

document.querySelector('#addWarning')?.addEventListener('click', () => {
  const line = view.state.doc.lineAt(view.state.selection.main.head).number - 1;
  // mockServer.addWarningDiagnostic('file:///example.ts', line);
});

document.querySelector('#clearDiagnostics')?.addEventListener('click', () => {
  // mockServer.clearDiagnostics('file:///example.ts');
});
