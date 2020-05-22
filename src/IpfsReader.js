/**
 * Created by claudio on 2020-04-24
 */

const http = require('http');
const https = require('https');
const url = require('url');
const Util = require('./Util');

const defaultIpfsGatewayUrl = 'https://ipfs.catenis.io';
const validProtocols = [
    'http:',
    'https:'
];

class IpfsReader {
    /**
     * Class constructor
     * @param {String} [ipfsGatewayUrl] URL of IPFS gateway to use to retrieve data from IPFS
     * @param {Object} [reqOptions] Options object to be used with (Node.js') http.request() function
     */
    constructor(ipfsGatewayUrl, reqOptions) {
        if (typeof ipfsGatewayUrl === 'object') {
            reqOptions = ipfsGatewayUrl;
            ipfsGatewayUrl = undefined;
        }

        ipfsGatewayUrl = ipfsGatewayUrl || defaultIpfsGatewayUrl;

        let error = false;

        try {
            this.gatewayUrl = new URL(ipfsGatewayUrl);
        }
        catch (err) {
            error = true;
        }

        if (error || validProtocols.findIndex(p => p === this.gatewayUrl.protocol) < 0) {
            throw new TypeError('Invalid IPFS Gateway URL');
        }

        this.reqOptions = Object.assign(Util.urlToOptions(this.gatewayUrl), reqOptions || {});

        if (this.reqOptions.timeout) {
            // Timeout set. Make sure that it is properly set for
            //  the browser implementation of http request
            this.reqOptions.requestTimeout = this.reqOptions.timeout;
        }

        this.http = this.gatewayUrl.protocol === 'https:' ? https : http;
    }

    /**
     * Retrieve data from IPFS
     * @param {String|Object} dataCid IPFS content ID of the data to retrieve
     * @param {Function} [callback] Callback function
     * @return {Promise<Buffer>,undefined} If no callback is passed, a promise is returned
     */
    getData(dataCid, callback) {
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
        dataCid = Util.validateCid(dataCid);

        if (!dataCid) {
            process.nextTick(() => callback(TypeError('Invalid data IPFS CID')));
            return result;
        }

        // Retrieve data from IPFS
        let reqTimedOut = false;

        const req = this.http.get(Object.assign({}, this.reqOptions, {path: url.resolve(this.reqOptions.path, 'ipfs/' + dataCid.toString())}), (res) => {
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
                    callback(null, dataRead);
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

module.exports = IpfsReader;
