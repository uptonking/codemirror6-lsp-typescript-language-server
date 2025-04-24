import { go } from '@codemirror/lang-go';
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
  // ''
  'file:///Users/yaoo/Documents/repos/com2024-showmebug/yaoo/codemirror6-lsp-typescript-language-server/example-projects/go-gin-gorm';
const exampleDocPath = 'main.go';

const goLspClient = languageServer({
  serverUri: 'ws://localhost:3000/go',
  workspaceFolders: [],
  //   workspaceFolders: [
  //     {
  //       name: 'workspace',
  //       uri: 'file://exampleProjectRootPath',
  //     },
  //   ],
  rootUri: exampleProjectRootPath,
  documentUri: exampleProjectRootPath + '/' + exampleDocPath,
  languageId: 'go',

  // @ts-ignore to-implement and improve
  onGoToDefinition: (result) => {
    console.log(';; onGoToDef ', result);
    const selectionRange = result.selectionRange;
    if (
      result.uri === exampleProjectRootPath + '/' + exampleDocPath &&
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
const doc = `package main

import (
	"fmt"
	"net/http"

	"github.com/examples-hub/realworld-gin-gorm/middleware"
	"github.com/examples-hub/realworld-gin-gorm/models"
	"github.com/examples-hub/realworld-gin-gorm/router"
	"github.com/examples-hub/realworld-gin-gorm/validator"
	"github.com/gin-gonic/gin"
)

func main() {
	// config.InitConfig()
	models.InitDB()

	app := gin.Default()

	middleware.LoadMiddleware(app)
	validator.RegisterMyValidator(app)
	router.LoadRouter(app)

	app.GET("/ping", func(c *gin.Context) {
		fmt.Println("/ping route ing")
		c.JSON(http.StatusOK, gin.H{
			"message": "pong",
		})
	})

	// addr := viper.GetString("serverAddr")
	// r.Run(addr)
	app.Run()
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
    go(),
    tooltips({
      position: 'absolute',
    }),
    lintGutter(),
    goLspClient,
    defUnderlinePlugin(),
  ],
});
const view = new EditorView({
  state,
  parent: document.querySelector('#editor') as Element,
});
