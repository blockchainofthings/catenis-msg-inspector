/**
 * Created by claudio on 2020-04-28
 */

const http = require('http');
const https = require('https');
const Util = require('./Util');

const defaultNetwork = 'main';
const defaultExplorerApiRootUrl = {
    main: 'https://blockstream.info/api/',
    testnet: 'https://blockstream.info/testnet/api/'
};
const defaultGetRawTxHexEndpoint = 'tx/:txid/hex';
const validProtocols = [
    'http:',
    'https:'
];


class BlockchainTxReader {
    /**
     * Class constructor
     * @param {Object|String} [explorerApi] If a string is passed instead of an object, it is consider
     *                         a network designation and the default explorer API for that given network
     *                         is used. Valid values: 'main' (the default) and 'testnet'
     * @param {String} explorerApi.rootUrl Root URL of blockchain explorer API to use
     * @param {String} explorerApi.getRawTxHexEndpoint Endpoint of API service used for getting hex-encoded raw transactions.
     *                  It is expected that the endpoint has the inline parameter ':txid'
     * @param {Object} [reqOptions] Options object to be used with (Node.js') http.request() function
     */
    constructor(explorerApi, reqOptions) {
        let error = false;

        if (explorerApi === undefined || typeof explorerApi === 'string') {
            const network = explorerApi && isValidNetwork(explorerApi) ? explorerApi : defaultNetwork;

            this.explorerApiUrl = new URL(defaultGetRawTxHexEndpoint, defaultExplorerApiRootUrl[network]);
        }
        else if (typeof explorerApi === 'object' && explorerApi !== null) {
            try {
                this.explorerApiUrl = new URL(explorerApi.getRawTxHexEndpoint, explorerApi.rootUrl);
            }
            catch (err) {
                error = true;
            }
        }
        else {
            error = true;
        }

        if (error || validProtocols.findIndex(p => p === this.explorerApiUrl.protocol) < 0) {
            throw new TypeError('Invalid blockchain explorer API URL');
        }

        this.reqOptions = Object.assign(Util.urlToOptions(this.explorerApiUrl), reqOptions || {});

        if (this.reqOptions.timeout) {
            // Timeout set. Make sure that it is properly set for
            //  the browser implementation of http request
            this.reqOptions.requestTimeout = this.reqOptions.timeout;
        }

        this.http = this.explorerApiUrl.protocol === 'https:' ? https : http;
    }

    /**
     * Retrieve a transaction from the blockchain
     * @param {String} txid The ID of the transaction to retrieve
     * @param {Function} [callback] Callback function
     * @return {Promise<String>,undefined} If no callback is passed, a promise is returned
     */
    getTransaction(txid, callback) {
        let result;

        // Prepare promise to be returned if no callback passed
        if (typeof callback !== 'function') {
            result = new Promise((resolve, reject) => {
                callback = (err, res) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(res);
                    }
                }
            });
        }

        // Do processing now
        if (typeof txid !== 'string' || txid.length === 0) {
            process.nextTick(() => callback(TypeError('Invalid transaction ID')));
            return result;
        }

        // Retrieve data from IPFS
        let reqTimedOut = false;

        const req = this.http.get(Object.assign(this.reqOptions, {path: this.reqOptions.path.replace(':txid', txid)}), (res) => {
            const dataChunks = [];

            res.on('readable', () => {
                let data;

                while (data = res.read()) {
                    dataChunks.push(data);
                }
            });

            res.on('end', () => {
                const dataRead = Buffer.concat(dataChunks);

                if (res.statusCode >= 300) {
                    // Error
                    callback(new Error(`[${res.statusCode}] ` + (dataRead.length > 0 ? dataRead.toString() : res.statusMessage)));
                }
                else {
                    // Success
                    callback(null, dataRead.toString());
                }
            });

            res.on('error', (error) => {
                callback(error);
            })
        })
        .on('error', (error) => {
            if (reqTimedOut) {
                // Error event should have been triggered by request timeout
                //  so replace it with a local error
                if (!(error instanceof Error && ((error.name === 'Error' && error.message === 'socket hang up')
                        || (error.name === 'AbortError' && error.message === 'Fetch is aborted')))) {
                    console.debug('Unexpected error after request timeout:', error);
                }

                error = new Error('Request timed out');
            }

            callback(error);
        })
        .on('timeout', () => {
            // Data request timed out (on Node.js). Abort request
            //  (and an error will be automatically thrown)
            reqTimedOut = true;
            req.abort();
        })
        .on('requestTimeout', () => {
            // Data request timed out (on the browser). No need to abort it
            reqTimedOut = true;

            if (req._mode !== 'fetch') {
                // If not in fetch mode (but rather using XMLHttpRequest), return
                //  error now because no error event is generated
                callback(new Error('Request timed out'));
            }
        });

        return result;
    }
}

/**
 * Validates a blockchain network designation
 * @param {String} network The network name to be validated
 * @returns {boolean}
 */
function isValidNetwork(network) {
    return Object.keys(defaultExplorerApiRootUrl).some(k => k === network);
}

module.exports = BlockchainTxReader;
