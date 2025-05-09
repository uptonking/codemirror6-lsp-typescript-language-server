import { autocompletion, insertCompletionText } from '@codemirror/autocomplete';
import { setDiagnostics } from '@codemirror/lint';
import { Facet } from '@codemirror/state';
import {
  EditorView,
  hoverTooltip,
  Tooltip,
  ViewPlugin,
} from '@codemirror/view';
import {
  Client,
  RequestManager,
  WebSocketTransport,
} from '@open-rpc/client-js';
import {
  CompletionItemKind,
  CompletionTriggerKind,
  DiagnosticSeverity,
} from 'vscode-languageserver-protocol';

import type {
  Completion,
  CompletionContext,
  CompletionResult,
} from '@codemirror/autocomplete';
import type { Text } from '@codemirror/state';
import type { PluginValue, ViewUpdate } from '@codemirror/view';
import type { Transport } from '@open-rpc/client-js/build/transports/Transport';
import { marked } from 'marked';
import type * as LSP from 'vscode-languageserver-protocol';
import type { PublishDiagnosticsParams } from 'vscode-languageserver-protocol';

const timeout = 10000;
const changesDelay = 500;

const CompletionItemKindMap = Object.fromEntries(
  Object.entries(CompletionItemKind).map(([key, value]) => [value, key]),
) as Record<CompletionItemKind, string>;

const useLast = (values: readonly any[]) => values.reduce((_, v) => v, '');

const client = Facet.define<LanguageServerClient, LanguageServerClient>({
  combine: useLast,
});

const documentUri = Facet.define<string, string>({ combine: useLast });
const languageId = Facet.define<string, string>({ combine: useLast });

// https://microsoft.github.io/language-server-protocol/specifications/specification-current/

// Client to server then server to client
interface LSPRequestMap {
  initialize: [LSP.InitializeParams, LSP.InitializeResult];
  'textDocument/hover': [LSP.HoverParams, LSP.Hover];
  'textDocument/completion': [
    LSP.CompletionParams,
    LSP.CompletionItem[] | LSP.CompletionList | null,
  ];
}

// Client to server
interface LSPNotifyMap {
  initialized: LSP.InitializedParams;
  'textDocument/didChange': LSP.DidChangeTextDocumentParams;
  'textDocument/didOpen': LSP.DidOpenTextDocumentParams;
}

// Server to client
interface LSPEventMap {
  'textDocument/publishDiagnostics': LSP.PublishDiagnosticsParams;
}

type Notification = {
  [key in keyof LSPEventMap]: {
    jsonrpc: '2.0';
    id?: null | undefined;
    method: key;
    params: LSPEventMap[key];
  };
}[keyof LSPEventMap];

export class LanguageServerClient {
  public ready: boolean;
  public capabilities: LSP.ServerCapabilities<any>;

  public initializePromise: Promise<void>;
  private rootUri: string;
  private workspaceFolders: LSP.WorkspaceFolder[];
  private autoClose?: boolean;

  private transport: Transport;
  private requestManager: RequestManager;
  private client: Client;

  private plugins: LanguageServerPlugin[];

  constructor(options: LanguageServerClientOptions) {
    this.rootUri = options.rootUri || 'file:///';
    this.workspaceFolders = options.workspaceFolders || [];
    this.autoClose = options.autoClose;
    this.plugins = [];
    this.transport = options.transport;

    this.requestManager = new RequestManager([this.transport]);
    this.client = new Client(this.requestManager);

    this.client.onNotification((data) => {
      this.processNotification(data as any);
    });

    const webSocketTransport = this.transport as WebSocketTransport;
    if (webSocketTransport && webSocketTransport.connection) {
      // XXX(hjr265): Need a better way to do this. Relevant issue:
      // https://github.com/FurqanSoftware/codemirror-languageserver/issues/9
      webSocketTransport.connection.addEventListener('message', (message) => {
        const data = JSON.parse((message as { data: string }).data);
        if (data.method && data.id) {
          webSocketTransport.connection.send(
            JSON.stringify({
              jsonrpc: '2.0',
              id: data.id,
              result: null,
            }),
          );
        }
      });
    }

    this.initializePromise = this.initialize();
  }

  protected getInitializationOptions(): LSP.InitializeParams['initializationOptions'] {
    return {
      capabilities: {
        textDocument: {
          hover: {
            dynamicRegistration: true,
            contentFormat: ['plaintext', 'markdown'],
          },
          moniker: {},
          synchronization: {
            dynamicRegistration: true,
            willSave: false,
            didSave: false,
            willSaveWaitUntil: false,
          },
          completion: {
            dynamicRegistration: true,
            completionItem: {
              snippetSupport: false,
              commitCharactersSupport: true,
              documentationFormat: ['plaintext', 'markdown'],
              deprecatedSupport: false,
              preselectSupport: false,
            },
            contextSupport: false,
          },
          signatureHelp: {
            dynamicRegistration: true,
            signatureInformation: {
              documentationFormat: ['plaintext', 'markdown'],
            },
          },
          declaration: {
            dynamicRegistration: true,
            linkSupport: true,
          },
          definition: {
            dynamicRegistration: true,
            linkSupport: true,
          },
          typeDefinition: {
            dynamicRegistration: true,
            linkSupport: true,
          },
          implementation: {
            dynamicRegistration: true,
            linkSupport: true,
          },
        },
        workspace: {
          didChangeConfiguration: {
            dynamicRegistration: true,
          },
        },
      },
      initializationOptions: null,
      processId: null,
      rootUri: this.rootUri,
      workspaceFolders: this.workspaceFolders,
    };
  }

  public async initialize() {
    const { capabilities } = await this.request(
      'initialize',
      this.getInitializationOptions(),
      timeout * 3,
    );
    this.capabilities = capabilities;
    this.notify('initialized', {});
    this.ready = true;
  }

  public close() {
    this.client.close();
  }

  public textDocumentDidOpen(params: LSP.DidOpenTextDocumentParams) {
    return this.notify('textDocument/didOpen', params);
  }

  public textDocumentDidChange(params: LSP.DidChangeTextDocumentParams) {
    return this.notify('textDocument/didChange', params);
  }

  public async textDocumentHover(params: LSP.HoverParams) {
    return await this.request('textDocument/hover', params, timeout);
  }

  public async textDocumentCompletion(params: LSP.CompletionParams) {
    return await this.request('textDocument/completion', params, timeout);
  }

  public attachPlugin(plugin: LanguageServerPlugin) {
    this.plugins.push(plugin);
  }

  public detachPlugin(plugin: LanguageServerPlugin) {
    const i = this.plugins.indexOf(plugin);
    if (i === -1) {
      return;
    }
    this.plugins.splice(i, 1);
    if (this.autoClose) {
      this.close();
    }
  }

  protected request<K extends keyof LSPRequestMap>(
    method: K,
    params: LSPRequestMap[K][0],
    timeout: number,
  ): Promise<LSPRequestMap[K][1]> {
    return this.client.request({ method, params }, timeout);
  }

  protected notify<K extends keyof LSPNotifyMap>(
    method: K,
    params: LSPNotifyMap[K],
  ): Promise<LSPNotifyMap[K]> {
    return this.client.notify({ method, params });
  }

  protected processNotification(notification: Notification) {
    for (const plugin of this.plugins) {
      plugin.processNotification(notification);
    }
  }
}

class LanguageServerPlugin implements PluginValue {
  public client: LanguageServerClient;

  private documentUri: string;
  private languageId: string;
  private documentVersion: number;

  private changesTimeout: number;

  constructor(
    private view: EditorView,
    private allowHTMLContent: boolean,
  ) {
    this.client = this.view.state.facet(client);
    this.documentUri = this.view.state.facet(documentUri);
    this.languageId = this.view.state.facet(languageId);
    this.documentVersion = 0;
    this.changesTimeout = 0;

    this.client.attachPlugin(this);

    this.initialize({
      documentText: this.view.state.doc.toString(),
    });
  }

  public update({ docChanged }: ViewUpdate) {
    if (!docChanged) {
      return;
    }
    if (this.changesTimeout) {
      clearTimeout(this.changesTimeout);
    }
    this.changesTimeout = self.setTimeout(() => {
      this.sendChange({
        documentText: this.view.state.doc.toString(),
      });
    }, changesDelay);
  }

  public destroy() {
    this.client.detachPlugin(this);
  }

  public async initialize({ documentText }: { documentText: string }) {
    if (this.client.initializePromise) {
      await this.client.initializePromise;
    }
    this.client.textDocumentDidOpen({
      textDocument: {
        uri: this.documentUri,
        languageId: this.languageId,
        text: documentText,
        version: this.documentVersion,
      },
    });
  }

  public async sendChange({ documentText }: { documentText: string }) {
    if (!this.client.ready) {
      return;
    }
    try {
      await this.client.textDocumentDidChange({
        textDocument: {
          uri: this.documentUri,
          version: this.documentVersion++,
        },
        contentChanges: [{ text: documentText }],
      });
    } catch (e) {
      console.error(e);
    }
  }

  public requestDiagnostics(view: EditorView) {
    this.sendChange({ documentText: view.state.doc.toString() });
  }

  public async requestHoverTooltip(
    view: EditorView,
    { line, character }: { line: number; character: number },
  ): Promise<Tooltip | null> {
    if (!this.client.ready || !this.client.capabilities!.hoverProvider) {
      return null;
    }

    this.sendChange({ documentText: view.state.doc.toString() });
    const result = await this.client.textDocumentHover({
      textDocument: { uri: this.documentUri },
      position: { line, character },
    });
    if (!result) {
      return null;
    }
    const { contents, range } = result;
    let pos = posToOffset(view.state.doc, { line, character })!;
    let end: number | undefined;
    if (range) {
      pos = posToOffset(view.state.doc, range.start)!;
      end = posToOffset(view.state.doc, range.end)!;
    }
    if (pos === null) {
      return null;
    }
    const dom = document.createElement('div');
    dom.classList.add('documentation');
    if (this.allowHTMLContent) {
      dom.innerHTML = formatContents(contents) || '';
    } else {
      dom.textContent = formatContents(contents) || '';
    }
    return {
      pos,
      end,
      create: (view) => ({ dom }),
      above: true,
    };
  }

  public async requestCompletion(
    context: CompletionContext,
    { line, character }: { line: number; character: number },
    {
      triggerKind,
      triggerCharacter,
    }: {
      triggerKind: CompletionTriggerKind;
      triggerCharacter: string | undefined;
    },
  ): Promise<CompletionResult | null> {
    if (!this.client.ready || !this.client.capabilities!.completionProvider) {
      return null;
    }
    this.sendChange({
      documentText: context.state.doc.toString(),
    });

    const result = await this.client.textDocumentCompletion({
      textDocument: { uri: this.documentUri },
      position: { line, character },
      context: {
        triggerKind,
        triggerCharacter,
      },
    });

    if (!result) {
      return null;
    }

    let items = 'items' in result ? result.items : result;

    const [span, match] = prefixMatch(items);
    const token = context.matchBefore(match);
    let { pos } = context;

    if (token) {
      pos = token.from;
      const word = token.text.toLowerCase();
      if (/^\w+$/.test(word)) {
        items = items
          .filter(({ label, filterText }) => {
            const text = filterText ?? label;
            return text.toLowerCase().startsWith(word);
          })
          .sort((a, b) => {
            const aText = a.sortText ?? a.label;
            const bText = b.sortText ?? b.label;
            switch (true) {
              case aText.startsWith(token.text) &&
                !bText.startsWith(token.text):
                return -1;
              case !aText.startsWith(token.text) &&
                bText.startsWith(token.text):
                return 1;
            }
            return 0;
          });
      }
    }

    const options = items.map(
      ({
        detail,
        label,
        kind,
        textEdit,
        documentation,
        additionalTextEdits,
      }) => {
        const completion: Completion = {
          label,
          detail,
          apply(
            view: EditorView,
            completion: Completion,
            from: number,
            to: number,
          ) {
            if (isLSPTextEdit(textEdit)) {
              view.dispatch(
                insertCompletionText(
                  view.state,
                  textEdit.newText,
                  posToOffset(view.state.doc, textEdit.range.start)!,
                  posToOffset(view.state.doc, textEdit.range.end)!,
                ),
              );
            } else {
              view.dispatch(insertCompletionText(view.state, label, from, to));
            }
            if (!additionalTextEdits) {
              return;
            }
            additionalTextEdits
              .sort(({ range: { end: a } }, { range: { end: b } }) => {
                if (
                  posToOffset(view.state.doc, a)! <
                  posToOffset(view.state.doc, b)!
                ) {
                  return 1;
                } else if (
                  posToOffset(view.state.doc, a)! >
                  posToOffset(view.state.doc, b)!
                ) {
                  return -1;
                }
                return 0;
              })
              .forEach((textEdit) => {
                view.dispatch(
                  view.state.update({
                    changes: {
                      from: posToOffset(view.state.doc, textEdit.range.start)!,
                      to: posToOffset(view.state.doc, textEdit.range.end)!,
                      insert: textEdit.newText,
                    },
                  }),
                );
              });
          },
          type: kind && CompletionItemKindMap[kind].toLowerCase(),
        };
        if (documentation) {
          completion.info = formatContents(documentation);
        }
        return completion;
      },
    );

    return {
      from: pos,
      options,
      filter: false,
    };
  }

  public processNotification(notification: Notification) {
    try {
      switch (notification.method) {
        case 'textDocument/publishDiagnostics':
          this.processDiagnostics(notification.params);
      }
    } catch (error) {
      console.log(error);
    }
  }

  public processDiagnostics(params: PublishDiagnosticsParams) {
    if (params.uri !== this.documentUri) {
      return;
    }

    const diagnostics = params.diagnostics
      .map(({ range, message, severity }) => ({
        from: posToOffset(this.view.state.doc, range.start)!,
        to: posToOffset(this.view.state.doc, range.end)!,
        severity: (
          {
            [DiagnosticSeverity.Error]: 'error',
            [DiagnosticSeverity.Warning]: 'warning',
            [DiagnosticSeverity.Information]: 'info',
            [DiagnosticSeverity.Hint]: 'info',
          } as const
        )[severity!],
        message,
      }))
      .filter(
        ({ from, to }) =>
          from !== null &&
          to !== null &&
          from !== undefined &&
          to !== undefined,
      )
      .sort((a, b) => {
        switch (true) {
          case a.from < b.from:
            return -1;
          case a.from > b.from:
            return 1;
        }
        return 0;
      });

    this.view.dispatch(setDiagnostics(this.view.state, diagnostics));
  }
}

interface LanguageServerBaseOptions {
  rootUri: string | null;
  workspaceFolders: LSP.WorkspaceFolder[] | null;
  documentUri: string;
  languageId: string;
}

interface LanguageServerClientOptions extends LanguageServerBaseOptions {
  transport: Transport;
  autoClose?: boolean;
}

interface LanguageServerOptions extends LanguageServerClientOptions {
  client?: LanguageServerClient;
  allowHTMLContent?: boolean;
}

interface LanguageServerWebsocketOptions extends LanguageServerBaseOptions {
  serverUri: `ws://${string}` | `wss://${string}`;
}

export function languageServer(options: LanguageServerWebsocketOptions) {
  // const serverUri = options.serverUri;
  // delete options.serverUri;
  const { serverUri, ...restOptions } = options;
  options = restOptions as LanguageServerWebsocketOptions;
  return languageServerWithTransport({
    ...options,
    transport: new WebSocketTransport(serverUri),
  });
}

export function languageServerWithTransport(options: LanguageServerOptions) {
  let plugin: LanguageServerPlugin | null = null;

  return [
    client.of(
      options.client ||
        new LanguageServerClient({ ...options, autoClose: true }),
    ),
    documentUri.of(options.documentUri),
    languageId.of(options.languageId),
    ViewPlugin.define(
      (view) =>
        (plugin = new LanguageServerPlugin(
          view,
          Boolean(options.allowHTMLContent),
        )),
    ),
    hoverTooltip(
      (view, pos) =>
        plugin?.requestHoverTooltip(view, offsetToPos(view.state.doc, pos)) ??
        null,
    ),
    autocompletion({
      override: [
        async (context) => {
          if (plugin == null) {
            return null;
          }

          const { state, pos, explicit } = context;
          const line = state.doc.lineAt(pos);
          let trigKind: CompletionTriggerKind = CompletionTriggerKind.Invoked;
          let trigChar: string | undefined;
          if (
            !explicit &&
            plugin.client.capabilities?.completionProvider?.triggerCharacters?.includes(
              line.text[pos - line.from - 1],
            )
          ) {
            trigKind = CompletionTriggerKind.TriggerCharacter;
            trigChar = line.text[pos - line.from - 1];
          }
          if (
            trigKind === CompletionTriggerKind.Invoked &&
            !context.matchBefore(/\w+$/)
          ) {
            return null;
          }
          return await plugin.requestCompletion(
            context,
            offsetToPos(state.doc, pos),
            {
              triggerCharacter: trigChar,
              triggerKind: trigKind,
            },
          );
        },
      ],
    }),
  ];
}

function posToOffset(doc: Text, pos: { line: number; character: number }) {
  if (pos.line >= doc.lines) {
    return;
  }
  const offset = doc.line(pos.line + 1).from + pos.character;
  if (offset > doc.length) {
    return;
  }
  return offset;
}

function offsetToPos(doc: Text, offset: number) {
  const line = doc.lineAt(offset);
  return {
    character: offset - line.from,
    line: line.number - 1,
  };
}

function formatContents(
  contents: LSP.MarkupContent | LSP.MarkedString | LSP.MarkedString[],
): string | undefined {
  if (isLSPMarkupContent(contents)) {
    let value = contents.value;
    if (contents.kind === 'markdown') {
      value = marked.parse(value) as string;
    }
    return value;
  } else if (Array.isArray(contents)) {
    return contents.map((c) => formatContents(c) + '\n\n').join('');
  } else if (typeof contents === 'string') {
    return contents;
  }
}

function toSet(chars: Set<string>) {
  let preamble = '';
  let flat = Array.from(chars).join('');
  const words = /\w/.test(flat);
  if (words) {
    preamble += '\\w';
    flat = flat.replace(/\w/g, '');
  }
  return `[${preamble}${flat.replace(/[^\w\s]/g, '\\$&')}]`;
}

function prefixMatch(items: LSP.CompletionItem[]) {
  const first = new Set<string>();
  const rest = new Set<string>();

  for (const item of items) {
    const [initial, ...restStr] = item.textEdit?.newText || item.label;
    first.add(initial);
    for (const char of restStr) {
      rest.add(char);
    }
  }

  const source = toSet(first) + toSet(rest) + '*$';
  return [new RegExp('^' + source), new RegExp(source)];
}

function isLSPTextEdit(
  textEdit?: LSP.TextEdit | LSP.InsertReplaceEdit,
): textEdit is LSP.TextEdit {
  return (textEdit as LSP.TextEdit)?.range !== undefined;
}

function isLSPMarkupContent(
  contents: LSP.MarkupContent | LSP.MarkedString | LSP.MarkedString[],
): contents is LSP.MarkupContent {
  return (contents as LSP.MarkupContent).kind !== undefined;
}
