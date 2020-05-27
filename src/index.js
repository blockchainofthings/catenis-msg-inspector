/**
 * Created by claudio on 2020-04-28
 */

const modulesToExport = {
    MessageInspector: require('./MessageInspector')
}

if (process.env.RUNNING_MOCHA || (typeof window === 'object' && window.RUNNING_MOCHA)) {
    // Running tests
    Object.assign(modulesToExport, {
        BlockchainTxReader: require('./BlockchainTxReader'),
        IpfsReader: require('./IpfsReader'),
        TransactionData: require('./TransactionData'),
        Util: require('./Util'),
        CID: require('cids'),
        bitcoinLib: require('bitcoinjs-lib')
    });

    if (typeof window === 'object') {
        // Testing on a browser: exports Buffer
        modulesToExport.Buffer = Buffer;
    }
}

module.exports = modulesToExport;
