/**
 * @fileoverview Deflate (RFC1951) Encoding algorithm implementation.
 */

import { USE_TYPEDARRAY } from './hybrid.js'
import { BitStream } from './bitstream.js'
import { Heap } from './heap.js'

/**
 * Raw Deflate :implementation
 *
 * @constructor
 * @param {!(Array.<number>|Uint8Array)} input The buffer to be encoded.
 * @param {Object=} opt_params option parameters.
 *
 * When typed arrays are available, the outputBuffer is automatically converted to a Uint8Array.
 * will be converted.
 * Since it is a different object, variables that refer to the output buffer, etc.
 * Needs updating.
 */
export class RawDeflate {
  constructor(input, opt_params) {
    /** @type {RawDeflate.CompressionType} */
    this.compressionType = RawDeflate.CompressionType.DYNAMIC;
    /** @type {number} */
    this.lazy = 0;
    /** @type {!(Array.<number>|Uint32Array)} */
    this.freqsLitLen;
    /** @type {!(Array.<number>|Uint32Array)} */
    this.freqsDist;
    /** @type {!(Array.<number>|Uint8Array)} */
    this.input =
      (USE_TYPEDARRAY && input instanceof Array) ? new Uint8Array(input) : input;
    /** @type {!(Array.<number>|Uint8Array)} output output buffer. */
    this.output;
    /** @type {number} pos output buffer position. */
    this.op = 0;
  
    // option parameters
    if (opt_params) {
      if (opt_params['lazy']) {
        this.lazy = opt_params['lazy'];
      }
      if (typeof opt_params['compressionType'] === 'number') {
        this.compressionType = opt_params['compressionType'];
      }
      if (opt_params['outputBuffer']) {
        this.output =
          (USE_TYPEDARRAY && opt_params['outputBuffer'] instanceof Array) ?
          new Uint8Array(opt_params['outputBuffer']) : opt_params['outputBuffer'];
      }
      if (typeof opt_params['outputIndex'] === 'number') {
        this.op = opt_params['outputIndex'];
      }
    }
  
    if (!this.output) {
      this.output = new (USE_TYPEDARRAY ? Uint8Array : Array)(0x8000);
    }
  }
  
  /**
   * @enum {number}
   */
  static CompressionType = {
    NONE: 0,
    FIXED: 1,
    DYNAMIC: 2,
    RESERVED: 3
  }
  
  
  /**
   * LZ77 Minimum match length of
   * @const
   * @type {number}
   */
  static Lz77MinLength = 3
  
  /**
   * LZ77 Maximum match length of
   * @const
   * @type {number}
   */
  static Lz77MaxLength = 258
  
  /**
   * LZ77 Window size
   * @const
   * @type {number}
   */
  static WindowSize = 0x8000
  
  /**
   * The longest code length
   * @const
   * @type {number}
   */
  static MaxCodeLength = 16
  
  /**
   * Maximum Huffman code value
   * @const
   * @type {number}
   */
  static HUFMAX = 286
  
  /**
   * Fixed Huffman Code Encoding Table
   * @const
   * @type {Array.<Array.<number, number>>}
   */
  static get FixedHuffmanTable() {
    var table = [], i;
  
    for (i = 0; i < 288; i++) {
      switch (true) {
        case (i <= 143): table.push([i       + 0x030, 8]); break;
        case (i <= 255): table.push([i - 144 + 0x190, 9]); break;
        case (i <= 279): table.push([i - 256 + 0x000, 7]); break;
        case (i <= 287): table.push([i - 280 + 0x0C0, 8]); break;
        default:
          throw 'invalid literal: ' + i;
      }
    }
  
    return table;
  }
  
  /**
   * DEFLATE Creating Blocks
   * @return {!(Array.<number>|Uint8Array)} Compressed byte array.
   */
  compress() {
    /** @type {!(Array.<number>|Uint8Array)} */
    var blockArray;
    /** @type {number} */
    var position;
    /** @type {number} */
    var length;
  
    var input = this.input;
  
    // compression
    switch (this.compressionType) {
      case RawDeflate.CompressionType.NONE:
        // each 65535-Byte (length header: 16-bit)
        for (position = 0, length = input.length; position < length;) {
          blockArray = USE_TYPEDARRAY ?
            input.subarray(position, position + 0xffff) :
            input.slice(position, position + 0xffff);
          position += blockArray.length;
          this.makeNocompressBlock(blockArray, (position === length));
        }
        break;
      case RawDeflate.CompressionType.FIXED:
        this.output = this.makeFixedHuffmanBlock(input, true);
        this.op = this.output.length;
        break;
      case RawDeflate.CompressionType.DYNAMIC:
        this.output = this.makeDynamicHuffmanBlock(input, true);
        this.op = this.output.length;
        break;
      default:
        throw 'invalid compression type';
    }
  
    return this.output;
  }
  
  /**
   * Creating Uncompressed Blocks
   * @param {!(Array.<number>|Uint8Array)} blockArray Block data byte array.
   * @param {!boolean} isFinalBlock True if this is the last block.
   * @return {!(Array.<number>|Uint8Array)} Uncompressed block byte array.
   */
  makeNocompressBlock(blockArray, isFinalBlock) {
    /** @type {number} */
    var bfinal;
    /** @type {RawDeflate.CompressionType} */
    var btype;
    /** @type {number} */
    var len;
    /** @type {number} */
    var nlen;
    /** @type {number} */
    var i;
    /** @type {number} */
    var il;
  
    var output = this.output;
    var op = this.op;
  
    // expand buffer
    if (USE_TYPEDARRAY) {
      output = new Uint8Array(this.output.buffer);
      while (output.length <= op + blockArray.length + 5) {
        output = new Uint8Array(output.length << 1);
      }
      output.set(this.output);
    }
  
    // header
    bfinal = isFinalBlock ? 1 : 0;
    btype = RawDeflate.CompressionType.NONE;
    output[op++] = (bfinal) | (btype << 1);
  
    // length
    len = blockArray.length;
    nlen = (~len + 0x10000) & 0xffff;
    output[op++] =          len & 0xff;
    output[op++] =  (len >>> 8) & 0xff;
    output[op++] =         nlen & 0xff;
    output[op++] = (nlen >>> 8) & 0xff;
  
    // copy buffer
    if (USE_TYPEDARRAY) {
       output.set(blockArray, op);
       op += blockArray.length;
       output = output.subarray(0, op);
    } else {
      for (i = 0, il = blockArray.length; i < il; ++i) {
        output[op++] = blockArray[i];
      }
      output.length = op;
    }
  
    this.op = op;
    this.output = output;
  
    return output;
  }
  
  /**
   * Creating a fixed Huffman block
   * @param {!(Array.<number>|Uint8Array)} blockArray :Block data byte array.
   * @param {!boolean} isFinalBlock :True if this is the last block.
   * @return {!(Array.<number>|Uint8Array)} Fixed Huffman coded block byte array.
   */
  makeFixedHuffmanBlock(blockArray, isFinalBlock) {
    /** @type {BitStream} */
    var stream = new BitStream(USE_TYPEDARRAY ?
      new Uint8Array(this.output.buffer) : this.output, this.op);
    /** @type {number} */
    var bfinal;
    /** @type {RawDeflate.CompressionType} */
    var btype;
    /** @type {!(Array.<number>|Uint16Array)} */
    var data;
  
    // header
    bfinal = isFinalBlock ? 1 : 0;
    btype = RawDeflate.CompressionType.FIXED;
  
    stream.writeBits(bfinal, 1, true);
    stream.writeBits(btype, 2, true);
  
    data = this.lz77(blockArray);
    this.fixedHuffman(data, stream);
  
    return stream.finish();
  }
  
  /**
   * Dynamic Huffman Block Creation
   * @param {!(Array.<number>|Uint8Array)} blockArray :Block data byte array.
   * @param {!boolean} isFinalBlock :True if this is the last block.
   * @return {!(Array.<number>|Uint8Array)} Dynamic Huffman code block byte array.
   */
  makeDynamicHuffmanBlock(blockArray, isFinalBlock) {
    /** @type {BitStream} */
    var stream = new BitStream(USE_TYPEDARRAY ?
      new Uint8Array(this.output.buffer) : this.output, this.op);
    /** @type {number} */
    var bfinal;
    /** @type {RawDeflate.CompressionType} */
    var btype;
    /** @type {!(Array.<number>|Uint16Array)} */
    var data;
    /** @type {number} */
    var hlit;
    /** @type {number} */
    var hdist;
    /** @type {number} */
    var hclen;
    /** @const @type {Array.<number>} */
    var hclenOrder =
          [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];
    /** @type {!(Array.<number>|Uint8Array)} */
    var litLenLengths;
    /** @type {!(Array.<number>|Uint16Array)} */
    var litLenCodes;
    /** @type {!(Array.<number>|Uint8Array)} */
    var distLengths;
    /** @type {!(Array.<number>|Uint16Array)} */
    var distCodes;
    /** @type {{
     *   codes: !(Array.<number>|Uint32Array),
     *   freqs: !(Array.<number>|Uint8Array)
     * }} */
    var treeSymbols;
    /** @type {!(Array.<number>|Uint8Array)} */
    var treeLengths;
    /** @type {Array} */
    var transLengths = new Array(19);
    /** @type {!(Array.<number>|Uint16Array)} */
    var treeCodes;
    /** @type {number} */
    var code;
    /** @type {number} */
    var bitlen;
    /** @type {number} */
    var i;
    /** @type {number} */
    var il;
  
    // header
    bfinal = isFinalBlock ? 1 : 0;
    btype = RawDeflate.CompressionType.DYNAMIC;
  
    stream.writeBits(bfinal, 1, true);
    stream.writeBits(btype, 2, true);
  
    data = this.lz77(blockArray);
  
    // Literal length, Huffman code of distance and code length calculation
    litLenLengths = this.getLengths_(this.freqsLitLen, 15);
    litLenCodes = this.getCodesFromLengths_(litLenLengths);
    distLengths = this.getLengths_(this.freqsDist, 7);
    distCodes = this.getCodesFromLengths_(distLengths);
  
    // Determination of HLIT and HDIST
    for (hlit = 286; hlit > 257 && litLenLengths[hlit - 1] === 0; hlit--) {}
    for (hdist = 30; hdist > 1 && distLengths[hdist - 1] === 0; hdist--) {}
  
    // HCLEN
    treeSymbols = this.getTreeSymbols_(hlit, litLenLengths, hdist, distLengths);
    treeLengths = this.getLengths_(treeSymbols.freqs, 7);
    for (i = 0; i < 19; i++) {
      transLengths[i] = treeLengths[hclenOrder[i]];
    }
    for (hclen = 19; hclen > 4 && transLengths[hclen - 1] === 0; hclen--) {}
  
    treeCodes = this.getCodesFromLengths_(treeLengths);
  
    // output
    stream.writeBits(hlit - 257, 5, true);
    stream.writeBits(hdist - 1, 5, true);
    stream.writeBits(hclen - 4, 4, true);
    for (i = 0; i < hclen; i++) {
      stream.writeBits(transLengths[i], 3, true);
    }
  
    // Tree Output
    for (i = 0, il = treeSymbols.codes.length; i < il; i++) {
      code = treeSymbols.codes[i];
  
      stream.writeBits(treeCodes[code], treeLengths[code], true);
  
      // extra bits
      if (code >= 16) {
        i++;
        switch (code) {
          case 16: bitlen = 2; break;
          case 17: bitlen = 3; break;
          case 18: bitlen = 7; break;
          default:
            throw 'invalid code: ' + code;
        }
  
        stream.writeBits(treeSymbols.codes[i], bitlen, true);
      }
    }
  
    this.dynamicHuffman(
      data,
      [litLenCodes, litLenLengths],
      [distCodes, distLengths],
      stream
    );
  
    return stream.finish();
  }
  
  
  /**
   * Dynamic Huffman Coding (Custom Huffman Tables)
   * @param {!(Array.<number>|Uint16Array)} dataArray LZ77 :An encoded byte array.
   * @param {!BitStream} stream :Bitstream for writing.
   * @return {!BitStream} A Huffman encoded bitstream object.
   */
  dynamicHuffman(dataArray, litLen, dist, stream) {
    /** @type {number} */
    var index;
    /** @type {number} */
    var length;
    /** @type {number} */
    var literal;
    /** @type {number} */
    var code;
    /** @type {number} */
    var litLenCodes;
    /** @type {number} */
    var litLenLengths;
    /** @type {number} */
    var distCodes;
    /** @type {number} */
    var distLengths;
  
    litLenCodes = litLen[0];
    litLenLengths = litLen[1];
    distCodes = dist[0];
    distLengths = dist[1];
  
    // Write the code to the BitStream
    for (index = 0, length = dataArray.length; index < length; ++index) {
      literal = dataArray[index];
  
      // literal or length
      stream.writeBits(litLenCodes[literal], litLenLengths[literal], true);
  
      // Length/distance code
      if (literal > 256) {
        // length extra
        stream.writeBits(dataArray[++index], dataArray[++index], true);
        // distance
        code = dataArray[++index];
        stream.writeBits(distCodes[code], distLengths[code], true);
        // distance extra
        stream.writeBits(dataArray[++index], dataArray[++index], true);
      // termination
      } else if (literal === 256) {
        break;
      }
    }
  
    return stream;
  }
  
  /**
   * Fixed Huffman Coding
   * @param {!(Array.<number>|Uint16Array)} dataArray LZ77 :An encoded byte array.
   * @param {!BitStream} stream :Bitstream for writing.
   * @return {!BitStream} A Huffman encoded bitstream object.
   */
  fixedHuffman(dataArray, stream) {
    /** @type {number} */
    var index;
    /** @type {number} */
    var length;
    /** @type {number} */
    var literal;
  
    // Write the code to the BitStream
    for (index = 0, length = dataArray.length; index < length; index++) {
      literal = dataArray[index];
  
      // Write the code
      BitStream.prototype.writeBits.apply(
        stream,
        RawDeflate.FixedHuffmanTable[literal]
      );
  
      // Length/distance code
      if (literal > 0x100) {
        // length extra
        stream.writeBits(dataArray[++index], dataArray[++index], true);
        // distance
        stream.writeBits(dataArray[++index], 5);
        // distance extra
        stream.writeBits(dataArray[++index], dataArray[++index], true);
      // termination
      } else if (literal === 0x100) {
        break;
      }
    }
  
    return stream;
  }
  
  /**
   * Match Information
   * @param {!number} length :Matched length.
   * @param {!number} backwardDistance :Distance to match position.
   * @constructor
   */
  static Lz77Match = class {
    constructor(length, backwardDistance) {
      /** @type {number} match length. */
      this.length = length;
      /** @type {number} backward distance. */
      this.backwardDistance = backwardDistance;
    }
    
    /**
     * Length code table.
     * It is an array of [code, extension bit, extension bit length].
     * @const
     * @type {!(Array.<number>|Uint32Array)}
     */
    static get LengthCodeTable() {
      var table = genTable();
      return USE_TYPEDARRAY ? new Uint32Array(table) : table;
      
      function genTable() {
        /** @type {!Array} */
        var table = [];
        /** @type {number} */
        var i;
        /** @type {!Array.<number>} */
        var c;
      
        for (i = 3; i <= 258; i++) {
          c = code(i);
          table[i] = (c[2] << 24) | (c[1] << 16) | c[0];
        }
      
        /**
         * @param {number} length lz77 length.
         * @return {!Array.<number>} lz77 codes.
         */
        function code(length) {
          switch (true) {
            case (length === 3): return [257, length - 3, 0]; break;
            case (length === 4): return [258, length - 4, 0]; break;
            case (length === 5): return [259, length - 5, 0]; break;
            case (length === 6): return [260, length - 6, 0]; break;
            case (length === 7): return [261, length - 7, 0]; break;
            case (length === 8): return [262, length - 8, 0]; break;
            case (length === 9): return [263, length - 9, 0]; break;
            case (length === 10): return [264, length - 10, 0]; break;
            case (length <= 12): return [265, length - 11, 1]; break;
            case (length <= 14): return [266, length - 13, 1]; break;
            case (length <= 16): return [267, length - 15, 1]; break;
            case (length <= 18): return [268, length - 17, 1]; break;
            case (length <= 22): return [269, length - 19, 2]; break;
            case (length <= 26): return [270, length - 23, 2]; break;
            case (length <= 30): return [271, length - 27, 2]; break;
            case (length <= 34): return [272, length - 31, 2]; break;
            case (length <= 42): return [273, length - 35, 3]; break;
            case (length <= 50): return [274, length - 43, 3]; break;
            case (length <= 58): return [275, length - 51, 3]; break;
            case (length <= 66): return [276, length - 59, 3]; break;
            case (length <= 82): return [277, length - 67, 4]; break;
            case (length <= 98): return [278, length - 83, 4]; break;
            case (length <= 114): return [279, length - 99, 4]; break;
            case (length <= 130): return [280, length - 115, 4]; break;
            case (length <= 162): return [281, length - 131, 5]; break;
            case (length <= 194): return [282, length - 163, 5]; break;
            case (length <= 226): return [283, length - 195, 5]; break;
            case (length <= 257): return [284, length - 227, 5]; break;
            case (length === 258): return [285, length - 258, 0]; break;
            default: throw 'invalid length: ' + length;
          }
        }
      
        return table;
      }
    }
    
    /**
     * Distance Code Table
     * @param {!number} dist :distance.
     * @return {!Array.<number>} An array of code, extension bit, and extension bit length.
     * @private
     */
    getDistanceCode_(dist) {
      /** @type {!Array.<number>} distance code table. */
      var r;
    
      switch (true) {
        case (dist === 1): r = [0, dist - 1, 0]; break;
        case (dist === 2): r = [1, dist - 2, 0]; break;
        case (dist === 3): r = [2, dist - 3, 0]; break;
        case (dist === 4): r = [3, dist - 4, 0]; break;
        case (dist <= 6): r = [4, dist - 5, 1]; break;
        case (dist <= 8): r = [5, dist - 7, 1]; break;
        case (dist <= 12): r = [6, dist - 9, 2]; break;
        case (dist <= 16): r = [7, dist - 13, 2]; break;
        case (dist <= 24): r = [8, dist - 17, 3]; break;
        case (dist <= 32): r = [9, dist - 25, 3]; break;
        case (dist <= 48): r = [10, dist - 33, 4]; break;
        case (dist <= 64): r = [11, dist - 49, 4]; break;
        case (dist <= 96): r = [12, dist - 65, 5]; break;
        case (dist <= 128): r = [13, dist - 97, 5]; break;
        case (dist <= 192): r = [14, dist - 129, 6]; break;
        case (dist <= 256): r = [15, dist - 193, 6]; break;
        case (dist <= 384): r = [16, dist - 257, 7]; break;
        case (dist <= 512): r = [17, dist - 385, 7]; break;
        case (dist <= 768): r = [18, dist - 513, 8]; break;
        case (dist <= 1024): r = [19, dist - 769, 8]; break;
        case (dist <= 1536): r = [20, dist - 1025, 9]; break;
        case (dist <= 2048): r = [21, dist - 1537, 9]; break;
        case (dist <= 3072): r = [22, dist - 2049, 10]; break;
        case (dist <= 4096): r = [23, dist - 3073, 10]; break;
        case (dist <= 6144): r = [24, dist - 4097, 11]; break;
        case (dist <= 8192): r = [25, dist - 6145, 11]; break;
        case (dist <= 12288): r = [26, dist - 8193, 12]; break;
        case (dist <= 16384): r = [27, dist - 12289, 12]; break;
        case (dist <= 24576): r = [28, dist - 16385, 13]; break;
        case (dist <= 32768): r = [29, dist - 24577, 13]; break;
        default: throw 'invalid distance';
      }
    
      return r;
    }
    
    /**
     * Returns the match information as an LZ77 encoded array.
     * In addition, the code is encoded according to the following internal specifications:
     * [ CODE, EXTRA-BIT-LEN, EXTRA, CODE, EXTRA-BIT-LEN, EXTRA ]
     * @return {!Array.<number>} LZ77 Encoding byte array.
     */
    toLz77Array() {
      /** @type {number} */
      var length = this.length;
      /** @type {number} */
      var dist = this.backwardDistance;
      /** @type {Array} */
      var codeArray = [];
      /** @type {number} */
      var pos = 0;
      /** @type {!Array.<number>} */
      var code;
    
      // length
      code = RawDeflate.Lz77Match.LengthCodeTable[length];
      codeArray[pos++] = code & 0xffff;
      codeArray[pos++] = (code >> 16) & 0xff;
      codeArray[pos++] = code >> 24;
    
      // distance
      code = this.getDistanceCode_(dist);
      codeArray[pos++] = code[0];
      codeArray[pos++] = code[1];
      codeArray[pos++] = code[2];
    
      return codeArray;
    }
  }
  /**
   * LZ77 implementation
   * @param {!(Array.<number>|Uint8Array)} dataArray LZ77 The byte array to encode.
   * @return {!(Array.<number>|Uint16Array)} LZ77 The encoded sequence.
   */
  lz77(dataArray) {
    /** @type {number} input position */
    var position;
    /** @type {number} input length */
    var length;
    /** @type {number} loop counter */
    var i;
    /** @type {number} loop limiter */
    var il;
    /** @type {number} chained-hash-table key */
    var matchKey;
    /** @type {Object.<number, Array.<number>>} chained-hash-table */
    var table = {};
    /** @const @type {number} */
    var windowSize = RawDeflate.WindowSize;
    /** @type {Array.<number>} match list */
    var matchList;
    /** @type {RawDeflate.Lz77Match} longest match */
    var longestMatch;
    /** @type {RawDeflate.Lz77Match} previous longest match */
    var prevMatch;
    /** @type {!(Array.<number>|Uint16Array)} lz77 buffer */
    var lz77buf = USE_TYPEDARRAY ?
      new Uint16Array(dataArray.length * 2) : [];
    /** @type {number} lz77 output buffer pointer */
    var pos = 0;
    /** @type {number} lz77 skip length */
    var skipLength = 0;
    /** @type {!(Array.<number>|Uint32Array)} */
    var freqsLitLen = new (USE_TYPEDARRAY ? Uint32Array : Array)(286);
    /** @type {!(Array.<number>|Uint32Array)} */
    var freqsDist = new (USE_TYPEDARRAY ? Uint32Array : Array)(30);
    /** @type {number} */
    var lazy = this.lazy;
    /** @type {*} temporary variable */
    var tmp;
  
    // Initialization
    if (!USE_TYPEDARRAY) {
      for (i = 0; i <= 285;) { freqsLitLen[i++] = 0; }
      for (i = 0; i <= 29;) { freqsDist[i++] = 0; }
    }
    freqsLitLen[256] = 1; // EOB :The minimum number of occurrences is 1.
  
    /**
     * Writing match data
     * @param {RawDeflate.Lz77Match} match LZ77 Match data.
     * @param {!number} offset Skip start position (relative).
     * @private
     */
    function writeMatch(match, offset) {
      /** @type {Array.<number>} */
      var lz77Array = match.toLz77Array();
      /** @type {number} */
      var i;
      /** @type {number} */
      var il;
  
      for (i = 0, il = lz77Array.length; i < il; ++i) {
        lz77buf[pos++] = lz77Array[i];
      }
      freqsLitLen[lz77Array[0]]++;
      freqsDist[lz77Array[3]]++;
      skipLength = match.length + offset - 1;
      prevMatch = null;
    }
  
    // LZ77 encoding
    for (position = 0, length = dataArray.length; position < length; ++position) {
      // Creating a hash key
      for (matchKey = 0, i = 0, il = RawDeflate.Lz77MinLength; i < il; ++i) {
        if (position + i === length) {
          break;
        }
        matchKey = (matchKey << 8) | dataArray[position + i];
      }
  
      // Create the table if it is not defined
      if (table[matchKey] === void 0) { table[matchKey] = []; }
      matchList = table[matchKey];
  
      // skip
      if (skipLength-- > 0) {
        matchList.push(position);
        continue;
      }
  
      // Update match table (remove matches that exceed max return distance)
      while (matchList.length > 0 && position - matchList[0] > windowSize) {
        matchList.shift();
      }
  
      // If there is no match at the end of the data, just pass it through.
      if (position + RawDeflate.Lz77MinLength >= length) {
        if (prevMatch) {
          writeMatch(prevMatch, -1);
        }
  
        for (i = 0, il = length - position; i < il; ++i) {
          tmp = dataArray[position + i];
          lz77buf[pos++] = tmp;
          ++freqsLitLen[tmp];
        }
        break;
      }
  
      // Find the longest possible match
      if (matchList.length > 0) {
        longestMatch = this.searchLongestMatch_(dataArray, position, matchList);
  
        if (prevMatch) {
          // The current match is longer than the previous match
          if (prevMatch.length < longestMatch.length) {
            // write previous literal
            tmp = dataArray[position - 1];
            lz77buf[pos++] = tmp;
            ++freqsLitLen[tmp];
  
            // write current match
            writeMatch(longestMatch, 0);
          } else {
            // write previous match
            writeMatch(prevMatch, -1);
          }
        } else if (longestMatch.length < lazy) {
          prevMatch = longestMatch;
        } else {
          writeMatch(longestMatch, 0);
        }
      // If there was a match last time but no match this time, use the previous match.
      } else if (prevMatch) {
        writeMatch(prevMatch, -1);
      } else {
        tmp = dataArray[position];
        lz77buf[pos++] = tmp;
        ++freqsLitLen[tmp];
      }
  
      matchList.push(position); // Save current position in match table
    }
  
    // Termination
    lz77buf[pos++] = 256;
    freqsLitLen[256]++;
    this.freqsLitLen = freqsLitLen;
    this.freqsDist = freqsDist;
  
    return /** @type {!(Uint16Array|Array.<number>)} */ (
      USE_TYPEDARRAY ?  lz77buf.subarray(0, pos) : lz77buf
    );
  }
  
  /**
   * Find the longest match among the match candidates
   * @param {!Object} data plain data byte array.
   * @param {!number} position plain data byte array position.
   * @param {!Array.<number>} matchList :An array of candidate positions.
   * @return {!RawDeflate.Lz77Match} The longest and shortest distance match object.
   * @private
   */
  searchLongestMatch_(data, position, matchList) {
    var match,
        currentMatch,
        matchMax = 0, matchLength,
        i, j, l, dl = data.length;
  
    // Narrow down the candidates one by one from behind
    permatch:
    for (i = 0, l = matchList.length; i < l; i++) {
      match = matchList[l - i - 1];
      matchLength = RawDeflate.Lz77MinLength;
  
      // Search for the longest match from the end
      if (matchMax > RawDeflate.Lz77MinLength) {
        for (j = matchMax; j > RawDeflate.Lz77MinLength; j--) {
          if (data[match + j - 1] !== data[position + j - 1]) {
            continue permatch;
          }
        }
        matchLength = matchMax;
      }
  
      // longest match search
      while (matchLength < RawDeflate.Lz77MaxLength &&
             position + matchLength < dl &&
             data[match + matchLength] === data[position + matchLength]) {
        ++matchLength;
      }
  
      // If match length is the same, precedence is given to the latter
      if (matchLength > matchMax) {
        currentMatch = match;
        matchMax = matchLength;
      }
  
      // Once the longest length is determined, the rest of the process is omitted.
      if (matchLength === RawDeflate.Lz77MaxLength) {
        break;
      }
    }
  
    return new RawDeflate.Lz77Match(matchMax, position - currentMatch);
  }
  
  /**
   * Tree-Transmit Symbols :Calculation of
   * reference: PuTTY Deflate implementation
   * @param {number} hlit HLIT.
   * @param {!(Array.<number>|Uint8Array)} litlenLengths :Literals and length codes of code length arrays.
   * @param {number} hdist HDIST.
   * @param {!(Array.<number>|Uint8Array)} distLengths :Distance code length array.
   * @return {{
   *   codes: !(Array.<number>|Uint32Array),
   *   freqs: !(Array.<number>|Uint8Array)
   * }} Tree-Transmit Symbols.
   */
  getTreeSymbols_(hlit, litlenLengths, hdist, distLengths) {
    var src = new (USE_TYPEDARRAY ? Uint32Array : Array)(hlit + hdist),
        i, j, runLength, l,
        result = new (USE_TYPEDARRAY ? Uint32Array : Array)(286 + 30),
        nResult,
        rpt,
        freqs = new (USE_TYPEDARRAY ? Uint8Array : Array)(19);
  
    j = 0;
    for (i = 0; i < hlit; i++) {
      src[j++] = litlenLengths[i];
    }
    for (i = 0; i < hdist; i++) {
      src[j++] = distLengths[i];
    }
  
    // Initialization
    if (!USE_TYPEDARRAY) {
      for (i = 0, l = freqs.length; i < l; ++i) {
        freqs[i] = 0;
      }
    }
  
    // encoding
    nResult = 0;
    for (i = 0, l = src.length; i < l; i += j) {
      // Run Length Encoding
      for (j = 1; i + j < l && src[i + j] === src[i]; ++j) {}
  
      runLength = j;
  
      if (src[i] === 0) {
        // If the number of 0s is less than 3, leave it as is.
        if (runLength < 3) {
          while (runLength-- > 0) {
            result[nResult++] = 0;
            freqs[0]++;
          }
        } else {
          while (runLength > 0) {
            // The maximum number of repetitions is 138, so truncate it.
            rpt = (runLength < 138 ? runLength : 138);
  
            if (rpt > runLength - 3 && rpt < runLength) {
              rpt = runLength - 3;
            }
  
            // 3-10 times -> 17
            if (rpt <= 10) {
              result[nResult++] = 17;
              result[nResult++] = rpt - 3;
              freqs[17]++;
            // 11-138 times -> 18
            } else {
              result[nResult++] = 18;
              result[nResult++] = rpt - 11;
              freqs[18]++;
            }
  
            runLength -= rpt;
          }
        }
      } else {
        result[nResult++] = src[i];
        freqs[src[i]]++;
        runLength--;
  
        // If the number of repetitions is less than 3, no run-length code is required.
        if (runLength < 3) {
          while (runLength-- > 0) {
            result[nResult++] = src[i];
            freqs[src[i]]++;
          }
        // Run-length coding if 3 or more times
        } else {
          while (runLength > 0) {
            // Divide runLength by 3-6
            rpt = (runLength < 6 ? runLength : 6);
  
            if (rpt > runLength - 3 && rpt < runLength) {
              rpt = runLength - 3;
            }
  
            result[nResult++] = 16;
            result[nResult++] = rpt - 3;
            freqs[16]++;
  
            runLength -= rpt;
          }
        }
      }
    }
  
    return {
      codes: USE_TYPEDARRAY ? result.subarray(0, nResult) : result.slice(0, nResult),
      freqs
    }
  }
  
  /**
   * Get the length of the Huffman code
   * @param {!(Array.<number>|Uint8Array|Uint32Array)} freqs :Appearance count.
   * @param {number} limit :Code length restrictions.
   * @return {!(Array.<number>|Uint8Array)} Code length array.
   * @private
   */
  getLengths_(freqs, limit) {
    /** @type {number} */
    var nSymbols = freqs.length;
    /** @type {Heap} */
    var heap = new Heap(2 * RawDeflate.HUFMAX);
    /** @type {!(Array.<number>|Uint8Array)} */
    var length = new (USE_TYPEDARRAY ? Uint8Array : Array)(nSymbols);
    /** @type {Array} */
    var nodes;
    /** @type {!(Array.<number>|Uint32Array)} */
    var values;
    /** @type {!(Array.<number>|Uint8Array)} */
    var codeLength;
    /** @type {number} */
    var i;
    /** @type {number} */
    var il;
  
    // Initializing Arrays
    if (!USE_TYPEDARRAY) {
      for (i = 0; i < nSymbols; i++) {
        length[i] = 0;
      }
    }
  
    // Building the Heap
    for (i = 0; i < nSymbols; ++i) {
      if (freqs[i] > 0) {
        heap.push(i, freqs[i]);
      }
    }
    nodes = new Array(heap.length / 2);
    values = new (USE_TYPEDARRAY ? Uint32Array : Array)(heap.length / 2);
  
    // If there is only one non-zero element, assign a code length of 1 to that symbol and exit.
    if (nodes.length === 1) {
      length[heap.pop().index] = 1;
      return length;
    }
  
    // Determining the code length of Canonical Huffman Code using the Reverse Package Merge Algorithm
    for (i = 0, il = heap.length / 2; i < il; ++i) {
      nodes[i] = heap.pop();
      values[i] = nodes[i].value;
    }
    codeLength = this.reversePackageMerge_(values, values.length, limit);
  
    for (i = 0, il = nodes.length; i < il; ++i) {
      length[nodes[i].index] = codeLength[i];
    }
  
    return length;
  }
  
  /**
   * Reverse Package Merge Algorithm.
   * @param {!(Array.<number>|Uint32Array)} freqs sorted probability.
   * @param {number} symbols number of symbols.
   * @param {number} limit code length limit.
   * @return {!(Array.<number>|Uint8Array)} code lengths.
   */
  reversePackageMerge_(freqs, symbols, limit) {
    /** @type {!(Array.<number>|Uint16Array)} */
    var minimumCost = new (USE_TYPEDARRAY ? Uint16Array : Array)(limit);
    /** @type {!(Array.<number>|Uint8Array)} */
    var flag = new (USE_TYPEDARRAY ? Uint8Array : Array)(limit);
    /** @type {!(Array.<number>|Uint8Array)} */
    var codeLength = new (USE_TYPEDARRAY ? Uint8Array : Array)(symbols);
    /** @type {Array} */
    var value = new Array(limit);
    /** @type {Array} */
    var type  = new Array(limit);
    /** @type {Array.<number>} */
    var currentPosition = new Array(limit);
    /** @type {number} */
    var excess = (1 << limit) - symbols;
    /** @type {number} */
    var half = (1 << (limit - 1));
    /** @type {number} */
    var i;
    /** @type {number} */
    var j;
    /** @type {number} */
    var t;
    /** @type {number} */
    var weight;
    /** @type {number} */
    var next;
  
    /**
     * @param {number} j
     */
    function takePackage(j) {
      /** @type {number} */
      var x = type[j][currentPosition[j]];
  
      if (x === symbols) {
        takePackage(j+1);
        takePackage(j+1);
      } else {
        --codeLength[x];
      }
  
      ++currentPosition[j];
    }
  
    minimumCost[limit-1] = symbols;
  
    for (j = 0; j < limit; ++j) {
      if (excess < half) {
        flag[j] = 0;
      } else {
        flag[j] = 1;
        excess -= half;
      }
      excess <<= 1;
      minimumCost[limit-2-j] = (minimumCost[limit-1-j] / 2 | 0) + symbols;
    }
    minimumCost[0] = flag[0];
  
    value[0] = new Array(minimumCost[0]);
    type[0]  = new Array(minimumCost[0]);
    for (j = 1; j < limit; ++j) {
      if (minimumCost[j] > 2 * minimumCost[j-1] + flag[j]) {
        minimumCost[j] = 2 * minimumCost[j-1] + flag[j];
      }
      value[j] = new Array(minimumCost[j]);
      type[j]  = new Array(minimumCost[j]);
    }
  
    for (i = 0; i < symbols; ++i) {
      codeLength[i] = limit;
    }
  
    for (t = 0; t < minimumCost[limit-1]; ++t) {
      value[limit-1][t] = freqs[t];
      type[limit-1][t]  = t;
    }
  
    for (i = 0; i < limit; ++i) {
      currentPosition[i] = 0;
    }
    if (flag[limit-1] === 1) {
      --codeLength[0];
      ++currentPosition[limit-1];
    }
  
    for (j = limit-2; j >= 0; --j) {
      i = 0;
      weight = 0;
      next = currentPosition[j+1];
  
      for (t = 0; t < minimumCost[j]; t++) {
        weight = value[j+1][next] + value[j+1][next+1];
  
        if (weight > freqs[i]) {
          value[j][t] = weight;
          type[j][t] = symbols;
          next += 2;
        } else {
          value[j][t] = freqs[i];
          type[j][t] = i;
          ++i;
        }
      }
  
      currentPosition[j] = 0;
      if (flag[j] === 1) {
        takePackage(j);
      }
    }
  
    return codeLength;
  }
  
  /**
   * Get Huffman code from code length array
   * reference: PuTTY Deflate implementation
   * @param {!(Array.<number>|Uint8Array)} lengths :Code length array.
   * @return {!(Array.<number>|Uint16Array)} Huffman code sequence.
   * @private
   */
  getCodesFromLengths_(lengths) {
    var codes = new (USE_TYPEDARRAY ? Uint16Array : Array)(lengths.length),
        count = [],
        startCode = [],
        code = 0, i, il, j, m;
  
    // Count the codes of each length.
    for (i = 0, il = lengths.length; i < il; i++) {
      count[lengths[i]] = (count[lengths[i]] | 0) + 1;
    }
  
    // Determine the starting code for each length block.
    for (i = 1, il = RawDeflate.MaxCodeLength; i <= il; i++) {
      startCode[i] = code;
      code += count[i] | 0;
      code <<= 1;
    }
  
    // Determine the code for each symbol. Mirrored, of course.
    for (i = 0, il = lengths.length; i < il; i++) {
      code = startCode[lengths[i]];
      startCode[lengths[i]] += 1;
      codes[i] = 0;
  
      for (j = 0, m = lengths[i]; j < m; j++) {
        codes[i] = (codes[i] << 1) | (code & 1);
        code >>>= 1;
      }
    }
  
    return codes;
  }

}

