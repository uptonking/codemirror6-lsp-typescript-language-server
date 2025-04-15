import { javascript } from '@codemirror/lang-javascript';
import { lintGutter } from '@codemirror/lint';
import { EditorState } from '@codemirror/state';
import { EditorView, tooltips } from '@codemirror/view';
import { basicSetup } from 'codemirror';

import { languageServer } from './codemirror-languageserver';
// import { languageServer } from './codemirror-languageserver-toph';

/** absolute path to example-project folder */
const exampleProjectRootPath =
  // '/home/yaoo/Documents/repos/resources/codemirror6-lsp-typescript-language-server/example-project';
  '/Users/yaoo/Documents/repos/com2024-showmebug/yaoo/codemirror6-lsp-typescript-language-server/example-project';

const tsLspClient = languageServer({
  serverUri: 'ws://localhost:3000/typescript',
  workspaceFolders: [],
  //   workspaceFolders: [
  //     {
  //       name: 'workspace',
  //       uri: 'file:///home/yaoo/Documents/repos/editor/all-lsp/codemirror-languageserver',
  //     },
  //   ],
  rootUri: exampleProjectRootPath,
  documentUri: exampleProjectRootPath + '/jslang.ts',
  languageId: 'typescript',

  // @ts-ignore to-implement and improve
  onGoToDefinition: (result) => {
    console.log(';; onGoToDef ', result);
  },
  keyboardShortcuts: {
    rename: 'F2', // Default: F2
    goToDefinition: 'ctrlcmd', // Ctrl/Cmd + Click
  },

  // Optional: Allow HTML content in tooltips
  allowHTMLContent: true,
});

// Set up the editor
const doc = `import * as React from 'react';
import { format } from 'date-fns';
import { addYears, formatWithOptions } from 'date-fns/fp';
import * as locales from 'date-fns/locale';

import { stores, storesMock } from './redux';

// CodeMirror LSP Demo
// 1. Hover over text
// 2. Press F2 to rename
// 3. Ctrl/Cmd+Click for definition

React;
const stateLsp = React.useState(112233);

format(new Date(2014, 1, 11), 'yyyy-MM-dd');

locales.zhCN.code;

locales.zhCN;

const addFiveYears = addYears(5);

let aabbC = { showMenu: 'fileTree' };

function example() {
  aabbC.showMenu = 'aiChat';

  console.log('Hello, World!');
}

example();

console.log(';; stores ', stores.value);
console.log(';; storesMock ', storesMock.value);

let hello11 = 'Hello';
let hello12 = 'World';

`;

const state = EditorState.create({
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
    //     console.log('Go to definition', result);
    //   },
    // }),
  ],
});

const view = new EditorView({
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
