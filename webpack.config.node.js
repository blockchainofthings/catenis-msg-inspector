/**
 * Created by claudio on 2020-05-04
 */

const wpConfig = require('./webpack.config');

wpConfig.target = 'node';

module.exports = wpConfig;
