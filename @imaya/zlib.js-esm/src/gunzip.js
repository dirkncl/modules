/**
 * @fileoverview GZIP (RFC1952) Deployment container implementation.
 */
import { USE_TYPEDARRAY } from './hybrid.js'
import { Gzip } from './gzip.js'
import { RawInflate } from './rawinflate.js'
import { GunzipMember } from './gunzip_member.js'
import * as CRC32 from './crc32.js'

/**
 * @constructor
 * @param {!(Array|Uint8Array)} input input buffer.
 * @param {Object=} opt_params option parameters.
 */
export class Gunzip {
  constructor(input, opt_params) {
    /** @type {!(Array.<number>|Uint8Array)} input buffer. */
    this.input = input;
    /** @type {number} input buffer pointer. */
    this.ip = 0;
    /** @type {Array.<GunzipMember>} */
    this.member = [];
    /** @type {boolean} */
    this.decompressed = false;
  }
  
  /**
   * @return {Array.<GunzipMember>}
   */
  getMembers() {
    if (!this.decompressed) {
      this.decompress();
    }
  
    return this.member.slice();
  }
  
  /**
   * inflate gzip data.
   * @return {!(Array.<number>|Uint8Array)} inflated buffer.
   */
  decompress() {
    /** @type {number} input length. */
    var il = this.input.length;
  
    while (this.ip < il) {
      this.decodeMember();
    }
  
    this.decompressed = true;
  
    return this.concatMember();
  }
  
  /**
   * decode gzip member.
   */
  decodeMember() {
    /** @type {GunzipMember} */
    var member = new GunzipMember();
    /** @type {number} */
    var isize;
    /** @type {RawInflate} RawInflate implementation. */
    var rawinflate;
    /** @type {!(Array.<number>|Uint8Array)} inflated data. */
    var inflated;
    /** @type {number} inflate size */
    var inflen;
    /** @type {number} character code */
    var c;
    /** @type {number} character index in string. */
    var ci;
    /** @type {Array.<string>} character array. */
    var str;
    /** @type {number} modification time. */
    var mtime;
    /** @type {number} */
    var crc32;
  
    var input = this.input;
    var ip = this.ip;
  
    member.id1 = input[ip++];
    member.id2 = input[ip++];
  
    // check signature
    if (member.id1 !== 0x1f || member.id2 !== 0x8b) {
      throw new Error('invalid file signature:' + member.id1 + ',' + member.id2);
    }
  
    // check compression method
    member.cm = input[ip++];
    switch (member.cm) {
      case 8: /* XXX: use Zlib const */
        break;
      default:
        throw new Error('unknown compression method: ' + member.cm);
    }
  
    // flags
    member.flg = input[ip++];
  
    // modification time
    mtime = (input[ip++])       |
            (input[ip++] << 8)  |
            (input[ip++] << 16) |
            (input[ip++] << 24);
    member.mtime = new Date(mtime * 1000);
  
    // extra flags
    member.xfl = input[ip++];
  
    // operating system
    member.os = input[ip++];
  
    // extra
    if ((member.flg & Gzip.FlagsMask.FEXTRA) > 0) {
      member.xlen = input[ip++] | (input[ip++] << 8);
      ip = this.decodeSubField(ip, member.xlen);
    }
  
    // fname
    if ((member.flg & Gzip.FlagsMask.FNAME) > 0) {
      for(str = [], ci = 0; (c = input[ip++]) > 0;) {
        str[ci++] = String.fromCharCode(c);
      }
      member.name = str.join('');
    }
  
    // fcomment
    if ((member.flg & Gzip.FlagsMask.FCOMMENT) > 0) {
      for(str = [], ci = 0; (c = input[ip++]) > 0;) {
        str[ci++] = String.fromCharCode(c);
      }
      member.comment = str.join('');
    }
  
    // fhcrc
    if ((member.flg & Gzip.FlagsMask.FHCRC) > 0) {
      member.crc16 = CRC32.calc(input, 0, ip) & 0xffff;
      if (member.crc16 !== (input[ip++] | (input[ip++] << 8))) {
        throw new Error('invalid header crc16');
      }
    }
  
    // isize :If you get this in advance, you will know the size after expansion.
    // The buffer size for inflate processing is known in advance, making it faster.
    isize = (input[input.length - 4])       | (input[input.length - 3] << 8) |
            (input[input.length - 2] << 16) | (input[input.length - 1] << 24);
  
    // isize :Validity check
    // Since the Huffman code has a minimum of 2 bits, the maximum is 1/4.
    // In LZ77 code, a maximum of 258 bytes can be expressed with 2 bytes for length and distance, so
    // Let's say it becomes 1/128.
    // If the remaining input buffer is more than 512 times isize,
    // No buffer allocation of specified size will be performed.
    if (input.length - ip - /* CRC-32 */4 - /* ISIZE */4 < isize * 512) {
      inflen = isize;
    }
  
    // compressed block
    rawinflate = new RawInflate(input, {'index': ip, 'bufferSize': inflen});
    member.data = inflated = rawinflate.decompress();
    ip = rawinflate.ip;
  
    // crc32
    member.crc32 = crc32 =
      ((input[ip++])       | (input[ip++] << 8) |
       (input[ip++] << 16) | (input[ip++] << 24)) >>> 0;
    if (CRC32.calc(inflated) !== crc32) {
      throw new Error('invalid CRC-32 checksum: 0x' +
          CRC32.calc(inflated).toString(16) + ' / 0x' + crc32.toString(16));
    }
  
    // input size
    member.isize = isize =
      ((input[ip++])       | (input[ip++] << 8) |
       (input[ip++] << 16) | (input[ip++] << 24)) >>> 0;
    if ((inflated.length & 0xffffffff) !== isize) {
      throw new Error('invalid input size: ' +
          (inflated.length & 0xffffffff) + ' / ' + isize);
    }
  
    this.member.push(member);
    this.ip = ip;
  }
  
  /**
   * Subfield Decoding
   * XXX: Skip and do nothing for now
   */
  decodeSubField(ip, length) {
    return ip + length;
  }
  
  /**
   * @return {!(Array.<number>|Uint8Array)}
   */
  concatMember() {
    /** @type {Array.<GunzipMember>} */
    var member = this.member;
    /** @type {number} */
    var i;
    /** @type {number} */
    var il;
    /** @type {number} */
    var p = 0;
    /** @type {number} */
    var size = 0;
    /** @type {!(Array.<number>|Uint8Array)} */
    var buffer;
  
    for (i = 0, il = member.length; i < il; ++i) {
      size += member[i].data.length;
    }
  
    if (USE_TYPEDARRAY) {
      buffer = new Uint8Array(size);
      for (i = 0; i < il; ++i) {
        buffer.set(member[i].data, p);
        p += member[i].data.length;
      }
    } else {
      buffer = [];
      for (i = 0; i < il; ++i) {
        buffer[i] = member[i].data;
      }
      buffer = Array.prototype.concat.apply([], buffer);
    }
  
    return buffer;
  }

}
