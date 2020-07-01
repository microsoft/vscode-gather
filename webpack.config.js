//@ts-check
"use strict";

const path = require("path");
const analyzer = require("webpack-bundle-analyzer");
const FileManagerPlugin = require("filemanager-webpack-plugin-fixed");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

const config = {
  target: "node",
  entry: "./src/extension.ts",
  output: {
    path: path.resolve(__dirname, "out"),
    filename: "extension.js",
    libraryTarget: "commonjs2",
    devtoolModuleFilenameTemplate: "../[resource-path]",
  },
  devtool: "source-map",
  externals: ["vscode", "commonjs"],
  resolve: {
    extensions: [".ts", ".js"],
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin({ sourceMap: true })],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new FileManagerPlugin({
      onEnd: [
        {
          copy: [
            {
              source:
                "./node_modules/@msrvida/python-program-analysis/dist/es5/specs/*.yaml",
              destination: "./out/client/gatherSpecs",
            },
          ],
        },
      ],
    }),
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
