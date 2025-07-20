/**
 * @fileoverview Implements Deflate (RFC1951).
 * The Deflate algorithm itself is implemented in RawDeflate.
 */
import { USE_TYPEDARRAY } from './hybrid.js'
import { CompressionMethod } from './enum.js'
import { Adler32 } from './adler32.js'
import { RawDeflate } from './rawdeflate.js'

/**
 * Deflate
 * @constructor
 * @param {!(Array|Uint8Array)} input :The byte array to encode.
 * @param {Object=} opt_params option parameters.
 */
export class Deflate {
  
  constructor(input, opt_params) {
    /** @type {!(Array|Uint8Array)} */
    this.input = input;
    /** @type {!(Array|Uint8Array)} */
    this.output =
      new (USE_TYPEDARRAY ? Uint8Array : Array)(Deflate.DefaultBufferSize);
    /** @type {Deflate.CompressionType} */
    this.compressionType = Deflate.CompressionType.DYNAMIC;
    /** @type {RawDeflate} */
    this.rawDeflate;
    /** @type {Object} */
    var rawDeflateOption = {};
    /** @type {string} */
    var prop;
  
    // option parameters
    if (opt_params || !(opt_params = {})) {
      if (typeof opt_params['compressionType'] === 'number') {
        this.compressionType = opt_params['compressionType'];
      }
    }
  
    // copy options
    for (prop in opt_params) {
      rawDeflateOption[prop] = opt_params[prop];
    }
  
    // set raw-deflate output buffer
    rawDeflateOption['outputBuffer'] = this.output;
  
    this.rawDeflate = new RawDeflate(this.input, rawDeflateOption);
  }
  
  /**
   * @const
   * @type {number} The default buffer size.
   */
  static DefaultBufferSize = 0x8000
  
  /**
   * @enum {number}
   */
  static CompressionType = RawDeflate.CompressionType
  
  /**
   * Directly subjected to compression.
   * @param {!(Array|Uint8Array)} input target buffer.
   * @param {Object=} opt_params option parameters.
   * @return {!(Array|Uint8Array)} compressed data byte array.
   */
  static compress(input, opt_params) {
    return (new Deflate(input, opt_params)).compress();
  }
  
  /**
   * Deflate Compression.
   * @return {!(Array|Uint8Array)} compressed data byte array.
   */
  compress() {
    /** @type {CompressionMethod} */
    var cm;
    /** @type {number} */
    var cinfo;
    /** @type {number} */
    var cmf;
    /** @type {number} */
    var flg;
    /** @type {number} */
    var fcheck;
    /** @type {number} */
    var fdict;
    /** @type {number} */
    var flevel;
    /** @type {number} */
    var clevel;
    /** @type {number} */
    var adler;
    /** @type {boolean} */
    var error = false;
    /** @type {!(Array|Uint8Array)} */
    var output;
    /** @type {number} */
    var pos = 0;
  
    output = this.output;
  
    // Compression Method and Flags
    cm = CompressionMethod.DEFLATE;
    switch (cm) {
      case CompressionMethod.DEFLATE:
        cinfo = Math.LOG2E * Math.log(RawDeflate.WindowSize) - 8;
        break;
      default:
        throw new Error('invalid compression method');
    }
    cmf = (cinfo << 4) | cm;
    output[pos++] = cmf;
  
    // Flags
    fdict = 0;
    switch (cm) {
      case CompressionMethod.DEFLATE:
        switch (this.compressionType) {
          case Deflate.CompressionType.NONE: flevel = 0; break;
          case Deflate.CompressionType.FIXED: flevel = 1; break;
          case Deflate.CompressionType.DYNAMIC: flevel = 2; break;
          default: throw new Error('unsupported compression type');
        }
        break;
      default:
        throw new Error('invalid compression method');
    }
    flg = (flevel << 6) | (fdict << 5);
    fcheck = 31 - (cmf * 256 + flg) % 31;
    flg |= fcheck;
    output[pos++] = flg;
  
    // Adler-32 checksum
    adler = Adler32(this.input);
  
    this.rawDeflate.op = pos;
    output = this.rawDeflate.compress();
    pos = output.length;
  
    if (USE_TYPEDARRAY) {
      // Revert subarray
      output = new Uint8Array(output.buffer);
      // expand buffer
      if (output.length <= pos + 4) {
        this.output = new Uint8Array(output.length + 4);
        this.output.set(output);
        output = this.output;
      }
      output = output.subarray(0, pos + 4);
    }
  
    // adler32
    output[pos++] = (adler >> 24) & 0xff;
    output[pos++] = (adler >> 16) & 0xff;
    output[pos++] = (adler >>  8) & 0xff;
    output[pos++] = (adler      ) & 0xff;
  
    return output;
  }

}
