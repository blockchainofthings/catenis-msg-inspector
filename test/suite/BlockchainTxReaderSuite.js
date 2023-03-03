/**
 * Created by claudio on 2020-05-04
 */

(function () {
    const testSuite = function suite(ctnMsgInspector, expect) {
        describe('BlockTxReader module', function () {
            describe('Instantiate BlockchainTxReader', function () {
                const defaultMainExplorerApiRootUrl = 'https://blockstream.info/api/tx/:txid/hex';
                const defaultTestnetExplorerApiRootUrl = 'https://blockstream.info/testnet/api/tx/:txid/hex';
                const defaultSignetExplorerApiRootUrl = 'https://ex.signet.bublina.eu.org/api/tx/:txid';

                it('should throw if an invalid \'explorerApi\' parameter is passed', function () {
                    expect(() => {
                        new ctnMsgInspector.BlockchainTxReader(1);
                    }).to.throw(TypeError, 'Invalid blockchain explorer API URL');
                });

                it('should throw if an invalid URL is passed', function () {
                    expect(() => {
                        new ctnMsgInspector.BlockchainTxReader({});
                    }).to.throw(TypeError, 'Invalid blockchain explorer API URL');
                });

                it('should throw if a URL with an invalid protocol is passed', function () {
                    expect(() => {
                        new ctnMsgInspector.BlockchainTxReader({
                            rootUrl: 'file:///home/user1/explorer/api/',
                            getRawTxHexEndpoint: 'tx/:txid'
                        });
                    }).to.throw(TypeError, 'Invalid blockchain explorer API URL');
                });

                it('should use default main URL if an invalid network is passed', function () {
                    const bcReader = new ctnMsgInspector.BlockchainTxReader('bla');

                    expect(bcReader.explorerApiUrl.href).to.equal(defaultMainExplorerApiRootUrl);
                });

                it('should use default testnet URL if \'testnet\' network is passed', function () {
                    const bcReader = new ctnMsgInspector.BlockchainTxReader('testnet');

                    expect(bcReader.explorerApiUrl.href).to.equal(defaultTestnetExplorerApiRootUrl);
                });

                it('should use default testnet URL if \'signet\' network is passed', function () {
                    const bcReader = new ctnMsgInspector.BlockchainTxReader('signet');

                    expect(bcReader.explorerApiUrl.href).to.equal(defaultSignetExplorerApiRootUrl);
                });

                it('should use a custom URL if one is passed', function () {
                    const explorerApi = {
                        rootUrl: 'http://localhost/explorer/api/',
                        getRawTxHexEndpoint: 'tx/:txid'
                    };
                    const bcReader = new ctnMsgInspector.BlockchainTxReader(explorerApi);

                    expect(bcReader.explorerApiUrl.href).to.equal(explorerApi.rootUrl + explorerApi.getRawTxHexEndpoint);
                });
            });

            describe('Get transaction', function () {
                this.timeout(5000);

                it('should return error when passing an invalid tx ID', function (done) {
                    const bcReader = new ctnMsgInspector.BlockchainTxReader('testnet');

                    bcReader.getTransaction('', function (err, res) {
                        let error;

                        try {
                            expect(err).to.exist.and.be.an.instanceof(TypeError).and.have.property('message', 'Invalid transaction ID');
                        }
                        catch(err) {
                            error = err;
                        }

                        done(error);
                    });
                });

                it('should return error when passing an non existent tx ID', function (done) {
                    const bcReader = new ctnMsgInspector.BlockchainTxReader('testnet');

                    bcReader.getTransaction('24e5b18a8d6d0f282fb08bad1f34c2ee66f0f6afc64b592b95bcd0d6c17becff', function (err, res) {
                        let error;

                        try {
                            expect(err).to.exist.and.be.an.instanceof(Error).and.have.property('message', '[404] Transaction not found');
                        }
                        catch(err) {
                            error = err;
                        }

                        done(error);
                    });
                });

                it('should return error when accessing a non existent URL', function (done) {
                    const bcReader = new ctnMsgInspector.BlockchainTxReader({
                        rootUrl: 'http://nowhere.io/explorer/api/',
                        getRawTxHexEndpoint: 'tx/:txid'
                    });

                    bcReader.getTransaction('24e5b18a8d6d0f282fb08bad1f34c2ee66f0f6afc64b592b95bcd0d6c17bec77', function (err, res) {
                        let error;

                        try {
                            expect(err).to.exist.and.be.an.instanceof(Error);
                        }
                        catch(err) {
                            error = err;
                        }

                        done(error);
                    });
                });

                it('should correctly return a transaction (testnet)', function (done) {
                    const bcReader = new ctnMsgInspector.BlockchainTxReader('testnet');

                    bcReader.getTransaction('24e5b18a8d6d0f282fb08bad1f34c2ee66f0f6afc64b592b95bcd0d6c17bec77', function (err, res) {
                        let error;

                        try {
                            expect(res).to.exist.and.be.a('string')
                            .that.equals('01000000000101e5187693eb6f4956e034b0fc151bdb056e17ed3ebcd8a3f4edf83b47b6a37a8f0100000000ffffffff028b0702000000000017a914260c07354762b41ddb3f93fd6d68d8394148de408729570600000000001600140c7f9677613b2d9e87c7c77e9ca40fa6f63ec7c70247304402206dd365a59760176b8ebb07f9dd1aff6528b3d42057544087070bd040143c7594022010b95fc2ac6f28a5eaec87164bded8606fd10e90d77b12f07b6b15449a120901012103fa2532c94013b0e3bddde8a5800d3112ab0d6e89b759a9ee91a10a245ab8d6a400000000');
                        }
                        catch(err) {
                            error = err;
                        }

                        done(error);
                    });
                });

                it('should correctly return a transaction (sigtnet)', function (done) {
                    const bcReader = new ctnMsgInspector.BlockchainTxReader('signet');

                    bcReader.getTransaction('ab139628c811c25b3b3cbc20a08bd8683148f04f2561238264a6e8f0e2273d77', function (err, res) {
                        let error;

                        try {
                            expect(res).to.exist.and.be.a('string')
                            .that.equals('02000000000101e5405a79d456e5d760c46f545bca563a8c5ec2ef339f543c823283d2f56f118e0100000000feffffff0240420f000000000022512057242d6c549896edef1d1573d4db693893a22577d70242ea3a1a391e4ff0a02dc8692bd34b06000016001485566096bd0edc9c9eae468f5b7fde6d4a79996f0247304402202a3bc525c52c1138c37d90880df7f4954ded181a1bfca87b11a0ba58f1f175f102207cfa524475d270245635b45f0f2e9407536f077bf69891901c9552b8595b98d40121027a977b5b1eadbabe4a9b55d089880ad28a661fdd81ba0aa9c211ac3f33e2ce15e3040200');
                        }
                        catch(err) {
                            error = err;
                        }

                        done(error);
                    });
                });

                it('should return error if a timeout is forced', function (done) {
                    const bcReader = new ctnMsgInspector.BlockchainTxReader('testnet', {timeout: 1});

                    // Note: we try to fetch an non-existent transaction to avoid an immediate
                    //  return due to browser caching
                    bcReader.getTransaction('24e5b18a8d6d0f282fb08bad1f34c2ee66f0f6afc64b592b95bcd0d6c17becff', function (err, res) {
                        let error;

                        try {
                            expect(err).to.exist.and.be.an.instanceof(Error).and.have.property('message', 'Request timed out');
                        }
                        catch(err) {
                            error = err;
                        }

                        done(error);
                    });
                });

                if (typeof window === 'object' && window.RUNNING_MOCHA) {
                    // Running test suite on a browser
                    it('should return error if a timeout is forced (fetch mode disabled)', function (done) {
                        const bcReader = new ctnMsgInspector.BlockchainTxReader('testnet', {timeout: 1, mode: 'disable-fetch'});

                        // Note: we try to fetch an non-existent transaction to avoid an immediate
                        //  return due to browser caching
                        bcReader.getTransaction('24e5b18a8d6d0f282fb08bad1f34c2ee66f0f6afc64b592b95bcd0d6c17becff', function (err, res) {
                            let error;

                            try {
                                expect(err).to.exist.and.be.an.instanceof(Error).and.have.property('message', 'Request timed out');
                            }
                            catch(err) {
                                error = err;
                            }

                            done(error);
                        });
                    });
                }

                it('should return a rejected promise (non existent tx ID)', function (done) {
                    const bcReader = new ctnMsgInspector.BlockchainTxReader('testnet');
                    let error;

                    bcReader.getTransaction('24e5b18a8d6d0f282fb08bad1f34c2ee66f0f6afc64b592b95bcd0d6c17becff')
                    .then(function (res) {
                        error = new Error('Promise should have been rejected');
                    }, function (err) {
                        expect(err).to.exist.and.be.an.instanceof(Error);
                    })
                    .catch(function (err) {
                        error = err;
                    })
                    .finally(function () {
                        done(error);
                    });
                });

                it('should return a fulfilled promise', function (done) {
                    const bcReader = new ctnMsgInspector.BlockchainTxReader('testnet');
                    let error;

                    bcReader.getTransaction('24e5b18a8d6d0f282fb08bad1f34c2ee66f0f6afc64b592b95bcd0d6c17bec77')
                    .then(function (res) {
                        expect(res).to.exist.and.be.a('string');
                    }, function (err) {
                        error = new Error('Promise should have been fulfilled');
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
    };

    if (typeof module === 'object' && module.exports) {
        module.exports = testSuite;
    }
    else {
        this.testSuite = testSuite;
    }
})();
