const path = require('path');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  module: {
    rules: [{
      test: /\.js$/,
      exclude: /(node_modules)/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env']
        }
      }
    }, {
      test: /\.(sa|sc|c)ss$/,
      use: [{
        loader: MiniCssExtractPlugin.loader,
      } , {
          loader: 'css-loader',
        },
        {
          loader: 'postcss-loader'
        },
        {
          loader: 'sass-loader',
          options: {
            implementation: require('sass')
          }
        }
      ]
    }],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: "bundle.css"
    }),
    new HtmlWebpackPlugin({
      inject: true,
      template: path.resolve(__dirname, 'index.html'),
    })
  ],
  entry: ['babel-polyfill', path.resolve(__dirname, 'src/js/index.js')],
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  mode: 'production',
};
