# Catenis Message Inspector

A JavaScript library used for inspection of Catenis messages.

## Installation

On Node.js:

```shell
npm install catenis-msg-inspector
```

On the browser:

```html
<script src="https://unpkg.com/catenis-msg-inspector"></script>
```

### Browser compatibility

The Catenis Message Inspector library is compatible with modern web browsers.

It has been tested on the following web browsers:

- Safari ver. 13.1 (on macOS Catalina 10.15)
- Google Chrome ver. 83.0 64 bits (on macOS Catalina 10.15, Windows 10)
- Google Chrome ver. 83.0 32 bits (on Windows 8.1)
- Firefox ver. 76.0 64-bits (on macOS Catalina 10.15)
- Microsoft Edge ver. 44 (on Windows 10)

> **Note**: Internet Explorer is **not** supported.

## Usage

### Instantiate the message inspector object

On Node.js:

```javascript
const ctnMsgInspector = require('catenis-msg-inspector');

const msgInspector = new ctnMsgInspector.MessageInspector({network:'testnet'});
```

On the browser:

```html
<script>
const msgInspector = new ctnMsgInspector.MessageInspector({network:'testnet'});
</script>
```

#### Constructor options

The following options can be used when instantiating the message inspector object:

- **network** \[String\] - (optional, default: <b>*'main'*</b>) Bitcoin blockchain network where Catenis message
 transactions are recorded. Valid values:
  - *'main'*
  - *'testnet'*
- **reqOptions** \[Object\] - (optional) Object with common options to be passed to (Node.js') `http.request()` function.
- **blockExplorer** \[Object\] - (optional)
- **blockExplorer.api** \[Object\] - (optional, default: <b>*{rootUrl:'https://blockstream.info/api/', getRawTxHexEndpoint:'tx/:txid/hex'}*</b>)
- **blockExplorer.api.rootUrl** \[String\] - Root URL of blockchain explorer API to use.
- **blockExplorer.api.getRawTxHexEndpoint** \[String\] - Endpoint of API service used for getting hex-encoded raw
 transactions. It is expected the endpoint to have the inline parameter `:txid`.
- **blockExplorer.reqOptions** \[Object\] - (optional) Object with options to be passed to (Node.js') `http.request()`
 function when accessing the blockchain explorer API.
- **ipfsGateway** \[Object\] - (optional)
- **ipfsGateway.url** \[String\] - (optional, default: <b>*'https://ipfs.catenis.io'*</b>) URL of IPFS gateway to use to
 retrieve data from IPFS.
- **ipfsGateway.reqOptions** \[Object\] - (optional) Object with options to be passed to (Node.js') `http.request()`
 function when retrieving data from IPFS.

### Inspecting messages

Call the `inspectMessage()` method of the message inspector object passing the reference to a Catenis message's container.

The object will then gather the information about the Catenis message and return it asynchronously. You can either pass
 it a callback or use the returned promise. The message information is saved in the message inspector object's
 properties, and the object itself is returned.

#### Message info properties

The following properties should be added to the message inspector object once the Catenis message's inspection is done:

- **txid** \[String\] - ID of the blockchain transaction used to register the Catenis message onto the bitcoin
 blockchain.
- **hexTx** \[String\] - Serialized blockchain transaction in hex format.
- **btcTransact** \[Transaction\] - Parsed blockchain transaction. An instance of the Transaction class object as
 defined in the `bitcoinjs-lib` Node.js module.
- **txData** \[TransactionData\] - Parsed data embedded in the blockchain transaction. An instance of the
 TransactionData class object as defined in this library. Relevant properties:
  - *buffer* \[Buffer\] Buffer containing the actual embedded data.
- **txType** \[Object\] - Object identifying the type of the Catenis issued transaction. Relevant properties:
  - *name* \[String\] The transaction type name. Possible values:
    - `sendMessage`
    - `logMessage`
    - `settleOffChainMessages`
  - *description* \[String\] Description of the transaction type.
- **msgType** \[Object\] - Object identifying the type of Catenis message. Relevant properties:
  - *name* \[String\] The message type name. Possible values:
    - `sendStandardMessage`
    - `logStandardMessage`
    - `sendOffChainMessage`
    - `logOffChainMessage`
  - *description* \[String\] Description of the message type.
- **msgOptions** \[Object\] - Object indicating the applied message options. Object properties:
  - *embedding* \[Boolean\] Indicates whether the message contents is embedded in the blockchain transaction or not
   (recorded in an external storage provider).
  - *encryption* \[Boolean\] Indicates whether the message contents is encrypted or not.
  - *padding* \[Boolean\] Indicates whether the embedded message contents is padded or not.
  - *readConfirmation* \[Boolean\] Indicates whether the message was sent with read confirmation.
- **originDevice** \[Object\] - Object identifying the Catenis virtual device that had issued the message. Object
 properties:
  - *address* \[String\] Bitcoin address derived from the Catenis virtual device's cryptographic key pair. Note: this
   property is not available for off-chain messages.
  - *pubKeyHash* \[Buffer\] Buffer containing the cryptographic hash (`RIPEMD-160(SHA-256(public key))`) of the public
   key of a cryptographic key pair that belongs to the Catenis virtual device.
- **targetDevice** \[Object\] - Object identifying the Catenis virtual device to which the message is addressed. Object
 properties:
  - *address* \[String\] Bitcoin address derived from the Catenis virtual device's cryptographic key pair. Note: this
   property is not available for off-chain messages.
  - *pubKeyHash* \[Buffer\] Buffer containing the cryptographic hash (`RIPEMD-160(SHA-256(public key))`) of the public
   key of a cryptographic key pair that belongs to the Catenis virtual device.
- **msgPadding** \[Buffer\] - Buffer containing the bytes used for padding the embedded message contents.
- **message** \[Buffer\] - Buffer containing the message contents.
- **storageProvider** \[Object\] - Object identifying the external storage provider that was used to record the message.
 Relevant properties:
  - *name* \[String\] The name of the external storage provider. Possible values:
    - `ipfs`
  - *description* \[String\] Description of the external storage provider.
- **messageRef** \[CID\] - Reference to the recorded message on the external storage provider. An instance of the CID
 class object as defined in the `cids` Node.js module.
- **batchDocCid** \[CID\] - Content ID of the off-chain messages batch document on IPFS. An instance of the CID class
 object as defined in the `cids` Node.js module.
- **batchDoc** \[BatchDocument\] - Parsed off-chain messages batch document. An instance of the BatchDocument class
 object as defined in the `catenis-off-chain-lib` Node.js module.
- **offChainCid** \[CID\] - Content ID of the off-chain message envelope on IPFS. An instance of the CID class object as
 defined in the `cids` Node.js module.
- **offChainMsgEnvelope** \[MessageEnvelope\] - Parsed off-chain message envelope. An instance of the MessageEnvelope
 class object as defined in the `catenis-off-chain-lib` Node.js module.

### Examples

In the following examples the `msgContainer` variable simulates a successful response from the *Retrieve Message
 Container* method of the Catenis API.

#### Inspecting standard Catenis message

```javascript
const msgContainer = {
  blockchain: {
    txid: '7b197d3c706b40f0cd6ce5c36309b3429d0bc7ce1d57cb2a9950d58694c7de5f',
    isConfirmed: true
  }
};
```

Using a callback:

```javascript
msgInspector.inspectMessage(msgContainer.blockchain.txid, (err, res) => {
  if (err) {
    console.error('Error inspecting message:', err);
  }
  else {
    console.log('Inspection result:', res);
  }
});
```

Using promise:

```javascript
msgInspector.inspectMessage(msgContainer.blockchain.txid)
.then((res) => {
  console.log('Inspection result:', res);
}, (err) => {
  console.error('Error inspecting message:', err);
});
```

#### Inspecting off-chain Catenis message not yet settled on the blockchain

```javascript
const msgContainer = {
  offChain: {
    cid: "QmR8SzCMcu4LYpw16Xo6sVYwdMfcomkp5sAcYdEhQJ69oK"
  },
  externalStorage: {
    ipfs: "QmYDT2i4q6DDLFdQ8JrLJqTryyjGxcwvD6MfA3S3M87Px9"
  }
};
```

Using a callback:

```javascript
msgInspector.inspectMessage(null, msgContainer.offChain.cid, (err, res) => {
  if (err) {
    console.error('Error inspecting message:', err);
  }
  else {
    console.log('Inspection result:', res);
  }
});
```

Using promise:

```javascript
msgInspector.inspectMessage(null, msgContainer.offChain.cid)
.then((res) => {
  console.log('Inspection result:', res);
}, (err) => {
  console.error('Error inspecting message:', err);
});
```

#### Inspecting off-chain Catenis message already settled on the blockchain

```javascript
const msgContainer = {
  offChain: {
    cid: 'QmYrsDziW2z6m2Qq5zbMcV3eBwTJWBwZrQR8pGYsAVd7i3'
  },
  blockchain: {
    txid: '20382af6a33b32c957e5ab4e7b2a4feafb307063700c077708ba47de835fc625',
    isConfirmed: true
  },
  externalStorage: {
    ipfs: 'QmRoxMMW1Jv7JpLjzGBdhWBJh9QW3acRGFGkBrcihnTz4q'
  }
};
```

Using a callback:

```javascript
msgInspector.inspectMessage(msgContainer.blockchain.txid, msgContainer.offChain.cid, (err, res) => {
  if (err) {
   console.error('Error inspecting message:', err);
  }
  else {
   console.log('Inspection result:', res);
  }
});
```

Using promise:

```javascript
msgInspector.inspectMessage(msgContainer.blockchain.txid, msgContainer.offChain.cid)
.then((res) => {
  console.log('Inspection result:', res);
}, (err) => {
  console.error('Error inspecting message:', err);
});
```

## License

This JavaScript library is released under the [MIT License](LICENSE). Feel free to fork, and modify!

Copyright © 2020, Blockchain of Things Inc.
