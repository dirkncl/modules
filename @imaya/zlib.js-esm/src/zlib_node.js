/**
 * zlib.js wrapper for node.js
 */
import { Buffer } from '../../../../modules/buffer-esm/index.js'
import * as process from '../../../../modules/process/browser.js'
import { Zlib } from './zlib.js'

/**
 * deflate async.
 * @param {!(Buffer|Array.<number>|Uint8Array)} buffer plain data buffer.
 * @param {function(Error, !(Buffer|Array.<number>|Uint8Array))} callback
 *     error calllback function.
 * @param {Object=} opt_params option parameters.
 */
export function deflate(buffer, callback, opt_params) {
  process.nextTick(function(){
    /** @type {Error} error */
    var error;
    /** @type {!(Buffer|Array.<number>|Uint8Array)} deflated buffer. */
    var deflated;

    try {
      deflated = deflateSync(buffer, opt_params);
    } catch(e){
      error = e;
    }

    callback(error, deflated);
  });
}


/**
 * deflate sync.
 * @param {!(Buffer|Array.<number>|Uint8Array)} buffer plain data buffer.
 * @param {Object=} opt_params option parameters.
 * @return {!(Buffer|Array.<number>|Uint8Array)} deflated buffer.
 */
export function deflateSync(buffer, opt_params) {
  /** @type {Zlib.Deflate} deflate encoder. */
  var deflate;
  /** @type {!(Array.<number>|Uint8Array)} deflated buffer. */
  var deflated;

  if (!opt_params) {
    opt_params = {};
  }

  deflate = new Zlib.Deflate(
    /** @type {!(Array.<number>|Uint8Array)} */(buffer),
    opt_params['deflateOption'] || {}
  );
  deflated = deflate.compress();

  return opt_params.noBuffer ? deflated : toBuffer(deflated);
}


/**
 * inflate async.
 * @param {!(Array.<number>|Uint8Array)} buffer deflated buffer.
 * @param {function(Error, !(Buffer|Array.<number>|Uint8Array))} callback
 *     error calllback function.
 * @param {Object=} opt_params option parameters.
 */
export function inflate(buffer, callback, opt_params) {
  process.nextTick(function(){
    /** @type {Error} error */
    var error;
    /** @type {!(Buffer|Array.<number>|Uint8Array)} inflated plain buffer. */
    var inflated;

    try {
      inflated = inflateSync(buffer, opt_params);
    } catch(e){
      error = e;
    }

    callback(error, inflated);
  });
};


/**
 * inflate sync.
 * @param {!(Array.<number>|Uint8Array)} buffer deflated buffer.
 * @param {Object=} opt_params option parameters.
 * @return {!(Buffer|Array.<number>|Uint8Array)} inflated plain buffer.
 */
export function inflateSync(buffer, opt_params) {
  /** @type {Zlib.Inflate} deflate decoder. */
  var inflate;
  /** @type {!(Buffer|Array.<number>|Uint8Array)} inflated plain buffer. */
  var inflated;

  if (!opt_params) {
    opt_params = {};
  }

  buffer.subarray = buffer.slice;
  inflate = new Zlib.Inflate(buffer, opt_params['inflateOption'] || {});
  inflated = inflate.decompress();

  return opt_params['noBuffer'] ? inflated : toBuffer(inflated);
}

/**
 * gunzip async.
 * @param {!(Array.<number>|Uint8Array)} buffer inflated buffer.
 * @param {function(Error, !(Buffer|Array.<number>|Uint8Array))} callback
 *     error calllback function.
 * @param {Object=} opt_params option parameters.
 */
export function gzip(buffer, callback, opt_params) {
  process.nextTick(function(){
    /** @type {Error} error */
    var error;
    /** @type {!(Buffer|Array.<number>|Uint8Array)} deflated buffer. */
    var deflated;

    try {
      deflated = gzipSync(buffer, opt_params);
    } catch(e){
      error = e;
    }

    callback(error, deflated);
  });
}

/**
 * deflate sync.
 * @param {!(Array.<number>|Uint8Array)} buffer inflated buffer.
 * @param {Object=} opt_params option parameters.
 * @return {!(Buffer|Array.<number>|Uint8Array)} deflated buffer.
 */
export function gzipSync(buffer, opt_params) {
  /** @type {Zlib.Gzip} deflate compressor. */
  var deflate;
  /** @type {!(Buffer|Array.<number>|Uint8Array)} deflated buffer. */
  var deflated;

  buffer.subarray = buffer.slice;
  deflate = new Zlib.Gzip(buffer);
  deflated = deflate.compress();

  if (!opt_params) {
    opt_params = {};
  }

  return opt_params.noBuffer ? deflated : toBuffer(deflated);
}

/**
 * gunzip async.
 * @param {!(Array.<number>|Uint8Array)} buffer deflated buffer.
 * @param {function(Error, !(Buffer|Array.<number>|Uint8Array))} callback
 *     error calllback function.
 * @param {Object=} opt_params option parameters.
 */
export function gunzip(buffer, callback, opt_params) {
  process.nextTick(function(){
    /** @type {Error} error */
    var error;
    /** @type {!(Buffer|Array.<number>|Uint8Array)} inflated plain buffer. */
    var inflated;

    try {
      inflated = gunzipSync(buffer, opt_params);
    } catch(e){
      error = e;
    }

    callback(error, inflated);
  });
}

/**
 * inflate sync.
 * @param {!(Array.<number>|Uint8Array)} buffer deflated buffer.
 * @param {Object=} opt_params option parameters.
 * @return {!(Buffer|Array.<number>|Uint8Array)} inflated plain buffer.
 */
export function gunzipSync(buffer, opt_params) {
  /** @type {Zlib.Gunzip} deflate decompressor. */
  var inflate;
  /** @type {!(Buffer|Array.<number>|Uint8Array)} inflated plain buffer. */
  var inflated;

  buffer.subarray = buffer.slice;
  inflate = new Zlib.Gunzip(buffer);
  inflated = inflate.decompress();

  if (!opt_params) {
    opt_params = {};
  }

  return opt_params.noBuffer ? inflated : toBuffer(inflated);
}


/**
 * convert to Buffer.
 * @param {!(Array.<number>|Uint8Array)} array arraylike object.
 * @return {!Buffer} Buffer object.
 */
function toBuffer(array) {
  return new Buffer(array)
}

