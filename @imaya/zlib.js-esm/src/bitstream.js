/**
 * @fileoverview bit Implementation of writing in units.
 */

import { USE_TYPEDARRAY } from './hybrid.js'

/**
 * Bitstream
 * @constructor
 * @param {!(Array|Uint8Array)=} buffer output buffer.
 * @param {number=} bufferPosition start buffer pointer.
 */
export class BitStream {
  constructor(buffer, bufferPosition) {
    /** @type {number} buffer index. */
    this.index = typeof bufferPosition === 'number' ? bufferPosition : 0;
    /** @type {number} bit index. */
    this.bitindex = 0;
    /** @type {!(Array|Uint8Array)} bit-stream output buffer. */
    this.buffer = buffer instanceof (USE_TYPEDARRAY ? Uint8Array : Array) ?
      buffer :
      new (USE_TYPEDARRAY ? Uint8Array : Array)(BitStream.DefaultBlockSize);
  
    // If the input index is insufficient, expand it, but if doubling it doesn't work, it is invalid.
    if (this.buffer.length * 2 <= this.index) {
      throw new Error("invalid index");
    } else if (this.buffer.length <= this.index) {
      this.expandBuffer();
    }
  }
  
  /**
   * Default block size.
   * @const
   * @type {number}
   */
  static DefaultBlockSize = 0x8000;
  
  /**
   * expand buffer.
   * @return {!(Array|Uint8Array)} new buffer.
   */
  expandBuffer() {
    /** @type {!(Array|Uint8Array)} old buffer. */
    var oldbuf = this.buffer;
    /** @type {number} loop counter. */
    var i;
    /** @type {number} loop limiter. */
    var il = oldbuf.length;
    /** @type {!(Array|Uint8Array)} new buffer. */
    var buffer =
      new (USE_TYPEDARRAY ? Uint8Array : Array)(il << 1);
  
    // copy buffer
    if (USE_TYPEDARRAY) {
      buffer.set(oldbuf);
    } else {
      // XXX: loop unrolling
      for (i = 0; i < il; ++i) {
        buffer[i] = oldbuf[i];
      }
    }
  
    return (this.buffer = buffer);
  }
  
  
  /**
  * Writes a number with the number of bits specified.
  * @param {number} number    The number to write.
  * @param {number} n         The number of bits to write.
  * @param {boolean=} reverse True if writing in reverse order.
  */
  writeBits(number, n, reverse) {
    var buffer = this.buffer;
    var index = this.index;
    var bitindex = this.bitindex;
  
    /** @type {number} current octet. */
    var current = buffer[index];
    /** @type {number} loop counter. */
    var i;
  
    /**
     * 32-bit Reverse the bit order of an integer
     * @param {number} n 32-bit integer.
     * @return {number} reversed 32-bit integer.
     * @private
     */
    function rev32_(n) {
      return (BitStream.ReverseTable[n & 0xFF] << 24) |
        (BitStream.ReverseTable[n >>> 8 & 0xFF] << 16) |
        (BitStream.ReverseTable[n >>> 16 & 0xFF] << 8) |
        BitStream.ReverseTable[n >>> 24 & 0xFF];
    }
  
    if (reverse && n > 1) {
      number = n > 8 ?
        rev32_(number) >> (32 - n) :
        BitStream.ReverseTable[number] >> (8 - n);
    }
  
    // Byte When not crossing the boundary
    if (n + bitindex < 8) {
      current = (current << n) | number;
      bitindex += n;
    // Byte When you cross the border
    } else {
      for (i = 0; i < n; ++i) {
        current = (current << 1) | ((number >> n - i - 1) & 1);
  
        // next byte
        if (++bitindex === 8) {
          bitindex = 0;
          buffer[index++] = BitStream.ReverseTable[current];
          current = 0;
  
          // expand
          if (index === buffer.length) {
            buffer = this.expandBuffer();
          }
        }
      }
    }
    buffer[index] = current;
  
    this.buffer = buffer;
    this.bitindex = bitindex;
    this.index = index;
  }
  
  
  /**
   * Terminates the stream
   * @return {!(Array|Uint8Array)} Returns the terminated buffer as a byte array.
   */
  finish() {
    var buffer = this.buffer;
    var index = this.index;
  
    /** @type {!(Array|Uint8Array)} output buffer. */
    var output;
  
    // bitindex :When it is 0, the index is advanced extra.
    if (this.bitindex > 0) {
      buffer[index] <<= 8 - this.bitindex;
      buffer[index] = BitStream.ReverseTable[buffer[index]];
      index++;
    }
  
    // array truncation
    if (USE_TYPEDARRAY) {
      output = buffer.subarray(0, index);
    } else {
      buffer.length = index;
      output = buffer;
    }
  
    return output;
  }
  
  /**
   * 0-255 The bit order of
   * @const
   * @type {!(Uint8Array|Array.<number>)}
   */
  static get ReverseTable() {
    return table();
    
    function table() {
      /** @type {!(Array|Uint8Array)} reverse table. */
      var table = new (USE_TYPEDARRAY ? Uint8Array : Array)(256);
      /** @type {number} loop counter. */
      var i;
    
      // generate
      for (i = 0; i < 256; ++i) {
        table[i] = generateTable(i)
      };
      function generateTable(n) {
        var r = n;
        var s = 7;
    
        for (n >>>= 1; n; n >>>= 1) {
          r <<= 1;
          r |= n & 1;
          --s;
        }
    
        return (r << s & 0xff) >>> 0;
      }
    
      return table;
    }
  }
}
