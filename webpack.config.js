//@ts-check
"use strict";

const path = require("path");
const analyzer = require("webpack-bundle-analyzer");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const copyWebpackPlugin = require('copy-webpack-plugin');

const config = {
  target: "node",
  entry: {
    extension: "./src/extension.ts",
  },
  output: {
    path: path.resolve(__dirname, "out"),
    filename: "[name].js",
    libraryTarget: "commonjs2",
    devtoolModuleFilenameTemplate: "../[resource-path]",
  },
  devtool: "source-map",
  externals: ["vscode", "commonjs", "@msrvida/python-program-analysis"],
  resolve: {
    extensions: [".ts", ".js"],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new copyWebpackPlugin([
      {
          from: './node_modules/@msrvida/python-program-analysis/dist/es5/index.js',
          to: './node_modules/@msrvida/python-program-analysis/dist/es5/index.js'
      }
    ]),
    new copyWebpackPlugin([
      {
          from: './node_modules/@msrvida/python-program-analysis/dist/umd/index.js',
          to: './node_modules/@msrvida/python-program-analysis/dist/umd/index.js'
      }
    ]),
    new copyWebpackPlugin([
      {
          from: './node_modules/@msrvida/python-program-analysis/package.json',
          to: './node_modules/@msrvida/python-program-analysis/package.json'
      }
    ])
    // new analyzer.BundleAnalyzerPlugin({
    //   analyzerMode: "static",
    //   reportFilename: "analyzer.html",
    //   openAnalyzer: true,
    //   generateStatsFile: true,
    // }),
  ],
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "ts-loader",
          },
        ],
      },
    ],
  },
};

module.exports = config;
