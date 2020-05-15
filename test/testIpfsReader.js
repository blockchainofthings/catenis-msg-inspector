/**
 * Created by claudio on 2020-05-13
 */

const ctnMsgTx = require('../src/index');
const expect = require('chai').expect;

const testSuite = require('./suite/IpfsReaderSuite');

testSuite(ctnMsgTx, expect);
