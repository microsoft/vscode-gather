//@ts-check
"use strict";

const path = require("path");
const analyzer = require("webpack-bundle-analyzer");
const FileManagerPlugin = require("filemanager-webpack-plugin-fixed");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const JavaScriptObfuscator = require("webpack-obfuscator");

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
  externals: ["vscode", "commonjs"],
  resolve: {
    extensions: [".ts", ".js"],
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin({ sourceMap: true })],
    splitChunks: {
      cacheGroups: {
        ppa: {
          test: /[\\/]node_modules[\\/]((@msrvida).*)[\\/]/,
          name: "ppa",
          chunks: "all",
        },
        node_modules: {
          test: /[\\/]node_modules[\\/]((?!@msrvida).*)[\\/]/,
          name: "node_modules",
          chunks: "all",
        },
      },
    },
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
    new JavaScriptObfuscator(
      {
        rotateStringArray: true,
        shuffleStringArray: true,
        splitStrings: true,
        splitStringsChunkLength: 10,
        stringArray: true,
        stringArrayEncoding: "base64",
        stringArrayThreshold: 0.75,
      },
      [
        // Chunks to not obfuscate.
        "node_modules.js",
      ]
    ),
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
