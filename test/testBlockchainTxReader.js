/**
 * Created by claudio on 2020-05-05
 */

const ctnMsgTx = require('../src/index');
const expect = require('chai').expect;

const testSuite = require('./suite/BlockchainTxReaderSuite');

testSuite(ctnMsgTx, expect);
