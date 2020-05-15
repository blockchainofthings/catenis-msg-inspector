/**
 * Created by claudio on 2020-05-04
 */

const CID = require('cids');

/**
 * Utility function that converts a URL object into an ordinary options object as
 *  expected by the http.request and https.request APIs
 * @param {URL} url
 * @returns {{path: string, protocol: (string|string|RTCIceProtocol), hostname: (*), search, href, hash, pathname}}
 */
function urlToOptions(url) {
    const options = {
        protocol: url.protocol,
        hostname: typeof url.hostname === 'string' && url.hostname.startsWith('[') ?
            url.hostname.slice(1, -1) :
            url.hostname,
        hash: url.hash,
        search: url.search,
        pathname: url.pathname,
        path: `${url.pathname || ''}${url.search || ''}`,
        href: url.href
    };
    if (url.port !== '') {
        options.port = Number(url.port);
    }
    if (url.username || url.password) {
        options.auth = `${url.username}:${url.password}`;
    }
    return options;
}

function validateCid(cid) {
    let validCid;

    try {
        validCid = new CID(cid);
    }
    catch (err) {}

    return validCid;
}


module.exports = {
    urlToOptions,
    validateCid
}
