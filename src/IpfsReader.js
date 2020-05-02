/**
 * Created by claudio on 2020-04-24
 */

const http = require('http');
const https = require('https');
const CID = require('cids');

const defaultIpfsGatewayUrl = 'https://ipfs.catenis.io'
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

        this.reqOptions = reqOptions || {};

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
        try {
            dataCid = new CID(dataCid);
        }
        catch (err) {
            process.nextTick(() => callback(TypeError('Invalid data IPFS CID')));
            return result;
        }

        // Retrieve data from IPFS
        this.http.get(this.gatewayUrl + 'ipfs/' + dataCid.toString(), this.reqOptions, (res) => {
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
                    callback(`[${res.statusCode}] ` + (dataRead.length > 0 ? dataRead.toString() : res.statusMessage));
                }
                else {
                    // Success
                    callback(null, dataRead);
                }
            });

            res.on('error', (error) => {
                callback(error);
            })
        }).on('error', (error) => {
            callback(error);
        });

        return result;
    }
}

module.exports = IpfsReader;
