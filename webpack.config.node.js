/**
 * Created by claudio on 2020-05-04
 */

const wpConfig = require('./webpack.config');

wpConfig.target = 'node';
wpConfig.resolve = {
    extensions: ['.js', '.mjs'],
    mainFields: ['main', 'module']
};

module.exports = wpConfig;
