/**
 * @fileoverview Adler32 Checksum implementation.
 */
import { USE_TYPEDARRAY } from './hybrid.js'
import * as Util from './util.js'


/**
 * Adler32 Creating a hash value
 * @param {!(Array|Uint8Array|string)} array :The byte array to use for the calculation.
 * @return {number} Adler32 Hash value.
 */
export function Adler32(array) {
  if (typeof(array) === 'string') {
    array = Util.stringToByteArray(array);
  }
  return Adler32.update(1, array);
};

/**
 * Adler32 Update hash value
 * @param {number} adler :The current hash value.
 * @param {!(Array|Uint8Array)} array :The byte array to use for updating.
 * @return {number} Adler32 Hash value.
 */
Adler32.update = function(adler, array) {
  /** @type {number} */
  var s1 = adler & 0xffff;
  /** @type {number} */
  var s2 = (adler >>> 16) & 0xffff;
  /** @type {number} array length */
  var len = array.length;
  /** @type {number} loop length (don't overflow) */
  var tlen;
  /** @type {number} array index */
  var i = 0;

  while (len > 0) {
    tlen = len > Adler32.OptimizationParameter ?
      Adler32.OptimizationParameter : len;
    len -= tlen;
    do {
      s1 += array[i++];
      s2 += s1;
    } while (--tlen);

    s1 %= 65521;
    s2 %= 65521;
  }

  return ((s2 << 16) | s1) >>> 0;
};

/**
 * Adler32 Optimization parameters
 * Currently, 1024 is optimal.
 * @see http://jsperf.com/adler-32-simple-vs-optimized/3
 * @define {number}
 */
Adler32.OptimizationParameter = 1024;

