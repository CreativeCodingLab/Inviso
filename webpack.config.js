// Global imports
const webpack = require('webpack');
const path = require('path');

// Paths
const entry = './src/js/app.js';
const includePath = path.join(__dirname, 'src/js');
const nodeModulesPath = path.join(__dirname, 'node_modules');
let outputPath = path.join(__dirname, 'src/public/assets/js');

// Environment
const PROD = JSON.parse(process.env.NODE_ENV || 0);

// Dev environment
let env = 'dev';
let devtool = 'eval';
let debug = true;

const time = Date.now();
const plugins = [
  new webpack.NoErrorsPlugin(),
  new webpack.DefinePlugin({
    __ENV__: JSON.stringify(env),
    ___BUILD_TIME___: time,
  }),
];

// Production environment
if (PROD) {
  env = 'prod';
  devtool = 'hidden-source-map';
  debug = false;
  outputPath = path.join(__dirname, '/build/public/assets/js');

  const uglifyOptions = {
    sourceMap: false,
    mangle: true,
    compress: {
      drop_console: true,
    },
    output: {
      comments: false,
    },
  };
  plugins.push(new webpack.optimize.UglifyJsPlugin(uglifyOptions));
}

console.log('Webpack build - ENV: ' + env + ' V: ' + time);
console.log('    - outputPath ', outputPath);
console.log('    - includePath ', includePath);
console.log('    - nodeModulesPath ', nodeModulesPath);

module.exports = {
  stats: {
    colors: true,
  },
  debug,
  devtool,
  devServer: {
    contentBase: 'src/public',
  },
  entry: [entry],
  output: {
    path: outputPath,
    publicPath: 'assets/js',
    filename: 'app.js',
  },
  module: {
    loaders: [
      {
        test: /\.scss$/,
        loaders: ['style-loader', 'css-loader', 'sass-loader'],
      },
      {
        test: /\.js?$/,
        loader: 'babel-loader',
        query: {
          retainLines: true,
          presets: ['es2015'],
        },
        include: [includePath, nodeModulesPath],
      },
    ],
  },
  plugins,
};
