const path = require('path');
const webpack = require('webpack');

module.exports = {
  mode: 'development',
  entry: './index.js',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'public'),
    library: 'InspaceGraph',
  },
  plugins: [
    new webpack.ProvidePlugin({
      THREE: 'three-full', // three-bmfont-text requires global THREE
    }),
  ],
  module: {
    rules: [
      {
        test: /\.css$/,
        loader: ['style-loader', 'css-loader'],
      },
    ],
  },
  devServer: {
    contentBase: path.join(__dirname, 'public'),
    port: 8066,
  },
};
