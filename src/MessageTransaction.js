/**
 * Created by claudio on 2020-04-23
 */

const bitcoinLib = require('bitcoinjs-lib');
const ctnOffChainLib = require('catenis-off-chain-lib');
const TransactionData = require('./TransactionData');
const IpfsReader = require('./IpfsReader');

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

class MessageTransaction {
    /**
     * Class constructor
     * @param {String} hexTx Hex-encoded serialized blockchain transaction
     * @param {String} [network] Blockchain network from where the transaction come. Valid values:
     *                          'main' (the default) and 'testnet'
     * @param {Object} [options]
     * @param {String} [options.offChainMsgEnvCid] IPFS CID, in string format, of off-chain message envelope.
     *                  This is required to retrieve off-chain messages
     * @param {String} [options.ipfsGatewayUrl] URL of IPFS gateway to use to retrieve data from IPFS
     * @param {Object} [options.reqOptions] Options object to be used with (Node.js') http.request() function
     */
    constructor(hexTx, network, options) {
        if (typeof network === 'object' && network !== null) {
            options = network;
            network = undefined;
        }

        this.network = isValidNetwork(network) ? network : defaultNetwork;
        this.btcNetwork = this.network === 'main' ? bitcoinLib.networks.bitcoin : bitcoinLib.networks.testnet;
        this.options = options || {};

        try {
            this.btcTransact = bitcoinLib.Transaction.fromHex(hexTx);
        }
        catch (err) {
            throw new Error('Invalid hex transaction');
        }

        this._classifyTransaction();
        
        try {
            this.txData = new TransactionData(this.embeddedData);
            this.txData.parse();
        }
        catch (err) {
            throw new Error('Invalid Catenis message transaction: ' + err.message);
        }

        if (!this._confirmTransactionType()) {
            throw new Error('Invalid Catenis message transaction: inconsistent function byte');
        }

        if (this.type !== msgTxType.settleOffChainMessages) {
            this.msgType = this.type === msgTxType.logMessage ? msgType.logStandardMessage
                : msgType.sendStandardMessage;
            this.msgOptions = this.txData.options;
            this.originDevice = this._getOriginDeviceTxInputInfo();

            if (this.type === msgTxType.sendMessage) {
                this.targetDevice = this._getTargetDeviceTxOutputInfo();
                this.msgOptions.readConfirmation = this.type.readConfirmOutputRegEx.test(this.ioFingerprint.output);
            }

            if (this.msgOptions.embedding) {
                this.message = this.txData.message;
            }
            else {
                this.messageRef = this.txData.messageRef;
            }
        }
        else {
            if (!this.options.offChainMsgEnvCid) {
                throw new Error('Missing Catenis off-chain message envelope IPFS CID');
            }

            (this.offChainPromise = Promise.race([
                this._retrieveOffChainMsgEnvelope()
            ]))
            .catch(() => {});   // Required to avoid unhandled promise rejection warning
        }
    }

    /**
     * Get nulldata output index
     * @returns {number} Index of transaction output that is of nulldata type
     */
    get nullDataOutputIdx() {
        return this.ioFingerprint.output.search(outputType.nullData.token);
    }

    /**
     * Get the raw data embedded in the transaction
     * @returns {Buffer} A buffer containing the data stored in the transaction's nulldata output
     */
    get embeddedData() {
        return Buffer.concat(bitcoinLib.payments.embed({output: this.btcTransact.outs[this.nullDataOutputIdx].script}, {validate: false}).data);
    }

    /**
     * Get object used to retrieve data from IPFS
     * @returns {IpfsReader} Instance of an IPFS reader object
     */
    get ipfsReader() {
        if (!this._ipfsReader) {
            try {
                this._ipfsReader = new IpfsReader(this.options.ipfsGatewayUrl, this.options.reqOptions);
            }
            catch (err) {
                throw new Error('Error setting up IPFS reader: ' + err.message);
            }
        }

        return this._ipfsReader;
    }

    /**
     * Classify the Catenis message transaction by assigning it a type
     * @private
     */
    _classifyTransaction() {
        this._genTxIOFingerprint();

        this.type = Object.values(msgTxType).filter(txType => txType.inputRegEx.test(this.ioFingerprint.input)
            && txType.outputRegEx.test(this.ioFingerprint.output));

        if (this.type.length === 0) {
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
        this.type = this.type.find(type => type.funcByte === this.txData.funcByte);

        return !!this.type;
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

        this.ioFingerprint = {
            input: getFingerprint('input', this.btcTransact.ins, Object.values(inputType)),
            output: getFingerprint('output', this.btcTransact.outs, Object.values(outputType))
        };
    }

    _getOriginDeviceTxInputInfo() {
        const iType = Object.values(inputType).find(type => type.token === this.ioFingerprint.input[0]);

        if (iType && iType.payment) {
            try {
                const input = this.btcTransact.ins[0];
                const a = {
                    network: this.btcNetwork
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

    _getTargetDeviceTxOutputInfo() {
        const oType = Object.values(outputType).some(type => type.token === this.ioFingerprint.output[0]);

        if (oType && oType.payment) {
            try {
                const payInfo = bitcoinLib.payments[oType.payment]({
                    output: this.btcTransact.outs[0].script,
                    network: this.btcNetwork
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
     * Retrieve the off-chain message envelope that holds the Catenis off-chain message
     *  associated with this Catenis message transaction from IPFS
     * @returns {Promise<void>}
     * @private
     */
    async _retrieveOffChainMsgEnvelope() {
        // Retrieve Catenis off-chain messages batch document
        let batchDocData;

        try {
            batchDocData = await this.ipfsReader.getData(this.txData.batchDocCid);
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

        // Make sure that supplied Catenis off-chain message envelope is recorded
        //  in that batch document
        if (!this.batchDoc.isMessageDataInBatch(this.options.offChainMsgEnvCid)) {
            throw new Error('Invalid Catenis off-chain message envelope IPFS CID');
        }

        // Retrieve off-chain message envelope
        let offChainMsgEnvData;

        try {
            offChainMsgEnvData = await this.ipfsReader.getData(this.options.offChainMsgEnvCid);
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

        this.messageRef = this.offChainMsgEnvelope.msgRef;
    }

    /**
     * Retrieve the message externally stored on IPFS
     * @returns {Promise<void>}
     * @private
     */
    async _retrieveExternalMessage() {
        // Retrieve external message
        try {
            this.message = await this.ipfsReader.getData(this.messageRef);
        }
        catch (err) {
            throw new Error('Error retrieving external message: ' + err.message);
        }
    }

    /**
     * Returns the message conveyed by this Catenis message transaction
     * @param {Function} [callback] Callback function
     * @returns {Promise<Buffer>,undefined} If no callback is passed, a promise is returned
     */
    getMessage(callback) {
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
        if (this.type === msgTxType.settleOffChainMessages) {
            this.offChainPromise
            .then(() => this._retrieveExternalMessage())
            .then(() => callback(null, this.message))
            .catch(err => callback(err));
        }
        else if (!this.msgOptions.embedding) {
            this._retrieveExternalMessage()
            .then(() => callback(null, this.message))
            .catch(err => callback(err));
        }
        else {
            process.nextTick(() => callback(null, this.message));
        }

        return result;
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

module.exports = MessageTransaction;
