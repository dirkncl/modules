/**
 * JavaScript Inflate Library
 *
 * The MIT License
 *
 * Copyright (c) 2012 imaya
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


//-----------------------------------------------------------------------------

/** @define {boolean} export symbols. */
//var ZLIBSTAT_INFLATE_EXPORT = false;

//-----------------------------------------------------------------------------

import { CompressionMethod } from './enum.js'
import { RawInflate } from './rawinflate.js'
import { Adler32 } from './adler32.js'

/**
 * @constructor
 * @param {!(Uint8Array|Array)} input deflated buffer.
 * @param {Object=} opt_params option parameters.
 *
 * opt_params You can specify the following properties:
 *   - index: The start position of the deflate container in the input buffer.
 *   - blockSize: The block size of the buffer.
 *   - verify: Whether to verify the adler-32 checksum after decompression.
 */
export class Inflate {
  constructor(input, opt_params) {
    /** @type {number} */
    var blockSize;
    /** @type {number} */
    var cmf;
    /** @type {number} */
    var flg;
  
    /** @type {!(Uint8Array|Array)} */
    this.input = input;
    /** @type {number} */
    this.ip = 0;
    /** @type {ZlibStat.RawInflate} */
    this.rawinflate;
    /** @type {(boolean|undefined)} verify flag. */
    this.verify;
  
    // option parameters
    if (opt_params) {
      if (opt_params.index) {
        this.ip = opt_params.index;
      }
      if (opt_params.blockSize) {
        blockSize = opt_params.blockSize;
      }
      if (opt_params.verify) {
        this.verify = opt_params.verify;
      }
    }
  
    // Compression Method and Flags
    cmf = input[this.ip++];
    flg = input[this.ip++];
  
    // compression method
    switch (cmf & 0x0f) {
      case CompressionMethod.DEFLATE:
        this.method = CompressionMethod.DEFLATE;
        break;
      default:
        throw new Error('unsupported compression method');
    }
  
    // fcheck
    if (((cmf << 8) + flg) % 31 !== 0) {
      throw new Error('invalid fcheck flag:' + ((cmf << 8) + flg) % 31);
    }
  
    // fdict (not supported)
    if (flg & 0x20) {
      throw new Error('fdict flag is not supported');
    }
  
    // RawInflate
    this.rawinflate = new RawInflate(input, {
      index: this.ip,
      blockSize: blockSize
    });
  }
  
  /**
   * decompress.
   * @return {!(Uint8Array|Array)} inflated buffer.
   */
  decompress() {
    /** @type {!(Array|Uint8Array)} input buffer. */
    var input = this.input;
    /** @type {!(Uint8Array|Array)} inflated buffer. */
    var buffer;
    /** @type {number} adler-32 checksum */
    var adler32;
  
    buffer = this.rawinflate.decompress();
    this.ip = this.rawinflate.ip;
  
    // verify adler-32
    adler32 = (
      (input[this.ip++] << 24) | (input[this.ip++] << 16) |
      (input[this.ip++] <<  8) | (input[this.ip++])
    ) >>> 0;
  
    if (adler32 !== Adler32(buffer)) {
      throw new Error('invalid adler-32 checksum');
    }
  
    return buffer;
  }
  
  /**
   * get deflate blocks.
   * @return {!Array} deflate blocks.
   */
  getBlocks() {
    return this.rawinflate.block;
  }
}

