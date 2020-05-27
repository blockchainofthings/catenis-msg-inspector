/**
 * Created by claudio on 2020-04-23
 */

const Util = require('./Util');

const prefix = 'CTN';
const version = 0x00;
const versionMask = 0xe0;
const funcByteMask = 0xff & ~versionMask;
const funcByte = {
    sendMessage: 0x01,
    logMessage: 0x02,
    settleOffChainMessages: 0x03
};
const optsMask = {
    embedding: 0x01,
    encryption: 0x02
};
const validOptsMask = Object.values(optsMask).reduce((m, b) => m | b, 0x00);
const storageProvider = {
    ipfs: {
        byteCode: 0x01,
        name: "ipfs",
        description: "IPFS - Interplanetary Filesystem",
        version: 1,
        validator: Util.validateCid
    },
    ipfs2: {
        byteCode: 0x02,
        name: "ipfs",
        description: "IPFS - Interplanetary Filesystem",
        version: 2,
        validator: Util.validateCid
    }
};
const offChainStorageProvider = storageProvider.ipfs2;

class TransactionData {
    /**
     * Class constructor
     * @param {Buffer} data Data embedded in transaction's null data output
     */
    constructor(data) {
        if (!Buffer.isBuffer(data)) {
            throw TypeError('Data is not a buffer');
        }

        this.buffer = data;
    }

    /**
     * Parse transaction data
     */
    parse() {
        // Check minimum data length (prefix + ver/func byte + ops byte + 1 byte payload)
        if (this.buffer.length < prefix.length + 2 + 1) {
            throw new Error('Data too short');
        }

        // Validate prefix
        if (this.buffer.toString('utf8', 0, prefix.length) !== prefix) {
            throw new Error('Invalid prefix');
        }

        let offset = prefix.length;
        
        // Validate version and function byte
        const verFunc = this.buffer.readUInt8(offset++);

        this.version = verFunc & versionMask;

        if (this.version !== version) {
            throw new Error('Invalid version');
        }

        this.funcByte = verFunc & funcByteMask;

        if (!Object.values(funcByte).some(byte => byte === this.funcByte)) {
            throw new Error('Invalid function byte');
        }

        // Validate options
        const opts = this.buffer.readUInt8(offset++);

        if ((opts | validOptsMask) !== validOptsMask) {
            throw new Error('Invalid options');
        }

        if (this.funcByte !== funcByte.settleOffChainMessages) {
            this.options = {};

            Object.keys(optsMask).forEach(opt => this.options[opt] = !!(optsMask[opt] & opts));

            if (!this.options.embedding) {
                // Validate storage provider
                const spCode = this.buffer.readUInt8(offset++);

                this.storageProvider = Object.values(storageProvider).find(sp => sp.byteCode === spCode);

                if (!this.storageProvider) {
                    throw new Error('Invalid storage provider code');
                }

                this.messageRef = this.storageProvider.validator(this.buffer.slice(offset));

                if (!this.messageRef) {
                    throw new Error('Invalid message reference');
                }
            }
            else {
                this.message = this.buffer.slice(offset);
            }
        }
        else {
            // Validate storage provider
            const spCode = this.buffer.readUInt8(offset++);

            if (spCode !== offChainStorageProvider.byteCode) {
                throw new Error('Invalid storage provider code');
            }

            this.storageProvider = offChainStorageProvider;

            this.batchDocCid = this.storageProvider.validator(this.buffer.slice(offset));

            if (!this.batchDocCid) {
                throw new Error('Invalid off-chain batch document reference');
            }
        }
    }
}

module.exports = TransactionData;
