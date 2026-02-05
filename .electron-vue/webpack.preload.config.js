"use strict";

process.env.BABEL_ENV = "main";

const path = require("path");
const webpack = require("webpack");
const ESLintPlugin = require("eslint-webpack-plugin");

const { getEnvironmentDefinitions } = require("./marktextEnvironment");

const isProduction = process.env.NODE_ENV === "production";

/** @type {import('webpack').Configuration} */
const preloadConfig = {
  mode: "development",
  devtool: "eval-cheap-module-source-map",
  optimization: {
    emitOnErrors: false,
  },
  entry: {
    preload: path.join(__dirname, "../src/preload/index.js"),
  },
  // Preload scripts should bundle all dependencies
  externals: [],
  module: {
    rules: [
      {
        test: /\.js$/,
        use: "babel-loader",
        exclude: /node_modules/,
      },
    ],
  },
  node: {
    __dirname: !isProduction,
    __filename: !isProduction,
  },
  cache: false,
  output: {
    filename: "[name].js",
    libraryTarget: "commonjs2",
    path: path.join(__dirname, "../dist/electron"),
  },
  plugins: [
    new ESLintPlugin({
      extensions: ["js"],
      files: ["src/preload"],
      exclude: ["node_modules"],
      emitError: true,
      failOnError: true,
      threads: false,
      formatter: require("eslint-friendly-formatter"),
      context: path.resolve(__dirname, "../"),
      overrideConfigFile: ".eslintrc.js",
    }),
    new webpack.DefinePlugin(getEnvironmentDefinitions()),
  ],
  resolve: {
    extensions: [".js", ".json", ".node"],
  },
  target: "electron-preload",
};

// Fix debugger breakpoints
if (!isProduction && process.env.MARKTEXT_BUILD_VSCODE_DEBUG) {
  preloadConfig.devtool = "inline-source-map";
}

/**
 * Adjust preloadConfig for development settings
 */
if (!isProduction) {
  preloadConfig.cache = {
    name: "preload-dev",
    type: "filesystem",
  };
  preloadConfig.plugins.push(
    new webpack.DefinePlugin({
      __static: `"${path.join(__dirname, "../static").replace(/\\/g, "\\\\")}"`,
    })
  );
}

/**
 * Adjust preloadConfig for production settings
 */
if (isProduction) {
  preloadConfig.devtool = "nosources-source-map";
  preloadConfig.mode = "production";
  preloadConfig.optimization.minimize = true;
}

module.exports = preloadConfig;
