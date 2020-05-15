/**
 * Created by claudio on 2020-04-28
 */

const BlockchainTxReader = require('./BlockchainTxReader');
const MessageTransaction = require('./MessageTransaction');
const IpfsReader = require('./IpfsReader');
const TransactionData = require('./TransactionData');
const Util = require('./Util');

const modulesToExport = {
    BlockchainTxReader,
    MessageTransaction
}

if (typeof window === 'object') {
    // Running on a browser: exports Buffer
    modulesToExport.Buffer = Buffer;
}

if (process.env.RUNNING_MOCHA || (typeof window === 'object' && window.RUNNING_MOCHA)) {
    // Running tests
    Object.assign(modulesToExport, {
        IpfsReader,
        TransactionData,
        Util,
        CID: require('cids')
    });
}

module.exports = modulesToExport;
