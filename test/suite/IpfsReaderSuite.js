/**
 * Created by claudio on 2020-05-13
 */

(function () {
    const testSuite = function suite(ctnMsgTx, expect) {
        const oBuffer = typeof Buffer !== 'undefined' ? Buffer : ctnMsgTx.Buffer;

        describe('IpfsReader module', function () {
            describe('Instantiate IpfsReader', function () {
                const defaultIpfsGatewayUrl = 'https://ipfs.catenis.io/';

                it('should throw if an invalid \'ipfsGatewayUrl\' parameter is passed', function () {
                    expect(() => {
                        new ctnMsgTx.IpfsReader(1);
                    }).to.throw(TypeError, 'Invalid IPFS Gateway URL');
                });

                it('should throw if a URL with an invalid protocol is passed', function () {
                    expect(() => {
                        new ctnMsgTx.IpfsReader('file:///home/user1/ipfs/');
                    }).to.throw(TypeError, 'Invalid IPFS Gateway URL');
                });

                it('should use default IPFS Gateway URL if request options is passed in its place', function () {
                    const ipfsReader = new ctnMsgTx.IpfsReader({});

                    expect(ipfsReader.gatewayUrl.href).to.equal(defaultIpfsGatewayUrl);
                });

                it('should use default IPFS Gateway URL if no URL is passed', function () {
                    const ipfsReader = new ctnMsgTx.IpfsReader();

                    expect(ipfsReader.gatewayUrl.href).to.equal(defaultIpfsGatewayUrl);
                });

                it('should use custom IPFS Gateway URL if one is passed', function () {
                    const gatewayURL = 'http://localhost:8080/';
                    const ipfsReader = new ctnMsgTx.IpfsReader(gatewayURL);

                    expect(ipfsReader.gatewayUrl.href).to.equal(gatewayURL);
                });
            });

            describe('Retrieve data from IPFS', function () {
                const gatewayCheckerCID = 'Qmaisz6NMhDB51cCvNWa1GMS7LU1pAxdF4Ld6Ft9kZEP2a';
                const nonExistentCID = gatewayCheckerCID.replace(/.$/, 'b');

                it('should return error when passing an invalid IPFS CID', function (done) {
                    const ipfsReader = new ctnMsgTx.IpfsReader();

                    ipfsReader.getData('bla', function (err, res) {
                        expect(err).to.exist.and.be.an.instanceof(TypeError).and.have.property('message', 'Invalid data IPFS CID');

                        done();
                    });
                });

                it('should return (timeout) error when trying to retrieve an non-existent data', function (done) {
                    const ipfsReader = new ctnMsgTx.IpfsReader({timeout: 200});

                    ipfsReader.getData(nonExistentCID, function (err, res) {
                        expect(err).to.exist.and.be.an.instanceof(Error).and.have.property('message', 'Request timed out');

                        done();
                    });
                });

                if (typeof window === 'object' && window.RUNNING_MOCHA) {
                    // Running test suite on a browser
                    it('should return (timeout) error when trying to retrieve an non-existent data (fetch mode disabled)', function (done) {
                        const ipfsReader = new ctnMsgTx.IpfsReader({timeout: 200, mode: 'disable-fetch'});

                        ipfsReader.getData(nonExistentCID, function (err, res) {
                            expect(err).to.exist.and.be.an.instanceof(Error).and.have.property('message', 'Request timed out');

                            done();
                        });
                    });
                }

                it('should correctly return the data', function (done) {
                    const ipfsReader = new ctnMsgTx.IpfsReader();

                    ipfsReader.getData(gatewayCheckerCID, function (err, res) {
                        expect(res).to.exist.and.be.an.instanceof(oBuffer);

                        done();
                    });
                });

                it('should return a rejected promise (invalid IPFS CID)', function (done) {
                    const ipfsReader = new ctnMsgTx.IpfsReader();
                    let error;

                    ipfsReader.getData('bla')
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
                    const ipfsReader = new ctnMsgTx.IpfsReader();
                    let error;

                    ipfsReader.getData(gatewayCheckerCID)
                    .then(function (res) {
                        expect(res).to.exist.and.be.an.instanceof(oBuffer);
                    }, function (err) {
                        console.debug('Error returned:', err);
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
