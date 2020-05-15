/**
 * Created by claudio on 2020-05-04
 */

(function () {
    const testSuite = function suite(ctnMsgInspector, expect) {
        describe('BlockTxReader module', function () {
            describe('Instantiate BlockchainTxReader', function () {
                const defaultMainExplorerApiRootUrl = 'https://blockstream.info/api/tx/:txid/hex';
                const defaultTestnetExplorerApiRootUrl = 'https://blockstream.info/testnet/api/tx/:txid/hex';

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
                it('should return error when passing an invalid tx ID', function (done) {
                    const bcReader = new ctnMsgInspector.BlockchainTxReader('testnet');

                    bcReader.getTransaction('', function (err, res) {
                        expect(err).to.exist.and.be.an.instanceof(TypeError).and.have.property('message', 'Invalid transaction ID');

                        done();
                    });
                });

                it('should return error when passing an non existent tx ID', function (done) {
                    const bcReader = new ctnMsgInspector.BlockchainTxReader('testnet');

                    bcReader.getTransaction('24e5b18a8d6d0f282fb08bad1f34c2ee66f0f6afc64b592b95bcd0d6c17becff', function (err, res) {
                        expect(err).to.exist.and.be.an.instanceof(Error).and.have.property('message', '[404] Transaction not found');

                        done();
                    });
                });

                it('should return error when accessing a non existent URL', function (done) {
                    const bcReader = new ctnMsgInspector.BlockchainTxReader({
                        rootUrl: 'http://nowhere.io/explorer/api/',
                        getRawTxHexEndpoint: 'tx/:txid'
                    });

                    bcReader.getTransaction('24e5b18a8d6d0f282fb08bad1f34c2ee66f0f6afc64b592b95bcd0d6c17bec77', function (err, res) {
                        expect(err).to.exist.and.be.an.instanceof(Error);

                        done();
                    });
                });

                it('should correctly return a transaction', function (done) {
                    const bcReader = new ctnMsgInspector.BlockchainTxReader('testnet');

                    bcReader.getTransaction('24e5b18a8d6d0f282fb08bad1f34c2ee66f0f6afc64b592b95bcd0d6c17bec77', function (err, res) {
                        expect(res).to.exist.and.be.a('string');

                        done();
                    });
                });

                it('should return error if a timeout is forced', function (done) {
                    const bcReader = new ctnMsgInspector.BlockchainTxReader('testnet', {timeout: 1});

                    // Note: we try to fetch an non-existent transaction to avoid an immediate
                    //  return due to browser caching
                    bcReader.getTransaction('24e5b18a8d6d0f282fb08bad1f34c2ee66f0f6afc64b592b95bcd0d6c17becff', function (err, res) {
                        expect(err).to.exist.and.be.an.instanceof(Error).and.have.property('message', 'Request timed out');

                        done();
                    });
                });

                if (typeof window === 'object' && window.RUNNING_MOCHA) {
                    // Running test suite on a browser
                    it('should return error if a timeout is forced (fetch mode disabled)', function (done) {
                        const bcReader = new ctnMsgInspector.BlockchainTxReader('testnet', {timeout: 1, mode: 'disable-fetch'});

                        // Note: we try to fetch an non-existent transaction to avoid an immediate
                        //  return due to browser caching
                        bcReader.getTransaction('24e5b18a8d6d0f282fb08bad1f34c2ee66f0f6afc64b592b95bcd0d6c17becff', function (err, res) {
                            expect(err).to.exist.and.be.an.instanceof(Error).and.have.property('message', 'Request timed out');

                            done();
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
