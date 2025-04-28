# codemirror6-lsp-typescript-language-server

> implement codemirror 6 autocomplete/hover/go-to-definition with LSP

## features

- autocomplete
- hover info
- go to definition
- wip: lint

- 🌰 examples
  - typescript lsp with typescript-language-server
  - python lsp with pyright
  - go lsp with gopls
  - java lsp with eclipse jdtls

## quickstart

```shell
npm i

# start all language servers
npm run serve:langs

# view ts/js lsp example
npm run demo

# view python lsp example
npm run demo:py

# view go lsp example
npm run demo:go

# view java lsp example
npm run demo:java
```

- view the example at http://localhost:8999/

## acknowledgements

- codemirror-language-server-client
  - https://github.com/marimo-team/codemirror-languageserver
  - https://github.com/FurqanSoftware/codemirror-languageserver

- language-servers
  - https://github.com/typescript-language-server/typescript-language-server
  - https://github.com/DetachHead/basedpyright
  - https://github.com/golang/tools/tree/master/gopls
  - https://github.com/rust-lang/rust-analyzer
  - https://github.com/eclipse-jdtls/eclipse.jdt.ls
