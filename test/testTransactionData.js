/**
 * Created by claudio on 2020-05-14
 */

const ctnMsgInspector = require('../src/index');
const expect = require('chai').expect;

const testSuite = require('./suite/TransactionDataSuite');

testSuite(ctnMsgInspector, expect);
