import rspack from '@rspack/core';

import path from 'node:path';
import { merge } from 'webpack-merge';

import { devServerConfig } from './rspack.server.mjs';

const lspLang = ['ts', 'py', 'go', 'java'].includes(process.env['LANG'])
  ? process.env['LANG']
  : 'ts';

const entries = {
  ts: './src/app-ts.ts',
  py: './src/app-python-django-drf.ts',
  go: './src/app-go-gin.ts',
  java: './src/app-java-spring-boot.ts',
};

/** @type {import('@rspack/cli').Configuration} */
const demoConfig = merge(
  devServerConfig,

  {
    entry: {
      main: entries[lspLang],
    },
    output: {
      filename: 'main.js',
      path: path.resolve(import.meta.dirname, '../dist'),
    },
    module: {
      rules: [],
    },
    optimization: {
      // Disabling minification because it takes too long on CI
      minimize: false,
      moduleIds: 'named',
      chunkIds: 'named',
    },
    plugins: [
      new rspack.HtmlRspackPlugin({
        template: './public/codemirror-app.html',
      }),
      // new rspack.CopyRspackPlugin({
      //   patterns: [
      //     {
      //       from: 'public',
      //     },
      //   ],
      // }),
    ],
  },
);

export default demoConfig;
