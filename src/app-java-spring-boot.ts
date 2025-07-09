import './index.scss';

import { java } from '@codemirror/lang-java';
import { lintGutter } from '@codemirror/lint';
import { EditorState } from '@codemirror/state';
import { EditorView, tooltips } from '@codemirror/view';
import { basicSetup } from 'codemirror';

import {
  defUnderlinePlugin,
  languageServer,
} from './codemirror-languageserver';
import { posToOffset } from './codemirror-languageserver/utils';
import { scrollToAndCenterAtPos } from './utils';
// import { languageServer } from './codemirror-languageserver-toph';

/** absolute path to example-project folder */
const exampleProjectRootPath =
  // '/home/yaoo/Documents/repos/resources/codemirror6-lsp-typescript-language-server/example-projects/ts-js';
  // ''
  'file:///Users/yaoo/Documents/repos/com2024-showmebug/yaoo/codemirror6-lsp-typescript-language-server/example-projects/java-spring-boot';
const exampleDocPath =
  'src/main/java/com/gabrielgua/realworld/api/controller/TagController.java';

const javaLspClient = languageServer({
  // serverUri: 'ws://localhost:3000/java',
  serverUri: 'ws://localhost:4000',
  // serverUri: 'ws://localhost:3000',
  workspaceFolders: [],
  //   workspaceFolders: [
  //     {
  //       name: 'workspace',
  //       uri: 'file://exampleProjectRootPath',
  //     },
  //   ],
  rootUri: exampleProjectRootPath,
  documentUri: exampleProjectRootPath + '/' + exampleDocPath,
  languageId: 'java',

  // @ts-ignore to-implement and improve
  onGoToDefinition: (result) => {
    const selectionRange = result.selectionRange;
    const resultUriPath = result.uri.startsWith('file://')
      ? result.uri.slice(7)
      : result.uri;
    console.log(
      ';; onGoToDef ',
      resultUriPath === exampleProjectRootPath + '/' + exampleDocPath &&
        selectionRange,
      resultUriPath,
      exampleProjectRootPath + '/' + exampleDocPath,
      result,
    );
    if (
      resultUriPath ===
        exampleProjectRootPath.slice(7) + '/' + exampleDocPath &&
      selectionRange
    ) {
      const selOffset = posToOffset(view.state.doc, selectionRange.start);
      scrollToAndCenterAtPos(view, selOffset);
    }
  },
  keyboardShortcuts: {
    rename: 'F2', // Default: F2
    goToDefinition: 'ctrlcmd', // Ctrl/Cmd + Click
  },

  // Optional: Allow HTML content in tooltips
  allowHTMLContent: true,
});

// Set up the editor
const doc = `package com.gabrielgua.realworld.api.controller;

import com.gabrielgua.realworld.api.assembler.TagAssembler;
import com.gabrielgua.realworld.api.model.tag.TagListResponse;
import com.gabrielgua.realworld.api.security.authorization.CheckSecurity;
import com.gabrielgua.realworld.domain.service.TagService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/tags")
@RequiredArgsConstructor
public class TagController {

    private final TagService tagService;
    private final TagAssembler tagAssembler;

    @GetMapping
    @CheckSecurity.Public.canRead
    public TagListResponse list() {
        System.out.println(";; TagController.list()");
        return tagAssembler.toCollectionResponse(tagService.listAll());
    }
}

`;

const maxHeightEditor = EditorView.theme({
  '&': {
    width: '60vw',
    maxHeight: '55vh',
  },
  '.cm-scroller': { overflow: 'auto' },
});

const state = EditorState.create({
  doc,
  extensions: [
    basicSetup,
    maxHeightEditor,
    EditorView.clickAddsSelectionRange.of((event) => event.altKey),
    java(),
    tooltips({
      position: 'absolute',
    }),
    lintGutter(),
    javaLspClient,
    defUnderlinePlugin(),
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

window['edd'] = view;
