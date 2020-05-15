/**
 * Created by claudio on 2020-05-14
 */

(function () {
    const testSuite = function suite(ctnMsgInspector, expect) {
        const oBuffer = typeof Buffer !== 'undefined' ? Buffer : ctnMsgInspector.Buffer;

        describe('TransactionData module', function () {
            describe('Instantiate TransactionData', function () {
                it('should throw if an invalid \'data\' parameter is passed', function () {
                    expect(() => {
                        new ctnMsgInspector.TransactionData(1);
                    }).to.throw(TypeError, 'Data is not a buffer');
                });

                it('should successfully be instantiated', function () {
                    expect(() => {
                        new ctnMsgInspector.TransactionData(oBuffer.from('This is only a test'));
                    }).not.to.throw();
                });
            });

            describe('Parse transaction data', function () {
                it('should throw if data is too short', function () {
                    const data = oBuffer.from('00', 'hex');
                    const txData = new ctnMsgInspector.TransactionData(data);

                    expect(() => {
                        txData.parse();
                    }).to.throw(Error, 'Data too short');
                });

                it('should throw if data has an invalid prefix', function () {
                    const data = oBuffer.from('000102030405', 'hex');
                    const txData = new ctnMsgInspector.TransactionData(data);

                    expect(() => {
                        txData.parse();
                    }).to.throw(Error, 'Invalid prefix');
                });

                it('should throw if data specifies an invalid version', function () {
                    const data = oBuffer.from('43544ee00405', 'hex');
                    const txData = new ctnMsgInspector.TransactionData(data);

                    expect(() => {
                        txData.parse();
                    }).to.throw(Error, 'Invalid version');
                });

                it('should throw if data contains an invalid function byte', function () {
                    const data = oBuffer.from('43544e1f0405', 'hex');
                    const txData = new ctnMsgInspector.TransactionData(data);

                    expect(() => {
                        txData.parse();
                    }).to.throw(Error, 'Invalid function byte');
                });

                it('should throw if data has invalid options', function () {
                    const data = oBuffer.from('43544e018005', 'hex');
                    const txData = new ctnMsgInspector.TransactionData(data);

                    expect(() => {
                        txData.parse();
                    }).to.throw(Error, 'Invalid options');
                });

                it('should throw if data is for a send standard, embedded message tx with an invalid storage provider code', function () {
                    const data = oBuffer.from('43544e0100ff', 'hex');
                    const txData = new ctnMsgInspector.TransactionData(data);

                    expect(() => {
                        txData.parse();
                    }).to.throw(Error, 'Invalid storage provider code');
                });

                it('should throw if data is for a send standard, embedded message tx with an invalid message reference', function () {
                    const data = oBuffer.from('43544e01000200', 'hex');
                    const txData = new ctnMsgInspector.TransactionData(data);

                    expect(() => {
                        txData.parse();
                    }).to.throw(Error, 'Invalid message reference');
                });

                it('should throw if data is for a settle off-chain messages tx with an invalid storage provider code', function () {
                    const data = oBuffer.from('43544e0300ff', 'hex');
                    const txData = new ctnMsgInspector.TransactionData(data);

                    expect(() => {
                        txData.parse();
                    }).to.throw(Error, 'Invalid storage provider code');
                });

                it('should throw if data is for a settle off-chain messages tx with an invalid off-chain batch doc reference', function () {
                    const data = oBuffer.from('43544e03000200', 'hex');
                    const txData = new ctnMsgInspector.TransactionData(data);

                    expect(() => {
                        txData.parse();
                    }).to.throw(Error, 'Invalid off-chain batch document reference');
                });

                it('should successfully parse data for send standard, embedded, encrypted message tx', function () {
                    const data = oBuffer.from('43544e0103bb2f47e140b731e970a16dfd8f9cae285c0067a256cd0693f07e3e44a9d28f6bbc822fa247fc541ee676d391de8b50875322e2bbf0aa0ef12a9fbc5e9c164680', 'hex');
                    const txData = new ctnMsgInspector.TransactionData(data);

                    expect(() => {
                        txData.parse();
                    }).not.to.throw();
                    expect(txData).to.be.an('object').that.deep.includes({
                        version: 0x00,
                        funcByte: 0x01,
                        options: {
                            embedding: true,
                            encryption: true
                        }
                    });
                    expect(txData.message).to.exist.and.be.an.instanceof(oBuffer);
                });

                it('should successfully parse data for send standard, embedded, plain message tx', function () {
                    const data = oBuffer.from('43544e01014d6573736167652023333a207374616e646172642c2073656e642c206e6f2d636f6e662c20706c61696e2c20656d626564646564', 'hex');
                    const txData = new ctnMsgInspector.TransactionData(data);

                    expect(() => {
                        txData.parse();
                    }).not.to.throw();
                    expect(txData).to.be.an('object').that.deep.includes({
                        version: 0x00,
                        funcByte: 0x01,
                        options: {
                            embedding: true,
                            encryption: false
                        },
                        message: oBuffer.from('Message #3: standard, send, no-conf, plain, embedded')
                    });
                });

                it('should successfully parse data for send standard, external, encrypted message tx', function () {
                    const data = oBuffer.from('43544e01020212208474130ccc0590b4ead7450266db60e9aedc6163cfbe257bed3dc66d794ae76b', 'hex');
                    const txData = new ctnMsgInspector.TransactionData(data);

                    expect(() => {
                        txData.parse();
                    }).not.to.throw();
                    expect(txData).to.be.an('object').that.deep.includes({
                        version: 0x00,
                        funcByte: 0x01,
                        options: {
                            embedding: false,
                            encryption: true
                        }
                    });
                    expect(txData.storageProvider).to.exist.and.be.an('object').that.includes({
                        byteCode: 0x02,
                        name: "ipfs",
                        description: "IPFS - Interplanetary Filesystem",
                        version: 2
                    });
                    expect(txData.message).to.not.exist;
                    expect(txData.messageRef).to.exist.and.be.an.instanceof(ctnMsgInspector.CID);
                });

                it('should successfully parse data for send standard, external, plain message tx', function () {
                    const data = oBuffer.from('43544e0100021220d3f568a28db541df5afeb56b17f56763c625b7114dfbc8c75d159cecbb653b41', 'hex');
                    const txData = new ctnMsgInspector.TransactionData(data);

                    expect(() => {
                        txData.parse();
                    }).not.to.throw();
                    expect(txData).to.be.an('object').that.deep.includes({
                        version: 0x00,
                        funcByte: 0x01,
                        options: {
                            embedding: false,
                            encryption: false
                        },
                    });
                    expect(txData.storageProvider).to.exist.and.be.an('object').that.includes({
                        byteCode: 0x02,
                        name: "ipfs",
                        description: "IPFS - Interplanetary Filesystem",
                        version: 2
                    });
                    expect(txData.message).to.not.exist;
                    expect(txData.messageRef).to.exist.and.be.an.instanceof(ctnMsgInspector.CID);
                });

                it('should successfully parse data for log standard, embedded, encrypted message tx', function () {
                    const data = oBuffer.from('43544e02037b8361b2f821ed2875f78158196c4c7ab82f6d662b3258012bdcc8753a4972e4cd634ab75f5f289c1d68ab4fc78bd05a', 'hex');
                    const txData = new ctnMsgInspector.TransactionData(data);

                    expect(() => {
                        txData.parse();
                    }).not.to.throw();
                    expect(txData).to.be.an('object').that.deep.includes({
                        version: 0x00,
                        funcByte: 0x02,
                        options: {
                            embedding: true,
                            encryption: true
                        }
                    });
                    expect(txData.message).to.exist.and.be.an.instanceof(oBuffer);
                });

                it('should successfully parse data for log standard, embedded, plain message tx', function () {
                    const data = oBuffer.from('43544e02014d657373616765202331303a207374616e646172642c206c6f672c20706c61696e2c20656d626564646564', 'hex');
                    const txData = new ctnMsgInspector.TransactionData(data);

                    expect(() => {
                        txData.parse();
                    }).not.to.throw();
                    expect(txData).to.be.an('object').that.deep.includes({
                        version: 0x00,
                        funcByte: 0x02,
                        options: {
                            embedding: true,
                            encryption: false
                        },
                        message: oBuffer.from('Message #10: standard, log, plain, embedded')
                    });
                });

                it('should successfully parse data for log standard, external, encrypted message tx', function () {
                    const data = oBuffer.from('43544e020202122062512d99efbe10f16b1267d338816b8144fced2f8b2e5757fb7275f909589e2b', 'hex');
                    const txData = new ctnMsgInspector.TransactionData(data);

                    expect(() => {
                        txData.parse();
                    }).not.to.throw();
                    expect(txData).to.be.an('object').that.deep.includes({
                        version: 0x00,
                        funcByte: 0x02,
                        options: {
                            embedding: false,
                            encryption: true
                        }
                    });
                    expect(txData.storageProvider).to.exist.and.be.an('object').that.includes({
                        byteCode: 0x02,
                        name: "ipfs",
                        description: "IPFS - Interplanetary Filesystem",
                        version: 2
                    });
                    expect(txData.message).to.not.exist;
                    expect(txData.messageRef).to.exist.and.be.an.instanceof(ctnMsgInspector.CID);
                });

                it('should successfully parse data for log standard, external, plain message tx', function () {
                    const data = oBuffer.from('43544e020002122047fb19eef4b2124294bc1d05b06e84acf3f166694aadbaa629c6e5e2d372d7c1', 'hex');
                    const txData = new ctnMsgInspector.TransactionData(data);

                    expect(() => {
                        txData.parse();
                    }).not.to.throw();
                    expect(txData).to.be.an('object').that.deep.includes({
                        version: 0x00,
                        funcByte: 0x02,
                        options: {
                            embedding: false,
                            encryption: false
                        }
                    });
                    expect(txData.storageProvider).to.exist.and.be.an('object').that.includes({
                        byteCode: 0x02,
                        name: "ipfs",
                        description: "IPFS - Interplanetary Filesystem",
                        version: 2
                    });
                    expect(txData.message).to.not.exist;
                    expect(txData.messageRef).to.exist.and.be.an.instanceof(ctnMsgInspector.CID);
                });

                it('should successfully parse data for settle off-chain messages tx', function () {
                    const data = oBuffer.from('43544e03000212201496f46b7d079dd7c0a23a7a6769c837039b1d2d7f1c2ec02daf0faa87d6f5fc', 'hex');
                    const txData = new ctnMsgInspector.TransactionData(data);

                    expect(() => {
                        txData.parse();
                    }).not.to.throw();
                    expect(txData).to.be.an('object').that.deep.includes({
                        version: 0x00,
                        funcByte: 0x03
                    });
                    expect(txData.options).not.to.exist;
                    expect(txData.storageProvider).to.exist.and.be.an('object').that.includes({
                        byteCode: 0x02,
                        name: "ipfs",
                        description: "IPFS - Interplanetary Filesystem",
                        version: 2
                    });
                    expect(txData.message).to.not.exist;
                    expect(txData.messageRef).to.not.exist;
                    expect(txData.batchDocCid).to.exist.and.be.an.instanceof(ctnMsgInspector.CID);
                });
            });
        });
    }

    if (typeof module === 'object' && module.exports) {
        module.exports = testSuite;
    }
    else {
        this.testSuite = testSuite;
    }
})();
