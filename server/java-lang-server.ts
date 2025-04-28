import cors from 'cors';
import express, { type Express } from 'express';
import * as http from 'http';
import * as net from 'net';
import { URL } from 'url';
import {
  Message,
  InitializeRequest,
  type InitializeParams,
} from 'vscode-languageserver';
import {
  type IWebSocket,
  WebSocketMessageReader,
  WebSocketMessageWriter,
} from 'vscode-ws-jsonrpc';
import * as rpcServer from 'vscode-ws-jsonrpc/server';
import { WebSocketServer } from 'ws';

const jdtPath =
  '/Users/yaoo/Documents/active/opt/env/jdt-language-server-1.46.1-202504011455';
const jlsArgs = [
  '-Declipse.application=org.eclipse.jdt.ls.core.id1',
  '-Dosgi.bundles.defaultStartLevel=4',
  '-Declipse.product=org.eclipse.jdt.ls.core.product',
  '-Dlog.level=WARNING',
  // '-Dlog.level=ALL',
  // '-noverify',
  '-Xmx1G',
  '-jar',
  `${jdtPath}/plugins/org.eclipse.equinox.launcher_1.7.0.v20250331-1702.jar`,
  '-configuration',
  `${jdtPath}/config_mac`,
  '-data',
  `${jdtPath}/jdtls-data`,
  '--add-modules=ALL-SYSTEM',
  '--add-opens java.base/java.util=ALL-UNNAMED',
  '--add-opens java.base/java.lang=ALL-UNNAMED',
];

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('port', process.env.PORT || 4000);

const httpServer = app.listen(app.get('port'), () => {
  console.log(
    '\n  🚀 java lsp server is running at http://localhost:%d in %s mode',
    app.get('port'),
    app.get('env'),
  );
  console.log('\n  Press CTRL-C to stop\n');
});

const wss = new WebSocketServer({
  noServer: true,
  perMessageDeflate: false,
});

httpServer.on(
  'upgrade',
  (request: http.IncomingMessage, socket: net.Socket, head: Buffer) => {
    console.log('arrived at handleUpgrade');

    const baseURL = `http://${request.headers.host}/`;
    const pathname = request.url
      ? new URL(request.url, baseURL).pathname
      : undefined;
    if (pathname === '/') {
      wss.handleUpgrade(request, socket, head, (webSocket) => {
        const socket: IWebSocket = {
          send: (content) =>
            webSocket.send(content, (error) => {
              console.log(content);
              if (error) {
                throw error;
              }
            }),
          onMessage: (cb) => webSocket.on('message', cb),
          onError: (cb) => webSocket.on('error', cb),
          onClose: (cb) => webSocket.on('close', cb),
          dispose: () => webSocket.close(),
        };

        // launch the server when the web socket is opened
        if (webSocket.readyState === webSocket.OPEN) {
          console.log('arrived at readyState ');

          launch(socket);
        } else {
          webSocket.on('open', () => {
            console.log('on open');
            launch(socket);
          });
        }
      });
    }
  },
);

export function launch(socket: IWebSocket) {
  const reader = new WebSocketMessageReader(socket);
  const writer = new WebSocketMessageWriter(socket);

  const socketConnection = rpcServer.createConnection(reader, writer, () =>
    socket.dispose(),
  );

  const serverConnection = rpcServer.createServerProcess(
    'JavaLS',
    'java',
    jlsArgs,
  );
  if (serverConnection) {
    rpcServer.forward(socketConnection, serverConnection, (message) => {
      if (Message.isRequest(message)) {
        if (message.method === InitializeRequest.type.method) {
          const initializeParams = message.params as InitializeParams;
          initializeParams.processId = process.pid;
        }
      }
      return message;
    });
  }
}
