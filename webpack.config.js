const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
    entry: [
        'normalize.css',
        'particles.js',
        './src',
        './src/css/main.scss'
    ],
    output: {
        path: path.join(__dirname, 'dist'),
        filename: './js/bundle.js',
        publicPath: 'dist/',
    },
    module: {
        rules: [{
            test: /\.(scss|css)$/,
            use: [
                MiniCssExtractPlugin.loader,
                {
                    loader: "css-loader",
                    options: {
                        minimize: {
                            safe: true
                        }
                    }
                },
                {
                    loader: "sass-loader",
                    options: {}
                }
            ]
        }, ]
    },
    devServer: {
        watchContentBase: true,
    },
    plugins: [
        new HtmlWebpackPlugin({
            inject: false,
            filename: '../index.html',
            template: path.resolve(__dirname, 'index.html')
        }),
        new MiniCssExtractPlugin({
            filename: "./css/[name].css",
            chunkFilename: "./css/[id].css"
        })
    ]
}
