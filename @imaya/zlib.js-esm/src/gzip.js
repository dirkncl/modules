/**
 * @fileoverview GZIP (RFC1952) implementation.
 */
import { USE_TYPEDARRAY } from './hybrid.js'
import { RawDeflate } from './rawdeflate.js'
import * as CRC32 from './crc32.js'

/**
 * @constructor
 * @param {!(Array|Uint8Array)} input input buffer.
 * @param {Object=} opt_params option parameters.
 */
export class Gzip {
  constructor(input, opt_params) {
    /** @type {!(Array.<number>|Uint8Array)} input buffer. */
    this.input = input;
    /** @type {number} input buffer pointer. */
    this.ip = 0;
    /** @type {!(Array.<number>|Uint8Array)} output buffer. */
    this.output;
    /** @type {number} output buffer. */
    this.op = 0;
    /** @type {!Object} flags option flags. */
    this.flags = {};
    /** @type {!string} filename. */
    this.filename;
    /** @type {!string} comment. */
    this.comment;
    /** @type {!Object} deflate options. */
    this.deflateOptions;
  
    // option parameters
    if (opt_params) {
      if (opt_params['flags']) {
        this.flags = opt_params['flags'];
      }
      if (typeof opt_params['filename'] === 'string') {
        this.filename = opt_params['filename'];
      }
      if (typeof opt_params['comment'] === 'string') {
        this.comment = opt_params['comment'];
      }
      if (opt_params['deflateOptions']) {
        this.deflateOptions = opt_params['deflateOptions'];
      }
    }
  
    if (!this.deflateOptions) {
      this.deflateOptions = {};
    }
  }
  
  /**
   * @type {number}
   * @const
   */
  static DefaultBufferSize = 0x8000
  
  /**
   * encode gzip members.
   * @return {!(Array|Uint8Array)} gzip binary array.
   */
  compress() {
    /** @type {number} flags. */
    var flg;
    /** @type {number} modification time. */
    var mtime;
    /** @type {number} CRC-16 value for FHCRC flag. */
    var crc16;
    /** @type {number} CRC-32 value for verification. */
    var crc32;
    /** @type {!RawDeflate} raw deflate object. */
    var rawdeflate;
    /** @type {number} character code */
    var c;
    /** @type {number} loop counter. */
    var i;
    /** @type {number} loop limiter. */
    var il;
    /** @type {!(Array|Uint8Array)} output buffer. */
    var output =
      new (USE_TYPEDARRAY ? Uint8Array : Array)(Gzip.DefaultBufferSize);
    /** @type {number} output buffer pointer. */
    var op = 0;
  
    var input = this.input;
    var ip = this.ip;
    var filename = this.filename;
    var comment = this.comment;
  
    // check signature
    output[op++] = 0x1f;
    output[op++] = 0x8b;
  
    // check compression method
    output[op++] = 8; /* XXX: use Zlib const */
  
    // flags
    flg = 0;
    if (this.flags['fname'])    flg |= Gzip.FlagsMask.FNAME;
    if (this.flags['fcomment']) flg |= Gzip.FlagsMask.FCOMMENT;
    if (this.flags['fhcrc'])    flg |= Gzip.FlagsMask.FHCRC;
    // XXX: FTEXT
    // XXX: FEXTRA
    output[op++] = flg;
  
    // modification time
    mtime = (Date.now ? Date.now() : +new Date()) / 1000 | 0;
    output[op++] = mtime        & 0xff;
    output[op++] = mtime >>>  8 & 0xff;
    output[op++] = mtime >>> 16 & 0xff;
    output[op++] = mtime >>> 24 & 0xff;
  
    // extra flags
    output[op++] = 0;
  
    // operating system
    output[op++] = Gzip.OperatingSystem.UNKNOWN;
  
    // extra
    /* NOP */
  
    // fname
    if (this.flags['fname'] !== void 0) {
      for (i = 0, il = filename.length; i < il; ++i) {
        c = filename.charCodeAt(i);
        if (c > 0xff) { output[op++] = (c >>> 8) & 0xff; }
        output[op++] = c & 0xff;
      }
      output[op++] = 0; // null termination
    }
  
    // fcomment
    if (this.flags['comment']) {
      for (i = 0, il = comment.length; i < il; ++i) {
        c = comment.charCodeAt(i);
        if (c > 0xff) { output[op++] = (c >>> 8) & 0xff; }
        output[op++] = c & 0xff;
      }
      output[op++] = 0; // null termination
    }
  
    // fhcrc
    if (this.flags['fhcrc']) {
      crc16 = CRC32.calc(output, 0, op) & 0xffff;
      output[op++] = (crc16      ) & 0xff;
      output[op++] = (crc16 >>> 8) & 0xff;
    }
  
    // add compress option
    this.deflateOptions['outputBuffer'] = output;
    this.deflateOptions['outputIndex'] = op;
  
    // compress
    rawdeflate = new RawDeflate(input, this.deflateOptions);
    output = rawdeflate.compress();
    op = rawdeflate.op;
  
    // expand buffer
    if (USE_TYPEDARRAY) {
      if (op + 8 > output.buffer.byteLength) {
        this.output = new Uint8Array(op + 8);
        this.output.set(new Uint8Array(output.buffer));
        output = this.output;
      } else {
        output = new Uint8Array(output.buffer);
      }
    }
  
    // crc32
    crc32 = CRC32.calc(input);
    output[op++] = (crc32       ) & 0xff;
    output[op++] = (crc32 >>>  8) & 0xff;
    output[op++] = (crc32 >>> 16) & 0xff;
    output[op++] = (crc32 >>> 24) & 0xff;
  
    // input size
    il = input.length;
    output[op++] = (il       ) & 0xff;
    output[op++] = (il >>>  8) & 0xff;
    output[op++] = (il >>> 16) & 0xff;
    output[op++] = (il >>> 24) & 0xff;
  
    this.ip = ip;
  
    if (USE_TYPEDARRAY && op < output.length) {
      this.output = output = output.subarray(0, op);
    }
  
    return output;
  }
  
  /** @enum {number} */
  static OperatingSystem = {
    FAT: 0,
    AMIGA: 1,
    VMS: 2,
    UNIX: 3,
    VM_CMS: 4,
    ATARI_TOS: 5,
    HPFS: 6,
    MACINTOSH: 7,
    Z_SYSTEM: 8,
    CP_M: 9,
    TOPS_20: 10,
    NTFS: 11,
    QDOS: 12,
    ACORN_RISCOS: 13,
    UNKNOWN: 255
  }
  
  /** @enum {number} */
  static FlagsMask = {
    FTEXT: 0x01,
    FHCRC: 0x02,
    FEXTRA: 0x04,
    FNAME: 0x08,
    FCOMMENT: 0x10
  }

}
