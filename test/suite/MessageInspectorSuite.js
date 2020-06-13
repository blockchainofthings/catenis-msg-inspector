/**
 * Created by claudio on 2020-05-22
 */

(function () {
    const testSuite = function suite(ctnMsgInspector, expect) {
        const oBuffer = typeof Buffer !== 'undefined' ? Buffer : ctnMsgInspector.Buffer;

        describe('MessageInspector module', function () {
            describe('Instantiate MessageInspector', function () {
                const defaultNetwork = 'main';

                it('should yield an object with standard options if no options are passed', function () {
                    const msgInspector = new ctnMsgInspector.MessageInspector();

                    expect(msgInspector._options).to.deep.include({
                        blockExplorer: {
                            reqOptions: {}
                        },
                        ipfsGateway: {
                            reqOptions: {}
                        },
                        network: defaultNetwork,
                        reqOptions: {}
                    });
                });

                it('should yield an object with options containing standard missing fields', function () {
                    const msgInspector = new ctnMsgInspector.MessageInspector({});

                    expect(msgInspector._options).to.deep.include({
                        blockExplorer: {
                            reqOptions: {}
                        },
                        ipfsGateway: {
                            reqOptions: {}
                        },
                        network: defaultNetwork,
                        reqOptions: {}
                    });
                });

                it('should yield an object with the same options as the ones that are passed', function () {
                    const options = {
                        network: 'testnet',
                        reqOptions: {
                            timeout: 150
                        },
                        blockExplorer: {
                            reqOptions: {
                                timeout: 100
                            }
                        },
                        ipfsGateway: {
                            reqOptions: {
                                timeout: 300
                            }
                        }
                    };
                    const msgInspector = new ctnMsgInspector.MessageInspector(options);

                    expect(msgInspector._options).to.deep.include(options);
                });
            });

            describe('Fail to inspect message', function () {
                this.timeout(5000);

                const msgInspector = new ctnMsgInspector.MessageInspector({
                    network: 'testnet'
                });

                it('should return error if no parameter is passed', function (done) {
                    msgInspector.inspectMessage(function (err, res) {
                        let error;

                        try {
                            expect(err).to.exist.and.be.an.instanceof(TypeError).and.have.property('message', 'Missing at least one of the parameters: \'txid\' or \'offChainCid\'');
                        }
                        catch(err) {
                            error = err;
                        }

                        done(error);
                    });
                });

                it('should return a rejected promise if no parameter is passed', function (done) {
                    let error;

                    msgInspector.inspectMessage()
                    .then(function (res) {
                        error = new Error('Promise should have been rejected');
                    }, function (err) {
                        expect(err).to.exist.and.be.an.instanceof(TypeError).and.have.property('message', 'Missing at least one of the parameters: \'txid\' or \'offChainCid\'');
                    })
                    .catch(function (err) {
                        error = err;
                    })
                    .finally(function () {
                        done(error);
                    });
                });

                it('should return error if an invalid block explorer URL is passed', function (done) {
                    const msgInspector = new ctnMsgInspector.MessageInspector({
                        network: 'testnet',
                        blockExplorer: {
                            api: 1
                        }
                    });

                    msgInspector.inspectMessage('7b197d3c706b40f0cd6ce5c36309b3429d0bc7ce1d57cb2a9950d58694c7de5f', function (err, res) {
                        let error;

                        try {
                            expect(err).to.exist.and.be.an.instanceof(Error).and.have.property('message').that.is.a('string').that.include('Error setting up blockchain transaction reader: ');
                        }
                        catch(err) {
                            error = err;
                        }

                        done(error);
                    });
                });

                it('should return error if an invalid IPFS gateway URL is passed', function (done) {
                    const msgInspector = new ctnMsgInspector.MessageInspector({
                        network: 'testnet',
                        ipfsGateway: {
                            url: 1
                        }
                    });

                    msgInspector.inspectMessage(null, 'QmR8SzCMcu4LYpw16Xo6sVYwdMfcomkp5sAcYdEhQJ69oK', function (err, res) {
                        let error;

                        try {
                            expect(err).to.exist.and.be.an.instanceof(Error).and.have.property('message').that.is.a('string').that.include('Error setting up IPFS reader: ');
                        }
                        catch(err) {
                            error = err;
                        }

                        done(error);
                    });
                });

                it('should return error if an invalid Catenis message transaction is passed', function (done) {
                    msgInspector.inspectMessage('ef4125bb3ff5cee75442f0daa866babe926ac159f184d0d7158cd37b22a05ef2', function (err, res) {
                        let error;

                        try {
                            expect(err).to.exist.and.be.an.instanceof(Error).and.have.property('message', 'Invalid Catenis message transaction');
                        }
                        catch(err) {
                            error = err;
                        }

                        done(error);
                    });
                });

                it('should return error if an invalid tx ID is passed', function (done) {
                    msgInspector.inspectMessage('x', function (err, res) {
                        let error;

                        try {
                            expect(err).to.exist.and.be.an.instanceof(Error).and.have.property('message').that.is.a('string').that.include('Error retrieving blockchain transaction: ');
                        }
                        catch(err) {
                            error = err;
                        }

                        done(error);
                    });
                });

                it('should return error when processing a fake Catenis transaction (nulldata too short)', function (done) {
                    const msgInspector = new ctnMsgInspector.MessageInspector({
                        network: 'testnet'
                    });

                    // Simulate retrieval of a "fake" Catenis message transaction (a transaction that matches
                    //  a Catenis message tx IO fingerprint but that is not a Catenis message transaction)
                    msgInspector._retrieveCatenisTransaction = function () {
                        msgInspector.hexTx = '02000000000102259b7c5d57bfd457167954c297fb877dc548abe186855a693a7e384c32e061738d00000000fffffffffa60ff096d81332cc5d84c55a1f870520e921fdbf35e15438e7bdb6de14e6d5b030000006a473044022065398adff7834cd7cce468bcd0ab464a6044f05809903f833438e76b845af382022052c3eb61e78e422ff221a726aee630f9096cccc1f21a371c1cd022af2e70e28f012102f8d3151f9236062605fb888e0f15d32ee0ffe12db0eb621c65923fc3ca173dccffffffff0426010000000000001600140178da7777a53f82fe5424e326f1d270cfe8da2d0000000000000000036a010026010000000000001600144e3081a2e240b082f844c30d5dbe0b7fe3e5455b2eb40000000000001600147757e73446db5b738f4eea527dec90401d45efaa0247304402202fc7fd4c1a40f7525f1cfa12c84833838fd81bf7d767d37c0843939201d2b2560220789cf82dc882d90c7710d2530035ab6114fd1eda12c63a2908ff6711fb5181fa0121026e125a11a4245e69507a6b75a8ae829d1f1cc20a5779560d0ced35db948e54790000000000';
                        msgInspector.btcTransact = ctnMsgInspector.bitcoinLib.Transaction.fromHex(msgInspector.hexTx);
                    };

                    msgInspector.inspectMessage('fake_txid', function (err, res) {
                        let error;

                        try {
                            expect(err).to.exist.and.be.an.instanceof(Error).and.have.property('message').that.is.a('string').that.include('Invalid Catenis message transaction: ');
                        }
                        catch (err) {
                            error = err;
                        }

                        done(error);
                    });
                });

                it('should return error when processing a fake Catenis transaction (inconsistent function byte)', function (done) {
                    const msgInspector = new ctnMsgInspector.MessageInspector({
                        network: 'testnet'
                    });

                    // Simulate retrieval of a "fake" Catenis message transaction (a transaction that matches
                    //  a Catenis message tx IO fingerprint but that is not a Catenis message transaction)
                    msgInspector._retrieveCatenisTransaction = function () {
                        msgInspector.hexTx = '02000000000102259b7c5d57bfd457167954c297fb877dc548abe186855a693a7e384c32e061738d00000000fffffffffa60ff096d81332cc5d84c55a1f870520e921fdbf35e15438e7bdb6de14e6d5b030000006a473044022065398adff7834cd7cce468bcd0ab464a6044f05809903f833438e76b845af382022052c3eb61e78e422ff221a726aee630f9096cccc1f21a371c1cd022af2e70e28f012102f8d3151f9236062605fb888e0f15d32ee0ffe12db0eb621c65923fc3ca173dccffffffff0426010000000000001600140178da7777a53f82fe5424e326f1d270cfe8da2d0000000000000000376a3543544e02037b8361b2f821ed2875f78158196c4c7ab82f6d662b3258012bdcc8753a4972e4cd634ab75f5f289c1d68ab4fc78bd05a26010000000000001600144e3081a2e240b082f844c30d5dbe0b7fe3e5455b2eb40000000000001600147757e73446db5b738f4eea527dec90401d45efaa0247304402202fc7fd4c1a40f7525f1cfa12c84833838fd81bf7d767d37c0843939201d2b2560220789cf82dc882d90c7710d2530035ab6114fd1eda12c63a2908ff6711fb5181fa0121026e125a11a4245e69507a6b75a8ae829d1f1cc20a5779560d0ced35db948e54790000000000';
                        msgInspector.btcTransact = ctnMsgInspector.bitcoinLib.Transaction.fromHex(msgInspector.hexTx);
                    };

                    msgInspector.inspectMessage('fake_txid', function (err, res) {
                        let error;

                        try {
                            expect(err).to.exist.and.be.an.instanceof(Error).and.have.property('message', 'Invalid Catenis message transaction: inconsistent function byte');
                        }
                        catch (err) {
                            error = err;
                        }

                        done(error);
                    });
                });

                it('should return error when processing a fake Catenis transaction (non-existent off-chain messages batch document)', function (done) {
                    const msgInspector = new ctnMsgInspector.MessageInspector({
                        network: 'testnet',
                        ipfsGateway: {
                            reqOptions: {
                                timeout: 200
                            }
                        }
                    });

                    // Simulate retrieval of a "fake" Catenis message transaction (a transaction that matches
                    //  a Catenis message tx IO fingerprint but that is not a Catenis message transaction)
                    msgInspector._retrieveCatenisTransaction = function () {
                        msgInspector.hexTx = '02000000000106da2bf2fa4ccb802f0d1e44ea72e66f705de03f0bec3243c52eafc0e181b339de0e0000006a47304402205e234e0295939a7f6c715746789a06d366544a25ee8f04b6b3213970935aadca022067d493f30020c6f7aba29872099852902f7e41298d27dd4b93eb1345d9af3adf012103e483f0401bd8655647e221c0d2fb6392e127b92756790683c8f47eae437a5aeeffffffffda2bf2fa4ccb802f0d1e44ea72e66f705de03f0bec3243c52eafc0e181b339de0d0000006a47304402207ee9af6196e24c94bd3956b78b5e3e451ccd46661d27e7690a8d953aff29c5700220275a59444448b95e144520ea825ba5062e21523c1e130fc13fbd3202c0f6eada012103b58e93afe3cc13302518b50b94510c3d58de7be5d8c7c41d52116f08f6736da3ffffffffda2bf2fa4ccb802f0d1e44ea72e66f705de03f0bec3243c52eafc0e181b339de0c0000006a47304402204b3f1ca96a5a64819ce401ecc0f8aba29b7aa579e8173e1110b1a8b0f5f95fa4022066e32e5c02a56ad404680cabc988621d6242b3909d7c65fc55d5aed7a3a5eccb0121034d160e9d7d572853357c8e7ffa00c652cd005da07de2d55a6933e42742d9376cffffffffda2bf2fa4ccb802f0d1e44ea72e66f705de03f0bec3243c52eafc0e181b339de0b0000006a4730440220017f3f809ecd4463524905bf97b6639f43b7cfad354d717508ae3c7530e2bb46022016d3d36a914846563a348aa5bf2f6f67d6d5fd5a929662333898489e2370e288012103599a439012abf893d7fa59eab302e3e8b4e5c2c64702707fd05498850a4ee6a1ffffffffda2bf2fa4ccb802f0d1e44ea72e66f705de03f0bec3243c52eafc0e181b339de0a0000006a47304402201d5d89d75a63070aed18e8bf289eca22838295e607018056334f47f03194b696022017721389068e2a1e56e825cce021cb2d53699f4c4869d9fbffd77852c8c1de670121036b3837736f488bcd6a0424be1c90ddfccb4c2883bbe9ea15e149f35cb4b873acffffffff64b81f02f2576dc90e6bbcb56526817bf2a36bc79314390b2f5dc80660fef2e10000000000ffffffff0200000000000000002a6a2843544e03000212208443510bc12b433245b9c1ebff82ea7463440b0f206867f7c478fb526fba3aff3a970100000000001600147c363632864eea566a823db54b12e644330e18dc000000000002473044022043e41547a6778d8531cbfd3674635368e5638f9e1b3904358b290dd5b0e8ddac0220205b985e4a1554d5d752796a76e138f59756b7ca86ee292f3710c149e8bda0bf012102571539026f4b9ce6fe3efab0d1ee3f32202a2918e84630e42a39be74bef4eaf700000000';
                        msgInspector.btcTransact = ctnMsgInspector.bitcoinLib.Transaction.fromHex(msgInspector.hexTx);
                    };

                    msgInspector.inspectMessage('fake_txid', function (err, res) {
                        let error;

                        try {
                            expect(err).to.exist.and.be.an.instanceof(Error).and.have.property('message').that.is.a('string').that.include('Error retrieving Catenis off-chain messages batch document: ');
                        }
                        catch (err) {
                            error = err;
                        }

                        done(error);
                    });
                });

                it('should return error when processing a fake Catenis transaction (invalid off-chain messages batch document)', function (done) {
                    const msgInspector = new ctnMsgInspector.MessageInspector({
                        network: 'testnet'
                    });

                    // Simulate retrieval of a "fake" Catenis message transaction (a transaction that matches
                    //  a Catenis message tx IO fingerprint but that is not a Catenis message transaction)
                    msgInspector._retrieveCatenisTransaction = function () {
                        msgInspector.hexTx = '02000000000106da2bf2fa4ccb802f0d1e44ea72e66f705de03f0bec3243c52eafc0e181b339de0e0000006a47304402205e234e0295939a7f6c715746789a06d366544a25ee8f04b6b3213970935aadca022067d493f30020c6f7aba29872099852902f7e41298d27dd4b93eb1345d9af3adf012103e483f0401bd8655647e221c0d2fb6392e127b92756790683c8f47eae437a5aeeffffffffda2bf2fa4ccb802f0d1e44ea72e66f705de03f0bec3243c52eafc0e181b339de0d0000006a47304402207ee9af6196e24c94bd3956b78b5e3e451ccd46661d27e7690a8d953aff29c5700220275a59444448b95e144520ea825ba5062e21523c1e130fc13fbd3202c0f6eada012103b58e93afe3cc13302518b50b94510c3d58de7be5d8c7c41d52116f08f6736da3ffffffffda2bf2fa4ccb802f0d1e44ea72e66f705de03f0bec3243c52eafc0e181b339de0c0000006a47304402204b3f1ca96a5a64819ce401ecc0f8aba29b7aa579e8173e1110b1a8b0f5f95fa4022066e32e5c02a56ad404680cabc988621d6242b3909d7c65fc55d5aed7a3a5eccb0121034d160e9d7d572853357c8e7ffa00c652cd005da07de2d55a6933e42742d9376cffffffffda2bf2fa4ccb802f0d1e44ea72e66f705de03f0bec3243c52eafc0e181b339de0b0000006a4730440220017f3f809ecd4463524905bf97b6639f43b7cfad354d717508ae3c7530e2bb46022016d3d36a914846563a348aa5bf2f6f67d6d5fd5a929662333898489e2370e288012103599a439012abf893d7fa59eab302e3e8b4e5c2c64702707fd05498850a4ee6a1ffffffffda2bf2fa4ccb802f0d1e44ea72e66f705de03f0bec3243c52eafc0e181b339de0a0000006a47304402201d5d89d75a63070aed18e8bf289eca22838295e607018056334f47f03194b696022017721389068e2a1e56e825cce021cb2d53699f4c4869d9fbffd77852c8c1de670121036b3837736f488bcd6a0424be1c90ddfccb4c2883bbe9ea15e149f35cb4b873acffffffff64b81f02f2576dc90e6bbcb56526817bf2a36bc79314390b2f5dc80660fef2e10000000000ffffffff0200000000000000002a6a2843544e03000212202972d617af65c7a054624cadd808e8d6dc82903b2663ba7e5d0098cfee1d66563a970100000000001600147c363632864eea566a823db54b12e644330e18dc000000000002473044022043e41547a6778d8531cbfd3674635368e5638f9e1b3904358b290dd5b0e8ddac0220205b985e4a1554d5d752796a76e138f59756b7ca86ee292f3710c149e8bda0bf012102571539026f4b9ce6fe3efab0d1ee3f32202a2918e84630e42a39be74bef4eaf700000000';
                        msgInspector.btcTransact = ctnMsgInspector.bitcoinLib.Transaction.fromHex(msgInspector.hexTx);
                    };

                    msgInspector.inspectMessage('fake_txid', function (err, res) {
                        let error;

                        try {
                            expect(err).to.exist.and.be.an.instanceof(Error).and.have.property('message').that.is.a('string').that.include('Error parsing Catenis off-chain messages batch document: ');
                        }
                        catch (err) {
                            error = err;
                        }

                        done(error);
                    });
                });

                it('should return error if an invalid off-chain CID is passed', function (done) {
                    msgInspector.inspectMessage(null, 'xxx', function (err, res) {
                        let error;

                        try {
                            expect(err).to.exist.and.be.an.instanceof(Error).and.have.property('message').that.is.a('string').that.include('Error retrieving Catenis off-chain message envelope: ');
                        }
                        catch (err) {
                            error = err;
                        }

                        done(error);
                    });
                });

                it('should return error if the off-chain CID passed in is for an invalid off-chain message envelope', function (done) {
                    msgInspector.inspectMessage(null, 'QmYDT2i4q6DDLFdQ8JrLJqTryyjGxcwvD6MfA3S3M87Px9', function (err, res) {
                        let error;

                        try {
                            expect(err).to.exist.and.be.an.instanceof(Error).and.have.property('message').that.is.a('string').that.include('Error parsing Catenis off-chain message envelope: ');
                        }
                        catch (err) {
                            error = err;
                        }

                        done(error);
                    });
                });

                it('should return error if the off-chain CID passed is inconsistent with the off-chain messages batch document', function (done) {
                    msgInspector.inspectMessage('20382af6a33b32c957e5ab4e7b2a4feafb307063700c077708ba47de835fc625', 'QmWMyXtnsvourw4YkqAe8LJCY8Sd9qoPPZwoiyeZTVZ4zE', function (err, res) {
                        let error;

                        try {
                            expect(err).to.exist.and.be.an.instanceof(Error).and.have.property('message', 'Inconsistent Catenis off-chain message envelope IPFS CID');
                        }
                        catch (err) {
                            error = err;
                        }

                        done(error);
                    });
                });

                it('should return error when processing a fake Catenis transaction (invalid external storage msg ref)', function (done) {
                    const msgInspector = new ctnMsgInspector.MessageInspector({
                        network: 'testnet',
                        ipfsGateway: {
                            reqOptions: {
                                timeout: 200
                            }
                        }
                    });

                    // Simulate retrieval of a "fake" Catenis message transaction (a transaction that matches
                    //  a Catenis message tx IO fingerprint but that is not a Catenis message transaction)
                    msgInspector._retrieveCatenisTransaction = function () {
                        msgInspector.hexTx = '02000000000102259b7c5d57bfd457167954c297fb877dc548abe186855a693a7e384c32e061738900000000fffffffffa60ff096d81332cc5d84c55a1f870520e921fdbf35e15438e7bdb6de14e6d5b090000006a473044022041e3668d7df3acd9a3a01d8e817f7ac96faaf8da171bb87b2c798f6b14204cb00220223f48fc7dd12dfac1a14f5a38ecda864b7f8ebd72189c225e48e8f149ecabeb0121033aeb41435bdf0922ca24fab3bcb1b574046146551d7e0ef691898edb9699bc32ffffffff042601000000000000160014f97b043f87402f1ccb2bc1e6fbc9acfce175dc5b00000000000000002a6a2843544e01020212208474130ccc0590b4ead7450266db60e9aedc6163cfbe257bed3dc66d794ae7ff26010000000000001600143e5587bd2dadff8bb1d98d74bcb50b98be95272cc6c10000000000001600148e37fe57e2f39f07ac41393abae1f5cc49a6425902473044022062b768d414cf54f4249f80181aa5363422aa148197810ba9d312a569461dadf90220259419464d05ddd3a5978f8f1bac4a9d956361e40d62cb7eac8b1ca6177c68890121038a7d7288509054683ad90ec4d52db85f46a7382b1ad13b3281845f1769eaccee0000000000';
                        msgInspector.btcTransact = ctnMsgInspector.bitcoinLib.Transaction.fromHex(msgInspector.hexTx);
                    };

                    msgInspector.inspectMessage('fake_txid', function (err, res) {
                        let error;

                        try {
                            expect(err).to.exist.and.be.an.instanceof(Error).and.have.property('message').that.is.a('string').that.include('Error retrieving external message: ');
                        }
                        catch (err) {
                            error = err;
                        }

                        done(error);
                    });
                });

                it('should return error when trying to retrieve an external message from an (simulated) unknown storage provider', function (done) {
                    const msgInspector = new ctnMsgInspector.MessageInspector({
                        network: 'testnet'
                    });

                    // Simulate an unknown external message storage provider
                    const origRetrieveExternalMessageMethod = msgInspector._retrieveExternalMessage;
                    msgInspector._retrieveExternalMessage = async function () {
                        // Replace the storage provider
                        msgInspector.storageProvider = {
                            name: 'unknown',
                            description: 'Unknown storage provider for testing purpose'
                        };

                        // Now call the original method
                        await origRetrieveExternalMessageMethod.call(msgInspector);
                    };

                    msgInspector.inspectMessage('d22842e05f71686b39b035eb84004b7d02c2eb4b652e38ad306e5c0949e361d2', function (err, res) {
                        let error;

                        try {
                            expect(err).to.exist.and.be.an.instanceof(Error).and.have.property('message', 'Unknown external message storage provider: [unknown] - Unknown storage provider for testing purpose');
                        }
                        catch (err) {
                            error = err;
                        }

                        done(error);
                    });
                });
            });

            describe('Inspect message', function () {
                this.timeout(10000);

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
                const ipfsStorageProvider = {
                    name: 'ipfs',
                    description: 'IPFS - Interplanetary Filesystem',
                    version: 2
                }

                const msgInspector = new ctnMsgInspector.MessageInspector({
                    network: 'testnet'
                });

                it('should successfully inspect message (standard, send, no-conf, encrypt, embedded)', function (done) {
                    msgInspector.inspectMessage('7b197d3c706b40f0cd6ce5c36309b3429d0bc7ce1d57cb2a9950d58694c7de5f', function (err, res) {
                        let error;

                        try {
                            expect(res).to.exist.and.be.a('object').that.equal(msgInspector).and.deep.include({
                                txid: '7b197d3c706b40f0cd6ce5c36309b3429d0bc7ce1d57cb2a9950d58694c7de5f',
                                hexTx: '02000000000102259b7c5d57bfd457167954c297fb877dc548abe186855a693a7e384c32e061738d00000000fffffffffa60ff096d81332cc5d84c55a1f870520e921fdbf35e15438e7bdb6de14e6d5b030000006a473044022065398adff7834cd7cce468bcd0ab464a6044f05809903f833438e76b845af382022052c3eb61e78e422ff221a726aee630f9096cccc1f21a371c1cd022af2e70e28f012102f8d3151f9236062605fb888e0f15d32ee0ffe12db0eb621c65923fc3ca173dccffffffff0426010000000000001600140178da7777a53f82fe5424e326f1d270cfe8da2d0000000000000000476a4543544e0103bb2f47e140b731e970a16dfd8f9cae285c0067a256cd0693f07e3e44a9d28f6bbc822fa247fc541ee676d391de8b50875322e2bbf0aa0ef12a9fbc5e9c16468026010000000000001600144e3081a2e240b082f844c30d5dbe0b7fe3e5455b2eb40000000000001600147757e73446db5b738f4eea527dec90401d45efaa0247304402202fc7fd4c1a40f7525f1cfa12c84833838fd81bf7d767d37c0843939201d2b2560220789cf82dc882d90c7710d2530035ab6114fd1eda12c63a2908ff6711fb5181fa0121026e125a11a4245e69507a6b75a8ae829d1f1cc20a5779560d0ced35db948e54790000000000',
                                txType: msgTxType.sendMessage,
                                msgType: msgType.sendStandardMessage,
                                msgOptions: {
                                    embedding: true,
                                    encryption: true,
                                    readConfirmation: false
                                },
                                originDevice: {
                                    address: 'tb1qsa8025zggzyjemr8guah2egkyahn97lj9pguuk',
                                    pubKeyHash: oBuffer.from('874ef5504840892cec67473b756516276f32fbf2', 'hex')
                                },
                                targetDevice: {
                                    address: 'tb1qq9ud5amh55lc9lj5yn3jduwjwr873k3dr3cltf',
                                    pubKeyHash: oBuffer.from('0178da7777a53f82fe5424e326f1d270cfe8da2d', 'hex')
                                },
                                message: oBuffer.from('bb2f47e140b731e970a16dfd8f9cae285c0067a256cd0693f07e3e44a9d28f6bbc822fa247fc541ee676d391de8b50875322e2bbf0aa0ef12a9fbc5e9c164680', 'hex')
                            })
                            .and.to.have.all.keys('btcTransact')
                            .and.to.not.have.any.keys('batchDocCid', 'offChainCid', 'batchDoc', 'offChainMsgEnvelope', 'storageProvider', 'messageRef');
                            expect(res).to.have.property('txData').that.is.an('object').that.has.deep.property('buffer', oBuffer.from('43544e0103bb2f47e140b731e970a16dfd8f9cae285c0067a256cd0693f07e3e44a9d28f6bbc822fa247fc541ee676d391de8b50875322e2bbf0aa0ef12a9fbc5e9c164680', 'hex'));
                        }
                        catch (err) {
                            error = err;
                        }

                        done(error);
                    });
                });

                it('should successfully inspect message (standard, send, readconf, encrypt, embedded)', function (done) {
                    msgInspector.inspectMessage('423d8d44acdc9fbfc03b02b8f8bf3cd3aef1a6b02a7f405bf2884935a1f429fd', function (err, res) {
                        let error;

                        try {
                            expect(res).to.exist.and.be.a('object').that.equal(msgInspector).and.deep.include({
                                txid: '423d8d44acdc9fbfc03b02b8f8bf3cd3aef1a6b02a7f405bf2884935a1f429fd',
                                hexTx: '02000000000102259b7c5d57bfd457167954c297fb877dc548abe186855a693a7e384c32e061738c00000000fffffffffa60ff096d81332cc5d84c55a1f870520e921fdbf35e15438e7bdb6de14e6d5b050000006a47304402201e01dd6c9bc0336b7dcbb18503597b35a01eedfd7e19d7fd61af0e4c182e4ff1022019516416e5e1cb5f385f8b110d2b28d2c8b472ced7727a6826e0c261633c5a0b01210327789f2f58336aacf48e620ff66d3be697345b80c3dbd3f13c257a63d6e8702bffffffff052601000000000000160014b1e6d07a21a5fc718dcc378afaaa78f1f19b173e2601000000000000160014a0f8815ada85aa427a8e5ebacfe5af983ffa1bf90000000000000000476a4543544e01036922f0d217cce56b202001093c0859f1725d498db77dbaabd62f545eafbc1d6c6392c17269781ce4aa68a8a0018052b7a68097a7b3e5e084dffade953a11454226010000000000001600142819523480f3a74fe328925f87c4239268b3507f80a4000000000000160014643ec0ed08858a1ac917a0fc06d5cac77586a0f9024730440220108e85eac6595a1ae09c6e64b68258fc007c9b82fd432dd35edfb62aa5f7b0e502204115358a4ee5cec62c5f0d24494494acef210675bcdb5a1efc4e21f8150cde5401210266ca35149a15ecacb73ff26417b336c24d55002988522315042d2be1a290cc280000000000',
                                txType: msgTxType.sendMessage,
                                msgType: msgType.sendStandardMessage,
                                msgOptions: {
                                    embedding: true,
                                    encryption: true,
                                    readConfirmation: true
                                },
                                originDevice: {
                                    address: 'tb1qsqvnpdyqw965u2f7k4szxqf8qwwkd6w28mczzr',
                                    pubKeyHash: oBuffer.from('801930b48071754e293eb560230127039d66e9ca', 'hex')
                                },
                                targetDevice: {
                                    address: 'tb1qk8ndq73p5h78rrwvx79042nc78cek9e7grjzfp',
                                    pubKeyHash: oBuffer.from('b1e6d07a21a5fc718dcc378afaaa78f1f19b173e', 'hex')
                                },
                                message: oBuffer.from('6922f0d217cce56b202001093c0859f1725d498db77dbaabd62f545eafbc1d6c6392c17269781ce4aa68a8a0018052b7a68097a7b3e5e084dffade953a114542', 'hex')
                            })
                            .and.to.have.all.keys('btcTransact')
                            .and.to.not.have.any.keys('batchDocCid', 'offChainCid', 'batchDoc', 'offChainMsgEnvelope', 'storageProvider', 'messageRef');
                            expect(res).to.have.property('txData').that.is.an('object').that.has.deep.property('buffer', oBuffer.from('43544e01036922f0d217cce56b202001093c0859f1725d498db77dbaabd62f545eafbc1d6c6392c17269781ce4aa68a8a0018052b7a68097a7b3e5e084dffade953a114542', 'hex'));
                        }
                        catch (err) {
                            error = err;
                        }

                        done(error);
                    });
                });

                it('should successfully inspect message (standard, log, plain, embedded)', function (done) {
                    msgInspector.inspectMessage('7c210b1e8d2b98057991995b2036186964c2b24499b5a47cd4afc7b269585243', function (err, res) {
                        let error;

                        try {
                            expect(res).to.exist.and.be.a('object').that.equal(msgInspector).and.deep.include({
                                txid: '7c210b1e8d2b98057991995b2036186964c2b24499b5a47cd4afc7b269585243',
                                hexTx: '02000000000102256959ddf9f1781a46c5ea2010fc9afcdc004abcd7d39b759493266109af9f300100000000fffffffffa60ff096d81332cc5d84c55a1f870520e921fdbf35e15438e7bdb6de14e6d5b0f0000006a473044022070bcb76c2b9f192cd46b08d44c9b32224aa87ebb2e53ba481bf5c4034ac054a602201839708383180cb819a9ee7586c6c791ad7a7100dc34f5217adac8ff2ba32cd801210329691b54d4a6b5a78d0852a626924c740febf339e88d58b322e75cbadade50acffffffff030000000000000000326a3043544e02014d657373616765202331303a207374616e646172642c206c6f672c20706c61696e2c20656d62656464656426010000000000001600143bb73987f46e39fabc54d66537b06e015b24d903b4cd000000000000160014ad08e76c8bf0a8cca331e0a14903aa7efd76d3400247304402203b27e9dd77b5cd5c5f49b07903686619a705bbc1286c790463e2d16fa8c72d3b0220790e70ae7d2e872fc1dfb80d0e2207e8ce69a949f878a69f40a75dcfbab35386012103af9613a6b70d77950afcf4738f4869a028fcc8602cca32e3d7be305e08a5a7b10000000000',
                                txType: msgTxType.logMessage,
                                msgType: msgType.logStandardMessage,
                                msgOptions: {
                                    embedding: true,
                                    encryption: false
                                },
                                originDevice: {
                                    address: 'tb1q2rrfmlp7mxlnrzjyzvgzynv7rljddjuw7lm5zu',
                                    pubKeyHash: oBuffer.from('50c69dfc3ed9bf318a441310224d9e1fe4d6cb8e', 'hex')
                                },
                                message: oBuffer.from('Message #10: standard, log, plain, embedded')
                            })
                            .and.to.have.all.keys('btcTransact')
                            .and.to.not.have.any.keys('batchDocCid', 'offChainCid', 'batchDoc', 'offChainMsgEnvelope', 'targetDevice', 'storageProvider', 'messageRef');
                            expect(res).to.have.property('txData').that.is.an('object').that.has.deep.property('buffer', oBuffer.from('43544e02014d657373616765202331303a207374616e646172642c206c6f672c20706c61696e2c20656d626564646564', 'hex'));
                        }
                        catch (err) {
                            error = err;
                        }

                        done(error);
                    });
                });

                it('should successfully inspect message (standard, log, plain, external)', function (done) {
                    msgInspector.inspectMessage('407b7d6b4fa0e13aa958061d25c514a38348b220f9266855542338e42819a785', function (err, res) {
                        let error;

                        try {
                            expect(res).to.exist.and.be.a('object').that.equal(msgInspector).and.deep.include({
                                txid: '407b7d6b4fa0e13aa958061d25c514a38348b220f9266855542338e42819a785',
                                hexTx: '02000000000102bcfff30c6ed1abbdf423a05c8b1ba0a80ccb3f07d87fb817c28fa547b3db34390100000000fffffffffa60ff096d81332cc5d84c55a1f870520e921fdbf35e15438e7bdb6de14e6d5b130000006a473044022010a12c9f618b7731ad6244e5b15172ee933a910938421c63c1f9d1960eedceed02204784ae06b5f42b737bc4364b99238ea48d75bc984e5916bc1bc3088deb88b841012103aa88661241b9b96fd700373f1b4ecfd69107a9172e20643c0eccb2f96cc3772effffffff0300000000000000002a6a2843544e020002122047fb19eef4b2124294bc1d05b06e84acf3f166694aadbaa629c6e5e2d372d7c1260100000000000016001411896b21cfeded3e3394c58857bff8ee32488b7874d100000000000016001485fc25be2ae6888f894c68b2ed8b962cf43d78850247304402202e1ebaeb85937ecc3e46217eeb1f1c9b311c0c6eec6c781841612a1edf319e570220183acab3d1ba1963ca97c5a8005d5b84dadd3f9cdaabe0443e1c19847699213a01210227db5fd1c7720adf694e19450073d9705a71781377a928f179e2484e6952654a0000000000',
                                txType: msgTxType.logMessage,
                                msgType: msgType.logStandardMessage,
                                msgOptions: {
                                    embedding: false,
                                    encryption: false
                                },
                                originDevice: {
                                    address: 'tb1qz3dun2qzjf5qdtdfh7wzfw3jfz3thr9kqznl98',
                                    pubKeyHash: oBuffer.from('145bc9a802926806ada9bf9c24ba3248a2bb8cb6', 'hex')
                                },
                                storageProvider: ipfsStorageProvider,
                                messageRef: new ctnMsgInspector.CID('QmTBdjNVaFFyRujh6q1RBRWbUWsNj7de4EfyMRK9KrfRU4'),
                                message: oBuffer.from('Message #12: standard, log, plain, external')
                            })
                            .and.to.have.all.keys('btcTransact')
                            .and.to.not.have.any.keys('batchDocCid', 'offChainCid', 'batchDoc', 'offChainMsgEnvelope', 'targetDevice');
                            expect(res).to.have.property('txData').that.is.an('object').that.has.deep.property('buffer', oBuffer.from('43544e020002122047fb19eef4b2124294bc1d05b06e84acf3f166694aadbaa629c6e5e2d372d7c1', 'hex'));
                        }
                        catch (err) {
                            error = err;
                        }

                        done(error);
                    });
                });

                it('should successfully inspect off-chain message without passing settlement tx (send, no-conf, encrypt)', function (done) {
                    msgInspector.inspectMessage(null, 'QmR8SzCMcu4LYpw16Xo6sVYwdMfcomkp5sAcYdEhQJ69oK', function (err, res) {
                        let error;

                        try {
                            expect(res).to.exist.and.be.a('object').that.equal(msgInspector).and.deep.include({
                                offChainCid: new ctnMsgInspector.CID('QmR8SzCMcu4LYpw16Xo6sVYwdMfcomkp5sAcYdEhQJ69oK'),
                                msgType: msgType.sendOffChainMessage,
                                msgOptions: {
                                    encryption: true,
                                    readConfirmation: false
                                },
                                originDevice: {
                                    pubKeyHash: oBuffer.from('dfb422c9e1768dc4bc817976eff22474d6befc9a', 'hex')
                                },
                                targetDevice: {
                                    pubKeyHash: oBuffer.from('36d957004ca947db9a20ca371b85d57bf4197517', 'hex')
                                },
                                storageProvider: ipfsStorageProvider,
                                messageRef: new ctnMsgInspector.CID('QmYDT2i4q6DDLFdQ8JrLJqTryyjGxcwvD6MfA3S3M87Px9'),
                                message: oBuffer.from('79378c4dcecd08b04910a0e24034ab15ea0068ab53b1db48c025860f27d73cad80e411c7638d4e6b82d6ff3427120b2b', 'hex')
                            })
                            .and.to.have.all.keys('offChainMsgEnvelope')
                            .and.to.not.have.any.keys('txid', 'hexTx', 'btcTransact', 'txType', 'txData', 'batchDocCid', 'batchDoc');
                        }
                        catch (err) {
                            error = err;
                        }

                        done(error);
                    });
                });

                it('should successfully inspect message (off-chain, send, no-conf, encrypt)', function (done) {
                    msgInspector.inspectMessage('20382af6a33b32c957e5ab4e7b2a4feafb307063700c077708ba47de835fc625', 'QmR8SzCMcu4LYpw16Xo6sVYwdMfcomkp5sAcYdEhQJ69oK', function (err, res) {
                        let error;

                        try {
                            expect(res).to.exist.and.be.a('object').that.equal(msgInspector).and.deep.include({
                                txid: '20382af6a33b32c957e5ab4e7b2a4feafb307063700c077708ba47de835fc625',
                                hexTx: '02000000000106da2bf2fa4ccb802f0d1e44ea72e66f705de03f0bec3243c52eafc0e181b339de0e0000006a47304402205e234e0295939a7f6c715746789a06d366544a25ee8f04b6b3213970935aadca022067d493f30020c6f7aba29872099852902f7e41298d27dd4b93eb1345d9af3adf012103e483f0401bd8655647e221c0d2fb6392e127b92756790683c8f47eae437a5aeeffffffffda2bf2fa4ccb802f0d1e44ea72e66f705de03f0bec3243c52eafc0e181b339de0d0000006a47304402207ee9af6196e24c94bd3956b78b5e3e451ccd46661d27e7690a8d953aff29c5700220275a59444448b95e144520ea825ba5062e21523c1e130fc13fbd3202c0f6eada012103b58e93afe3cc13302518b50b94510c3d58de7be5d8c7c41d52116f08f6736da3ffffffffda2bf2fa4ccb802f0d1e44ea72e66f705de03f0bec3243c52eafc0e181b339de0c0000006a47304402204b3f1ca96a5a64819ce401ecc0f8aba29b7aa579e8173e1110b1a8b0f5f95fa4022066e32e5c02a56ad404680cabc988621d6242b3909d7c65fc55d5aed7a3a5eccb0121034d160e9d7d572853357c8e7ffa00c652cd005da07de2d55a6933e42742d9376cffffffffda2bf2fa4ccb802f0d1e44ea72e66f705de03f0bec3243c52eafc0e181b339de0b0000006a4730440220017f3f809ecd4463524905bf97b6639f43b7cfad354d717508ae3c7530e2bb46022016d3d36a914846563a348aa5bf2f6f67d6d5fd5a929662333898489e2370e288012103599a439012abf893d7fa59eab302e3e8b4e5c2c64702707fd05498850a4ee6a1ffffffffda2bf2fa4ccb802f0d1e44ea72e66f705de03f0bec3243c52eafc0e181b339de0a0000006a47304402201d5d89d75a63070aed18e8bf289eca22838295e607018056334f47f03194b696022017721389068e2a1e56e825cce021cb2d53699f4c4869d9fbffd77852c8c1de670121036b3837736f488bcd6a0424be1c90ddfccb4c2883bbe9ea15e149f35cb4b873acffffffff64b81f02f2576dc90e6bbcb56526817bf2a36bc79314390b2f5dc80660fef2e10000000000ffffffff0200000000000000002a6a2843544e03000212208443510bc12b433245b9c1ebff82ea7463440b0f206867f7c478fb526fba3aa33a970100000000001600147c363632864eea566a823db54b12e644330e18dc000000000002473044022043e41547a6778d8531cbfd3674635368e5638f9e1b3904358b290dd5b0e8ddac0220205b985e4a1554d5d752796a76e138f59756b7ca86ee292f3710c149e8bda0bf012102571539026f4b9ce6fe3efab0d1ee3f32202a2918e84630e42a39be74bef4eaf700000000',
                                txType: msgTxType.settleOffChainMessages,
                                batchDocCid: new ctnMsgInspector.CID('QmXEx4UgyFxGcpVJ75Zeorvp44HuDaJ7VMoNU7DPPvprkS'),
                                offChainCid: new ctnMsgInspector.CID('QmR8SzCMcu4LYpw16Xo6sVYwdMfcomkp5sAcYdEhQJ69oK'),
                                msgType: msgType.sendOffChainMessage,
                                msgOptions: {
                                    encryption: true,
                                    readConfirmation: false
                                },
                                originDevice: {
                                    pubKeyHash: oBuffer.from('dfb422c9e1768dc4bc817976eff22474d6befc9a', 'hex')
                                },
                                targetDevice: {
                                    pubKeyHash: oBuffer.from('36d957004ca947db9a20ca371b85d57bf4197517', 'hex')
                                },
                                storageProvider: ipfsStorageProvider,
                                messageRef: new ctnMsgInspector.CID('QmYDT2i4q6DDLFdQ8JrLJqTryyjGxcwvD6MfA3S3M87Px9'),
                                message: oBuffer.from('79378c4dcecd08b04910a0e24034ab15ea0068ab53b1db48c025860f27d73cad80e411c7638d4e6b82d6ff3427120b2b', 'hex')
                            })
                            .and.to.have.all.keys('btcTransact', 'batchDoc', 'offChainMsgEnvelope');
                            expect(res).to.have.property('txData').that.is.an('object').that.has.deep.property('buffer', oBuffer.from('43544e03000212208443510bc12b433245b9c1ebff82ea7463440b0f206867f7c478fb526fba3aa3', 'hex'));
                        }
                        catch (err) {
                            error = err;
                        }

                        done(error);
                    });
                });

                it('should successfully inspect message (off-chain, send, readconf, encrypt)', function (done) {
                    msgInspector.inspectMessage('20382af6a33b32c957e5ab4e7b2a4feafb307063700c077708ba47de835fc625', 'QmYrsDziW2z6m2Qq5zbMcV3eBwTJWBwZrQR8pGYsAVd7i3', function (err, res) {
                        let error;

                        try {
                            expect(res).to.exist.and.be.a('object').that.equal(msgInspector).and.deep.include({
                                txid: '20382af6a33b32c957e5ab4e7b2a4feafb307063700c077708ba47de835fc625',
                                hexTx: '02000000000106da2bf2fa4ccb802f0d1e44ea72e66f705de03f0bec3243c52eafc0e181b339de0e0000006a47304402205e234e0295939a7f6c715746789a06d366544a25ee8f04b6b3213970935aadca022067d493f30020c6f7aba29872099852902f7e41298d27dd4b93eb1345d9af3adf012103e483f0401bd8655647e221c0d2fb6392e127b92756790683c8f47eae437a5aeeffffffffda2bf2fa4ccb802f0d1e44ea72e66f705de03f0bec3243c52eafc0e181b339de0d0000006a47304402207ee9af6196e24c94bd3956b78b5e3e451ccd46661d27e7690a8d953aff29c5700220275a59444448b95e144520ea825ba5062e21523c1e130fc13fbd3202c0f6eada012103b58e93afe3cc13302518b50b94510c3d58de7be5d8c7c41d52116f08f6736da3ffffffffda2bf2fa4ccb802f0d1e44ea72e66f705de03f0bec3243c52eafc0e181b339de0c0000006a47304402204b3f1ca96a5a64819ce401ecc0f8aba29b7aa579e8173e1110b1a8b0f5f95fa4022066e32e5c02a56ad404680cabc988621d6242b3909d7c65fc55d5aed7a3a5eccb0121034d160e9d7d572853357c8e7ffa00c652cd005da07de2d55a6933e42742d9376cffffffffda2bf2fa4ccb802f0d1e44ea72e66f705de03f0bec3243c52eafc0e181b339de0b0000006a4730440220017f3f809ecd4463524905bf97b6639f43b7cfad354d717508ae3c7530e2bb46022016d3d36a914846563a348aa5bf2f6f67d6d5fd5a929662333898489e2370e288012103599a439012abf893d7fa59eab302e3e8b4e5c2c64702707fd05498850a4ee6a1ffffffffda2bf2fa4ccb802f0d1e44ea72e66f705de03f0bec3243c52eafc0e181b339de0a0000006a47304402201d5d89d75a63070aed18e8bf289eca22838295e607018056334f47f03194b696022017721389068e2a1e56e825cce021cb2d53699f4c4869d9fbffd77852c8c1de670121036b3837736f488bcd6a0424be1c90ddfccb4c2883bbe9ea15e149f35cb4b873acffffffff64b81f02f2576dc90e6bbcb56526817bf2a36bc79314390b2f5dc80660fef2e10000000000ffffffff0200000000000000002a6a2843544e03000212208443510bc12b433245b9c1ebff82ea7463440b0f206867f7c478fb526fba3aa33a970100000000001600147c363632864eea566a823db54b12e644330e18dc000000000002473044022043e41547a6778d8531cbfd3674635368e5638f9e1b3904358b290dd5b0e8ddac0220205b985e4a1554d5d752796a76e138f59756b7ca86ee292f3710c149e8bda0bf012102571539026f4b9ce6fe3efab0d1ee3f32202a2918e84630e42a39be74bef4eaf700000000',
                                txType: msgTxType.settleOffChainMessages,
                                batchDocCid: new ctnMsgInspector.CID('QmXEx4UgyFxGcpVJ75Zeorvp44HuDaJ7VMoNU7DPPvprkS'),
                                offChainCid: new ctnMsgInspector.CID('QmYrsDziW2z6m2Qq5zbMcV3eBwTJWBwZrQR8pGYsAVd7i3'),
                                msgType: msgType.sendOffChainMessage,
                                msgOptions: {
                                    encryption: true,
                                    readConfirmation: true
                                },
                                originDevice: {
                                    pubKeyHash: oBuffer.from('71aec3ad9877087e9433d3608f43e255143d2cbc', 'hex')
                                },
                                targetDevice: {
                                    pubKeyHash: oBuffer.from('5fe91738ffca867f471394d1b76ab385f6771fd1', 'hex')
                                },
                                storageProvider: ipfsStorageProvider,
                                messageRef: new ctnMsgInspector.CID('QmRoxMMW1Jv7JpLjzGBdhWBJh9QW3acRGFGkBrcihnTz4q'),
                                message: oBuffer.from('cfffb852f85083a851289c009a6831c8e89ce7fc12ec6f4869a1b4093edf7306b821454f127cc5eae5293911aa879c5e', 'hex')
                            })
                            .and.to.have.all.keys('btcTransact', 'batchDoc', 'offChainMsgEnvelope');
                            expect(res).to.have.property('txData').that.is.an('object').that.has.deep.property('buffer', oBuffer.from('43544e03000212208443510bc12b433245b9c1ebff82ea7463440b0f206867f7c478fb526fba3aa3', 'hex'));
                        }
                        catch (err) {
                            error = err;
                        }

                        done(error);
                    });
                });

                it('should successfully inspect message (off-chain, log, plain)', function (done) {
                    msgInspector.inspectMessage('20382af6a33b32c957e5ab4e7b2a4feafb307063700c077708ba47de835fc625', 'QmRrUP1TbiqBnMe91XAyEuVsbgUvFa5383YJzkQoZ7RjHj', function (err, res) {
                        let error;

                        try {
                            expect(res).to.exist.and.be.a('object').that.equal(msgInspector).and.deep.include({
                                txid: '20382af6a33b32c957e5ab4e7b2a4feafb307063700c077708ba47de835fc625',
                                hexTx: '02000000000106da2bf2fa4ccb802f0d1e44ea72e66f705de03f0bec3243c52eafc0e181b339de0e0000006a47304402205e234e0295939a7f6c715746789a06d366544a25ee8f04b6b3213970935aadca022067d493f30020c6f7aba29872099852902f7e41298d27dd4b93eb1345d9af3adf012103e483f0401bd8655647e221c0d2fb6392e127b92756790683c8f47eae437a5aeeffffffffda2bf2fa4ccb802f0d1e44ea72e66f705de03f0bec3243c52eafc0e181b339de0d0000006a47304402207ee9af6196e24c94bd3956b78b5e3e451ccd46661d27e7690a8d953aff29c5700220275a59444448b95e144520ea825ba5062e21523c1e130fc13fbd3202c0f6eada012103b58e93afe3cc13302518b50b94510c3d58de7be5d8c7c41d52116f08f6736da3ffffffffda2bf2fa4ccb802f0d1e44ea72e66f705de03f0bec3243c52eafc0e181b339de0c0000006a47304402204b3f1ca96a5a64819ce401ecc0f8aba29b7aa579e8173e1110b1a8b0f5f95fa4022066e32e5c02a56ad404680cabc988621d6242b3909d7c65fc55d5aed7a3a5eccb0121034d160e9d7d572853357c8e7ffa00c652cd005da07de2d55a6933e42742d9376cffffffffda2bf2fa4ccb802f0d1e44ea72e66f705de03f0bec3243c52eafc0e181b339de0b0000006a4730440220017f3f809ecd4463524905bf97b6639f43b7cfad354d717508ae3c7530e2bb46022016d3d36a914846563a348aa5bf2f6f67d6d5fd5a929662333898489e2370e288012103599a439012abf893d7fa59eab302e3e8b4e5c2c64702707fd05498850a4ee6a1ffffffffda2bf2fa4ccb802f0d1e44ea72e66f705de03f0bec3243c52eafc0e181b339de0a0000006a47304402201d5d89d75a63070aed18e8bf289eca22838295e607018056334f47f03194b696022017721389068e2a1e56e825cce021cb2d53699f4c4869d9fbffd77852c8c1de670121036b3837736f488bcd6a0424be1c90ddfccb4c2883bbe9ea15e149f35cb4b873acffffffff64b81f02f2576dc90e6bbcb56526817bf2a36bc79314390b2f5dc80660fef2e10000000000ffffffff0200000000000000002a6a2843544e03000212208443510bc12b433245b9c1ebff82ea7463440b0f206867f7c478fb526fba3aa33a970100000000001600147c363632864eea566a823db54b12e644330e18dc000000000002473044022043e41547a6778d8531cbfd3674635368e5638f9e1b3904358b290dd5b0e8ddac0220205b985e4a1554d5d752796a76e138f59756b7ca86ee292f3710c149e8bda0bf012102571539026f4b9ce6fe3efab0d1ee3f32202a2918e84630e42a39be74bef4eaf700000000',
                                txType: msgTxType.settleOffChainMessages,
                                batchDocCid: new ctnMsgInspector.CID('QmXEx4UgyFxGcpVJ75Zeorvp44HuDaJ7VMoNU7DPPvprkS'),
                                offChainCid: new ctnMsgInspector.CID('QmRrUP1TbiqBnMe91XAyEuVsbgUvFa5383YJzkQoZ7RjHj'),
                                msgType: msgType.logOffChainMessage,
                                msgOptions: {
                                    encryption: false
                                },
                                originDevice: {
                                    pubKeyHash: oBuffer.from('9207d87c2dfa629e0449e3c93c89c0209af10da9', 'hex')
                                },
                                storageProvider: ipfsStorageProvider,
                                messageRef: new ctnMsgInspector.CID('QmcDAUTDocnt3AwEPJLUEAA41DzgYvcCTCkXQVJCvrCiNH'),
                                message: oBuffer.from('Message #18: off-chain, log, plain')
                            })
                            .and.to.have.all.keys('btcTransact', 'batchDoc', 'offChainMsgEnvelope')
                            .and.to.not.have.any.keys('targetDevice');
                            expect(res).to.have.property('txData').that.is.an('object').that.has.deep.property('buffer', oBuffer.from('43544e03000212208443510bc12b433245b9c1ebff82ea7463440b0f206867f7c478fb526fba3aa3', 'hex'));
                        }
                        catch (err) {
                            error = err;
                        }

                        done(error);
                    });
                });

                it('should successfully inspect message and return a fulfilled promise', function (done) {
                    let error;

                    msgInspector.inspectMessage('536178b12e9872ac336f5d274bef8cf2874c8e488e0ed886d5cd57301d8775dc')
                    .then(function (res) {
                        expect(res).to.exist.and.be.a('object').that.equal(msgInspector).and.deep.include({
                            txid: '536178b12e9872ac336f5d274bef8cf2874c8e488e0ed886d5cd57301d8775dc',
                            hexTx: '02000000000102259b7c5d57bfd457167954c297fb877dc548abe186855a693a7e384c32e061738b00000000fffffffffa60ff096d81332cc5d84c55a1f870520e921fdbf35e15438e7bdb6de14e6d5b070000006a4730440220080fbd9e39ed0ec15eb77baece642801f7f7d69fda0bd84f641ce82802d6cdf0022015225afea3ec665a50c5bc16faf8a2632e49f4a34d79c743abb2ddff62550030012103b5429b234479af26885f5e1c78a8831bed39dca9912c4b74301c6a80b3660212ffffffff0426010000000000001600146c0aa2d3ea17385002255057771a9853db80838400000000000000003b6a3943544e01014d6573736167652023333a207374616e646172642c2073656e642c206e6f2d636f6e662c20706c61696e2c20656d626564646564260100000000000016001464ef1b507b4d8775a850498203b484871877998dceb9000000000000160014cb5bce3fa31f39b0c312097ef81ef80fb37bff4402473044022059df19b7ec6ae8684a033d404fc8eb16a9fedf6fe6afb0d5f6413b9aec022e13022044404c010581540698b92ae110cad782112437ca98b424049366ef7a9ee0e5770121032f761013e901927b35d866e7ab07506d45a6a7dcc78a1f1aa1d88f6f334bdc990000000000',
                            txType: msgTxType.sendMessage,
                            msgType: msgType.sendStandardMessage,
                            msgOptions: {
                                embedding: true,
                                encryption: false,
                                readConfirmation: false
                            },
                            originDevice: {
                                address: 'tb1qzfrmk4kzgvc89rt82ejkre2jdja3ge22trl3g8',
                                pubKeyHash: oBuffer.from('1247bb56c24330728d67566561e5526cbb14654a', 'hex')
                            },
                            targetDevice: {
                                address: 'tb1qds9295l2zuu9qq392pthwx5c20dcpquyad0fnl',
                                pubKeyHash: oBuffer.from('6c0aa2d3ea17385002255057771a9853db808384', 'hex')
                            },
                            message: oBuffer.from('Message #3: standard, send, no-conf, plain, embedded')
                        })
                        .and.to.have.all.keys('btcTransact')
                        .and.to.not.have.any.keys('storageProvider', 'messageRef');
                        expect(res).to.have.property('txData').that.is.an('object').that.has.deep.property('buffer', oBuffer.from('43544e01014d6573736167652023333a207374616e646172642c2073656e642c206e6f2d636f6e662c20706c61696e2c20656d626564646564', 'hex'));
                    }, function (err) {
                        error = new Error('Promise should not have been rejected');
                    })
                    .catch(function (err) {
                        error = err;
                    })
                    .finally(function () {
                        done(error);
                    });
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
