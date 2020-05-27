/**
 * Created by claudio on 2020-05-05
 */

const ctnMsgInspector = require('../../umd/catenis-msg-inspector.js');
const expect = require('chai').expect;

const testSuite = require('./../suite/BlockchainTxReaderSuite');

testSuite(ctnMsgInspector, expect);
