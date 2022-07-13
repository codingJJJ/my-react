const { resolve } = require('path')
const HTMLWebpackPlugin = require('html-webpack-plugin')

module.exports = {
    // 模式
    mode: 'development',
    // 入口
    entry: './src/index.js',
    output: {
        // 打包后的文件名
        filename: 'boundle.js',
        // 打包文件路径
        path: resolve(__dirname, 'dist')
    },
    module: {
        // 配置loader
        rules: [
            {
                test: /.js$/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-react']
                    }
                }
            }
        ]
    },
    devtool: 'source-map',
    // 配置html-webpack-plugin
    plugins: [new HTMLWebpackPlugin({
        template: 'src/index.html'
    })]
}