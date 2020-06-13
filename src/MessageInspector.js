/**
 * Created by claudio on 2020-04-23
 */

const bitcoinLib = require('bitcoinjs-lib');
const CID = require('cids');
const ctnOffChainLib = require('catenis-off-chain-lib');
const BlockchainTxReader = require('./BlockchainTxReader');
const TransactionData = require('./TransactionData');
const IpfsReader = require('./IpfsReader');
const Util = require('./Util');

const networks = [
    'main',
    'testnet'
];
const defaultNetwork = networks[0];
const inputType = {
    payToWitnessPubKeyHash: {
        description: 'Pay to witness public key hash output',
        payment: 'p2wpkh',
        token: 'w'
    },
    payToPubKeyHash: {
        description: 'Pay to public key hash output',
        payment: 'p2pkh',
        token: 'h'
    },
    unknown: {
        description: 'Unrecognized input type',
        token: 'u'
    }
};
const outputType = {
    payToWitnessPubKeyHash: {
        description: 'Pay to witness public key hash output',
        payment: 'p2wpkh',
        token: 'w'
    },
    payToPubKeyHash: {
        description: 'Pay to public key hash output',
        payment: 'p2pkh',
        token: 'h'
    },
    nullData: {
        description: 'Null data output',
        payment: 'embed',
        token: 'd'
    },
    unknown: {
        description: 'Unrecognized output type',
        token: 'u'
    }
};
const msgTxType = {
    sendMessage: {
        name: 'sendMessage',
        description: 'Send message',
        inputRegEx: /^[wh]{2}$/,
        outputRegEx: /^[wh]{1,2}d[wh]{0,3}$/,
        readConfirmOutputRegEx: /^[wh]{2}d/,
        funcByte: 0x01
    },
    logMessage: {
        name: 'logMessage',
        description: 'Log message',
        inputRegEx: /^[wh]+$/,
        outputRegEx: /^d[wh]{0,3}$/,
        funcByte: 0x02
    },
    settleOffChainMessages: {
        name: 'settleOffChainMessages',
        description: 'Settle off-chain messages',
        inputRegEx: /^[wh]+$/,
        outputRegEx: /^d[wh]?$/,
        funcByte: 0x03
    }
};
const msgType = {
    sendStandardMessage: {
        name: 'sendStandardMessage',
        description: 'Send standard message'
    },
    logStandardMessage: {
        name: 'logStandardMessage',
        description: 'Log standard message'
    },
    sendOffChainMessage: {
        name: 'sendOffChainMessage',
        description: 'Send off-chain message'
    },
    logOffChainMessage: {
        name: 'logOffChainMessage',
        description: 'Log off-chain message'
    }
}

class MessageInspector {
    /**
     * Class constructor
     * @param {Object} [options]
     * @param {String} [options.network] Bitcoin blockchain network to where Catenis message transactions
     *                  are recorded. Valid values: 'main' (the default) and 'testnet'
     * @param {Object} [options.reqOptions] Object with common options to be passed to (Node.js')
     *                  http.request() function
     * @param {Object} [options.blockExplorer]
     * @param {Object} [options.blockExplorer.api]
     * @param {String} options.blockExplorer.api.rootUrl Root URL of blockchain explorer API to use
     * @param {String} options.blockExplorer.api.getRawTxHexEndpoint Endpoint of API service used for
     *                  getting hex-encoded raw transactions. It is expected that the endpoint has the
     *                  inline parameter ':txid'
     * @param {Object} [options.blockExplorer.reqOptions] Object with options to be passed to (Node.js')
     *                  http.request() function when accessing the blockchain explorer API
     * @param {Object} [options.ipfsGateway]
     * @param {String} [options.ipfsGateway.url] URL of IPFS gateway to use to retrieve data from IPFS
     * @param {Object} [options.ipfsGateway.reqOptions] Object with options to be passed to (Node.js')
     *                  http.request() function when retrieving data from IPFS
     */
    constructor(options) {
        if (!Util.isNonNullObject(options)) {
            this._options = {
                blockExplorer: {},
                ipfsGateway: {}
            };
        }
        else {
            this._options = Object.assign({}, options);
            
            if (!Util.isNonNullObject(options.blockExplorer)) {
                this._options.blockExplorer = {};
            }

            if (!Util.isNonNullObject(options.ipfsGateway)) {
                this._options.ipfsGateway = {};
            }
        }

        if (!isValidNetwork(this._options.network)) {
            this._options.network = defaultNetwork;
        }

        this._options.btcNetwork = this._options.network === 'main' ? bitcoinLib.networks.bitcoin : bitcoinLib.networks.testnet;
        
        if (!Util.isNonNullObject(this._options.reqOptions)) {
            this._options.reqOptions = {};
        }

        this._options.blockExplorer.reqOptions = Object.assign(
            this._options.reqOptions,
            Util.isNonNullObject(this._options.blockExplorer.reqOptions) ? this._options.blockExplorer.reqOptions
                : {}
        );
        this._options.ipfsGateway.reqOptions = Object.assign(
            this._options.reqOptions,
            Util.isNonNullObject(this._options.ipfsGateway.reqOptions) ? this._options.ipfsGateway.reqOptions
                : {}
        );
    }

    /**
     * Get nulldata output index
     * @returns {number} Index of transaction output that is of nulldata type
     * @private
     */
    get _nullDataOutputIdx() {
        return this.txIOFingerprint.output.search(outputType.nullData.token);
    }

    /**
     * Get the raw data embedded in the transaction
     * @returns {Buffer} A buffer containing the data stored in the transaction's nulldata output
     * @private
     */
    get _embeddedData() {
        return Buffer.concat(bitcoinLib.payments.embed({output: this.btcTransact.outs[this._nullDataOutputIdx].script}, {validate: false}).data);
    }

    /**
     * Get object used to retrieve blockchain transactions
     * @returns {BlockchainTxReader} Instance of a blockchain transaction reader object
     * @private
     */
    get _bcTxReader() {
        if (!this.__bcTxReader) {
            try {
                this.__bcTxReader = new BlockchainTxReader(
                    this._options.blockExplorer.api ? this._options.blockExplorer.api : this._options.network,
                    this._options.blockExplorer.reqOptions
                );
            }
            catch (err) {
                throw new Error('Error setting up blockchain transaction reader: ' + err.message);
            }
        }

        return this.__bcTxReader;
    }

    /**
     * Get object used to retrieve data from IPFS
     * @returns {IpfsReader} Instance of an IPFS reader object
     * @private
     */
    get _ipfsReader() {
        if (!this.__ipfsReader) {
            try {
                this.__ipfsReader = new IpfsReader(this._options.ipfsGateway.url, this._options.ipfsGateway.reqOptions);
            }
            catch (err) {
                throw new Error('Error setting up IPFS reader: ' + err.message);
            }
        }

        return this.__ipfsReader;
    }

    /**
     * Inspect a Catenis message
     * @param {String} [txid] ID of the blockchain transaction that was used to record the Catenis
     *                  message to be inspected. This is required when inspecting standard
     *                  (non-off-chain) messages. For off-chain messages, this should be specified
     *                  after the message has been settled to the blockchain
     * @param {String} [offChainCid] IPFS CID, in string format, of the off-chain message envelope
     *                  that holds the Catenis off-chain message to be inspected. This is required
     *                  when inspecting off-chain messages
     * @param {Function} [callback] Callback function
     * @returns {Promise<Object>,undefined} If no callback is passed, a promise is returned
     */
    inspectMessage(txid, offChainCid, callback) {
        if (typeof txid === 'function') {
            callback = txid;
            txid = offChainCid = undefined;
        }
        else if (typeof offChainCid === 'function') {
            callback = offChainCid;
            offChainCid = undefined;
        }

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
        if (!txid && !offChainCid) {
            process.nextTick(() => callback(new TypeError('Missing at least one of the parameters: \'txid\' or \'offChainCid\'')));
        }
        else {
            this._reset();

            if (txid) {
                this.txid = txid;
            }

            if (offChainCid) {
                this.offChainCid = Util.validateCid(offChainCid);
            }

            this._doInspect()
            .then(() => callback(null, this))
            .catch(err => callback(err));
        }

        return result;
    }

    /**
     * Clean up object preparing it to inspect a new message
     * @private
     */
    _reset() {
        Object.getOwnPropertyNames(this).forEach((prop) => {
            if (!prop.startsWith('_')) {
                delete this[prop];
            }
        });
    }

    /**
     * Classify the Catenis message transaction by assigning it a type
     * @private
     */
    _classifyTransaction() {
        this._genTxIOFingerprint();

        this.txType = Object.values(msgTxType).filter(txType => txType.inputRegEx.test(this.txIOFingerprint.input)
            && txType.outputRegEx.test(this.txIOFingerprint.output));

        if (this.txType.length === 0) {
            throw new Error('Invalid Catenis message transaction');
        }
    }

    /**
     * Confirm the Catenis message transaction type by comparing the function byte present in
     *  the transaction's embedded data with the types previously classified
     * @returns {Boolean} Indicates whether the message transaction type has been confirmed or not
     * @private
     */
    _confirmTransactionType() {
        this.txType = this.txType.find(type => type.funcByte === this.txData.funcByte);

        return !!this.txType;
    }

    /**
     * Generate a fingerprint for the inputs and outputs of the blockchain transaction
     * @private
     */
    _genTxIOFingerprint() {
        function getFingerprint(ioName, txIOs, ioTypes) {
            const ioTokens = [];

            txIOs.forEach(io => {
                ioTypes.some(ioType => {
                    if (ioType.payment) {
                        try {
                            const a = {};

                            if (io.witness && io.witness.length > 0) {
                                a.witness = io.witness;
                            }
                            else {
                                a[ioName] = io.script;
                            }

                            bitcoinLib.payments[ioType.payment](a);
                        }
                        catch (err) {
                            return false;
                        }
                    }

                    ioTokens.push(ioType.token);
                    return true;
                });
            });

            return ioTokens.join('');
        }

        this.txIOFingerprint = {
            input: getFingerprint('input', this.btcTransact.ins, Object.values(inputType)),
            output: getFingerprint('output', this.btcTransact.outs, Object.values(outputType))
        };
    }

    /**
     * Get origin device transaction input info
     * @returns {{address: *, pubKeyHash: *}}
     * @private
     */
    _getOriginDeviceTxInputInfo() {
        const iType = Object.values(inputType).find(type => type.token === this.txIOFingerprint.input[0]);

        if (iType && iType.payment) {
            try {
                const input = this.btcTransact.ins[0];
                const a = {
                    network: this._options.btcNetwork
                };

                if (input.witness && input.witness.length > 0) {
                    a.witness = input.witness;
                }
                else {
                    a.input = input.script;
                }

                const payInfo = bitcoinLib.payments[iType.payment](a);

                return {
                    address: payInfo.address,
                    pubKeyHash: payInfo.hash
                };
            }
            catch (er) {
                console.error(er);
            }
        }
    }

    /**
     * Get target device transaction output info
     * @returns {{address: *, pubKeyHash: *}}
     * @private
     */
    _getTargetDeviceTxOutputInfo() {
        const oType = Object.values(outputType).find(type => type.token === this.txIOFingerprint.output[0]);

        if (oType && oType.payment) {
            try {
                const payInfo = bitcoinLib.payments[oType.payment]({
                    output: this.btcTransact.outs[0].script,
                    network: this._options.btcNetwork
                });

                return {
                    address: payInfo.address,
                    pubKeyHash: payInfo.hash
                };
            }
            catch (er) {
                console.error(er);
            }
        }
    }

    /**
     * Execute internal procedures to inspect the Catenis message
     * @returns {Promise<void>}
     * @private
     */
    async _doInspect() {
        let retrieveOffChainMsgData = false;

        if (this.txid) {
            await this._retrieveCatenisTransaction();

            this._classifyTransaction();

            try {
                this.txData = new TransactionData(this._embeddedData);
                this.txData.parse();
            }
            catch (err) {
                throw new Error('Invalid Catenis message transaction: ' + err.message);
            }

            if (!this._confirmTransactionType()) {
                throw new Error('Invalid Catenis message transaction: inconsistent function byte');
            }

            if (this.txType !== msgTxType.settleOffChainMessages) {
                this.msgType = this.txType === msgTxType.logMessage ? msgType.logStandardMessage
                    : msgType.sendStandardMessage;
                this.msgOptions = this.txData.options;
                this.originDevice = this._getOriginDeviceTxInputInfo();

                if (this.txType === msgTxType.sendMessage) {
                    this.targetDevice = this._getTargetDeviceTxOutputInfo();
                    this.msgOptions.readConfirmation = this.txType.readConfirmOutputRegEx.test(this.txIOFingerprint.output);
                }

                if (this.msgOptions.embedding) {
                    if (this.msgOptions.padding) {
                        this.msgPadding = this.txData.padding;
                    }

                    this.message = this.txData.message;
                }
                else {
                    this.storageProvider = {
                        name: this.txData.storageProvider.name,
                        description: this.txData.storageProvider.description,
                        version: this.txData.storageProvider.version
                    };
                    this.messageRef = this.txData.messageRef;
                }
            }
            else {
                // Settle off-chain messages transaction
                this.batchDocCid = this.txData.batchDocCid;
                retrieveOffChainMsgData = true;
            }
        }
        else {
            retrieveOffChainMsgData = true;
        }

        if (retrieveOffChainMsgData) {
            await this._retrieveOffChainMsgData();
        }

        if (this.messageRef) {
            await this._retrieveExternalMessage();
        }
    }

    /**
     * Retrieve the blockchain transaction that was used to record the Catenis
     *  message that is being inspected
     * @returns {Promise<void>}
     * @private
     */
    async _retrieveCatenisTransaction() {
        try {
            this.hexTx = await this._bcTxReader.getTransaction(this.txid);
        }
        catch (err) {
            throw new Error('Error retrieving blockchain transaction: ' + err.message);
        }

        this.btcTransact = bitcoinLib.Transaction.fromHex(this.hexTx);
    }

    /**
     * Retrieve from IPFS the off-chain message envelope that holds the Catenis
     *  off-chain message that is being inspected
     * @returns {Promise<void>}
     * @private
     */
    async _retrieveOffChainMsgData() {
        if (this.batchDocCid) {
            // Retrieve Catenis off-chain messages batch document
            let batchDocData;

            try {
                batchDocData = await this._ipfsReader.getData(this.batchDocCid);
            }
            catch (err) {
                throw new Error('Error retrieving Catenis off-chain messages batch document: ' + err.message);
            }

            // Parse batch document
            try {
                this.batchDoc = ctnOffChainLib.BatchDocument.fromBuffer(batchDocData);
            }
            catch (err) {
                throw new Error('Error parsing Catenis off-chain messages batch document: ' + err.message);
            }
        }

        if ('offChainCid' in this) {
            // Retrieve off-chain message envelope
            let offChainMsgEnvData;

            try {
                offChainMsgEnvData = await this._ipfsReader.getData(this.offChainCid);
            }
            catch (err) {
                throw new Error('Error retrieving Catenis off-chain message envelope: ' + err.message);
            }

            // Parse off-chain message envelope
            try {
                this.offChainMsgEnvelope = ctnOffChainLib.MessageEnvelope.fromBuffer(offChainMsgEnvData);
            }
            catch (err) {
                throw new Error('Error parsing Catenis off-chain message envelope: ' + err.message);
            }

            if (this.batchDoc) {
                // Make sure that supplied Catenis off-chain message envelope is recorded
                //  in that batch document
                if (!this.batchDoc.isMessageDataInBatch(this.offChainCid)) {
                    throw new Error('Inconsistent Catenis off-chain message envelope IPFS CID');
                }
            }

            // Get message info
            this.msgType = this.offChainMsgEnvelope.msgType === ctnOffChainLib.MessageEnvelope.msgType.logMessage ? msgType.logOffChainMessage
                : msgType.sendOffChainMessage;
            this.msgOptions = {
                encryption: this.offChainMsgEnvelope.isMessageEncrypted
            };
            this.originDevice = {
                pubKeyHash: this.offChainMsgEnvelope.senderPubKeyHash
            };

            if (this.msgType === msgType.sendOffChainMessage) {
                this.targetDevice = {
                    pubKeyHash: this.offChainMsgEnvelope.receiverPubKeyHash
                };
                this.msgOptions.readConfirmation = this.offChainMsgEnvelope.isMessageWithReadConfirmation;
            }

            this.storageProvider = {
                name: this.offChainMsgEnvelope.stoProvider.name,
                description: this.offChainMsgEnvelope.stoProvider.description,
                version: this.offChainMsgEnvelope.stoProvider.version
            };
            this.messageRef = new CID(this.offChainMsgEnvelope.msgRef);
        }
    }

    /**
     * Retrieve the message externally stored on IPFS
     * @returns {Promise<void>}
     * @private
     */
    async _retrieveExternalMessage() {
        // Make sure that external message is stored on IPFS
        if (this.storageProvider.name !== 'ipfs') {
            throw new Error(`Unknown external message storage provider: [${this.storageProvider.name}] - ${this.storageProvider.description}`);
        }

        // Retrieve external message
        try {
            this.message = await this._ipfsReader.getData(this.messageRef);
        }
        catch (err) {
            throw new Error('Error retrieving external message: ' + err.message);
        }
    }
}

/**
 * Validates a blockchain network designation
 * @param {String} network The network name to be validated
 * @returns {boolean}
 */
function isValidNetwork(network) {
    return typeof network === 'string' && networks.some(n => n === network);
}

module.exports = MessageInspector;
