import { USE_TYPEDARRAY } from './hybrid.js'
import { CompressionMethod } from './enum.js'
import { RawInflateStream } from './rawinflate_stream.js'

/**
 * @param {!(Uint8Array|Array)} input deflated buffer.
 * @constructor
 */
export class InflateStream {
  
  constructor(input) {
    /** @type {!(Uint8Array|Array)} */
    this.input = input === void 0 ? new (USE_TYPEDARRAY ? Uint8Array : Array)() : input;
    /** @type {number} */
    this.ip = 0;
    /** @type {RawInflateStream} */
    this.rawinflate = new RawInflateStream(this.input, this.ip);
    /** @type {CompressionMethod} */
    this.method;
    /** @type {!(Array|Uint8Array)} */
    this.output = this.rawinflate.output;
  }
  
  /**
   * decompress.
   * @return {!(Uint8Array|Array)} inflated buffer.
   */
  decompress(input) {
    /** @type {!(Uint8Array|Array)} inflated buffer. */
    var buffer;
    /** @type {number} adler-32 checksum */
    var adler32;
  
    //Attaching new input to the input buffer
    // XXX Check whether to check Array, Uint8Array
    if (input !== void 0) {
      if (USE_TYPEDARRAY) {
        var tmp = new Uint8Array(this.input.length + input.length);
        tmp.set(this.input, 0);
        tmp.set(input, this.input.length);
        this.input = tmp;
      } else {
        this.input = this.input.concat(input);
      }
    }
  
    if (this.method === void 0) {
      if(this.readHeader() < 0) {
        return new (USE_TYPEDARRAY ? Uint8Array : Array)();
      }
    }
  
    buffer = this.rawinflate.decompress(this.input, this.ip);
    if (this.rawinflate.ip !== 0) {
      this.input = USE_TYPEDARRAY ?
        this.input.subarray(this.rawinflate.ip) :
        this.input.slice(this.rawinflate.ip);
      this.ip = 0;
    }
  
    // verify adler-32
    /*
    if (this.verify) {
      adler32 =
        input[this.ip++] << 24 | input[this.ip++] << 16 |
        input[this.ip++] << 8 | input[this.ip++];
  
      if (adler32 !== Adler32(buffer)) {
        throw new Error('invalid adler-32 checksum');
      }
    }
    */
  
    return buffer;
  }
  
  readHeader() {
    var ip = this.ip;
    var input = this.input;
  
    // Compression Method and Flags
    var cmf = input[ip++];
    var flg = input[ip++];
  
    if (cmf === void 0 || flg === void 0) {
      return -1;
    }
  
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
  
    this.ip = ip;
  }

}
