/**
 * zlib.adler32.js
 *
 * The MIT License
 *
 * Copyright (c) 2011 imaya
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/**
 * @fileoverview Adler32 checksum implementation.
 */

import * as Util from './util.js'

/**
 * Adler32 Creating a hash value
 * @param {!(Array|Uint8Array|string)} array :The byte array to use for the calculation.
 * @return {number} Adler32 hash value.
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
 * @const
 * @type {number}
 */
Adler32.OptimizationParameter = 1024;

