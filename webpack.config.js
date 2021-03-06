/**
 * Created by claudio on 2020-05-02
 */

const path = require('path');

module.exports = {
    target: 'web',
    mode: 'development',
    entry: {
        main: './src/index.js'
    },
    output: {
        path: path.resolve(__dirname, 'umd'),
        filename: 'catenis-msg-inspector.js',
        library: 'ctnMsgInspector',
        libraryTarget: 'umd'
    }
};
