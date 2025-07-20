import { USE_TYPEDARRAY } from './hybrid.js'
import { RawInflate } from './rawinflate.js'
import { Zip } from './Zip.js'
import * as CRC32 from './crc32.js'

/**
 * @param {!(Array.<number>|Uint8Array)} input input buffer.
 * @param {Object=} opt_params options.
 * @constructor
 */
export class Unzip {
  constructor(input, opt_params) {
    opt_params = opt_params || {};
    /** @type {!(Array.<number>|Uint8Array)} */
    this.input = (USE_TYPEDARRAY && (input instanceof Array)) ?
      new Uint8Array(input) : input;
    /** @type {number} */
    this.ip = 0;
    /** @type {number} */
    this.eocdrOffset;
    /** @type {number} */
    this.numberOfThisDisk;
    /** @type {number} */
    this.startDisk;
    /** @type {number} */
    this.totalEntriesThisDisk;
    /** @type {number} */
    this.totalEntries;
    /** @type {number} */
    this.centralDirectorySize;
    /** @type {number} */
    this.centralDirectoryOffset;
    /** @type {number} */
    this.commentLength;
    /** @type {(Array.<number>|Uint8Array)} */
    this.comment;
    /** @type {Array.<Unzip.FileHeader>} */
    this.fileHeaderList;
    /** @type {Object.<string, number>} */
    this.filenameToIndex;
    /** @type {boolean} */
    this.verify = opt_params['verify'] || false;
    /** @type {(Array.<number>|Uint8Array)} */
    this.password = opt_params['password'];
  }
  
  static CompressionMethod = Zip.CompressionMethod;
  
  /**
   * @type {Array.<number>}
   * @const
   */
  static FileHeaderSignature = Zip.FileHeaderSignature;
  
  /**
   * @type {Array.<number>}
   * @const
   */
  static LocalFileHeaderSignature = Zip.LocalFileHeaderSignature;
  
  /**
   * @type {Array.<number>}
   * @const
   */
  static CentralDirectorySignature = Zip.CentralDirectorySignature;
  
  /**
   * @param {!(Array.<number>|Uint8Array)} input input buffer.
   * @param {number} ip input position.
   * @constructor
   */
  static FileHeader = class {
    constructor(input, ip) {
      /** @type {!(Array.<number>|Uint8Array)} */
      this.input = input;
      /** @type {number} */
      this.offset = ip;
      /** @type {number} */
      this.length;
      /** @type {number} */
      this.version;
      /** @type {number} */
      this.os;
      /** @type {number} */
      this.needVersion;
      /** @type {number} */
      this.flags;
      /** @type {number} */
      this.compression;
      /** @type {number} */
      this.time;
      /** @type {number} */
      this.date;
      /** @type {number} */
      this.crc32;
      /** @type {number} */
      this.compressedSize;
      /** @type {number} */
      this.plainSize;
      /** @type {number} */
      this.fileNameLength;
      /** @type {number} */
      this.extraFieldLength;
      /** @type {number} */
      this.fileCommentLength;
      /** @type {number} */
      this.diskNumberStart;
      /** @type {number} */
      this.internalFileAttributes;
      /** @type {number} */
      this.externalFileAttributes;
      /** @type {number} */
      this.relativeOffset;
      /** @type {string} */
      this.filename;
      /** @type {!(Array.<number>|Uint8Array)} */
      this.extraField;
      /** @type {!(Array.<number>|Uint8Array)} */
      this.comment;
    }
    
    parse() {
      /** @type {!(Array.<number>|Uint8Array)} */
      var input = this.input;
      /** @type {number} */
      var ip = this.offset;
    
      // central file header signature
      if (input[ip++] !== Unzip.FileHeaderSignature[0] ||
          input[ip++] !== Unzip.FileHeaderSignature[1] ||
          input[ip++] !== Unzip.FileHeaderSignature[2] ||
          input[ip++] !== Unzip.FileHeaderSignature[3]) {
        throw new Error('invalid file header signature');
      }
    
      // version made by
      this.version = input[ip++];
      this.os = input[ip++];
    
      // version needed to extract
      this.needVersion = input[ip++] | (input[ip++] << 8);
    
      // general purpose bit flag
      this.flags = input[ip++] | (input[ip++] << 8);
    
      // compression method
      this.compression = input[ip++] | (input[ip++] << 8);
    
      // last mod file time
      this.time = input[ip++] | (input[ip++] << 8);
    
      //last mod file date
      this.date = input[ip++] | (input[ip++] << 8);
    
      // crc-32
      this.crc32 = (
        (input[ip++]      ) | (input[ip++] <<  8) |
        (input[ip++] << 16) | (input[ip++] << 24)
      ) >>> 0;
    
      // compressed size
      this.compressedSize = (
        (input[ip++]      ) | (input[ip++] <<  8) |
        (input[ip++] << 16) | (input[ip++] << 24)
      ) >>> 0;
    
      // uncompressed size
      this.plainSize = (
        (input[ip++]      ) | (input[ip++] <<  8) |
        (input[ip++] << 16) | (input[ip++] << 24)
      ) >>> 0;
    
      // file name length
      this.fileNameLength = input[ip++] | (input[ip++] << 8);
    
      // extra field length
      this.extraFieldLength = input[ip++] | (input[ip++] << 8);
    
      // file comment length
      this.fileCommentLength = input[ip++] | (input[ip++] << 8);
    
      // disk number start
      this.diskNumberStart = input[ip++] | (input[ip++] << 8);
    
      // internal file attributes
      this.internalFileAttributes = input[ip++] | (input[ip++] << 8);
    
      // external file attributes
      this.externalFileAttributes =
        (input[ip++]      ) | (input[ip++] <<  8) |
        (input[ip++] << 16) | (input[ip++] << 24);
    
      // relative offset of local header
      this.relativeOffset = (
        (input[ip++]      ) | (input[ip++] <<  8) |
        (input[ip++] << 16) | (input[ip++] << 24)
      ) >>> 0;
    
      // file name
      this.filename = String.fromCharCode.apply(null, USE_TYPEDARRAY ?
        input.subarray(ip, ip += this.fileNameLength) :
        input.slice(ip, ip += this.fileNameLength)
      );
    
      // extra field
      this.extraField = USE_TYPEDARRAY ?
        input.subarray(ip, ip += this.extraFieldLength) :
        input.slice(ip, ip += this.extraFieldLength);
    
      // file comment
      this.comment = USE_TYPEDARRAY ?
        input.subarray(ip, ip + this.fileCommentLength) :
        input.slice(ip, ip + this.fileCommentLength);
    
      this.length = ip - this.offset;
    }
  }
  /**
   * @param {!(Array.<number>|Uint8Array)} input input buffer.
   * @param {number} ip input position.
   * @constructor
   */
  static LocalFileHeader = class {
    constructor(input, ip) {
      /** @type {!(Array.<number>|Uint8Array)} */
      this.input = input;
      /** @type {number} */
      this.offset = ip;
      /** @type {number} */
      this.length;
      /** @type {number} */
      this.needVersion;
      /** @type {number} */
      this.flags;
      /** @type {number} */
      this.compression;
      /** @type {number} */
      this.time;
      /** @type {number} */
      this.date;
      /** @type {number} */
      this.crc32;
      /** @type {number} */
      this.compressedSize;
      /** @type {number} */
      this.plainSize;
      /** @type {number} */
      this.fileNameLength;
      /** @type {number} */
      this.extraFieldLength;
      /** @type {string} */
      this.filename;
      /** @type {!(Array.<number>|Uint8Array)} */
      this.extraField;
    }
    
    static Flags = Zip.Flags
    
    parse() {
      /** @type {!(Array.<number>|Uint8Array)} */
      var input = this.input;
      /** @type {number} */
      var ip = this.offset;
    
      // local file header signature
      if (input[ip++] !== Unzip.LocalFileHeaderSignature[0] ||
          input[ip++] !== Unzip.LocalFileHeaderSignature[1] ||
          input[ip++] !== Unzip.LocalFileHeaderSignature[2] ||
          input[ip++] !== Unzip.LocalFileHeaderSignature[3]) {
        throw new Error('invalid local file header signature');
      }
    
      // version needed to extract
      this.needVersion = input[ip++] | (input[ip++] << 8);
    
      // general purpose bit flag
      this.flags = input[ip++] | (input[ip++] << 8);
    
      // compression method
      this.compression = input[ip++] | (input[ip++] << 8);
    
      // last mod file time
      this.time = input[ip++] | (input[ip++] << 8);
    
      //last mod file date
      this.date = input[ip++] | (input[ip++] << 8);
    
      // crc-32
      this.crc32 = (
        (input[ip++]      ) | (input[ip++] <<  8) |
        (input[ip++] << 16) | (input[ip++] << 24)
      ) >>> 0;
    
      // compressed size
      this.compressedSize = (
        (input[ip++]      ) | (input[ip++] <<  8) |
        (input[ip++] << 16) | (input[ip++] << 24)
      ) >>> 0;
    
      // uncompressed size
      this.plainSize = (
        (input[ip++]      ) | (input[ip++] <<  8) |
        (input[ip++] << 16) | (input[ip++] << 24)
      ) >>> 0;
    
      // file name length
      this.fileNameLength = input[ip++] | (input[ip++] << 8);
    
      // extra field length
      this.extraFieldLength = input[ip++] | (input[ip++] << 8);
    
      // file name
      this.filename = String.fromCharCode.apply(null, USE_TYPEDARRAY ?
        input.subarray(ip, ip += this.fileNameLength) :
        input.slice(ip, ip += this.fileNameLength)
      );
    
      // extra field
      this.extraField = USE_TYPEDARRAY ?
        input.subarray(ip, ip += this.extraFieldLength) :
        input.slice(ip, ip += this.extraFieldLength);
    
      this.length = ip - this.offset;
    }
  }
  
  searchEndOfCentralDirectoryRecord() {
    /** @type {!(Array.<number>|Uint8Array)} */
    var input = this.input;
    /** @type {number} */
    var ip;
  
    for (ip = input.length - 12; ip > 0; --ip) {
      if (input[ip  ] === Unzip.CentralDirectorySignature[0] &&
          input[ip+1] === Unzip.CentralDirectorySignature[1] &&
          input[ip+2] === Unzip.CentralDirectorySignature[2] &&
          input[ip+3] === Unzip.CentralDirectorySignature[3]) {
        this.eocdrOffset = ip;
        return;
      }
    }
  
    throw new Error('End of Central Directory Record not found');
  }
  
  parseEndOfCentralDirectoryRecord() {
    /** @type {!(Array.<number>|Uint8Array)} */
    var input = this.input;
    /** @type {number} */
    var ip;
  
    if (!this.eocdrOffset) {
      this.searchEndOfCentralDirectoryRecord();
    }
    ip = this.eocdrOffset;
  
    // signature
    if (input[ip++] !== Unzip.CentralDirectorySignature[0] ||
        input[ip++] !== Unzip.CentralDirectorySignature[1] ||
        input[ip++] !== Unzip.CentralDirectorySignature[2] ||
        input[ip++] !== Unzip.CentralDirectorySignature[3]) {
      throw new Error('invalid signature');
    }
  
    // number of this disk
    this.numberOfThisDisk = input[ip++] | (input[ip++] << 8);
  
    // number of the disk with the start of the central directory
    this.startDisk = input[ip++] | (input[ip++] << 8);
  
    // total number of entries in the central directory on this disk
    this.totalEntriesThisDisk = input[ip++] | (input[ip++] << 8);
  
    // total number of entries in the central directory
    this.totalEntries = input[ip++] | (input[ip++] << 8);
  
    // size of the central directory
    this.centralDirectorySize = (
      (input[ip++]      ) | (input[ip++] <<  8) |
      (input[ip++] << 16) | (input[ip++] << 24)
    ) >>> 0;
  
    // offset of start of central directory with respect to the starting disk number
    this.centralDirectoryOffset = (
      (input[ip++]      ) | (input[ip++] <<  8) |
      (input[ip++] << 16) | (input[ip++] << 24)
    ) >>> 0;
  
    // .ZIP file comment length
    this.commentLength = input[ip++] | (input[ip++] << 8);
  
    // .ZIP file comment
    this.comment = USE_TYPEDARRAY ?
      input.subarray(ip, ip + this.commentLength) :
      input.slice(ip, ip + this.commentLength);
  }
  
  parseFileHeader() {
    /** @type {Array.<Unzip.FileHeader>} */
    var filelist = [];
    /** @type {Object.<string, number>} */
    var filetable = {};
    /** @type {number} */
    var ip;
    /** @type {Unzip.FileHeader} */
    var fileHeader;
    /*: @type {number} */
    var i;
    /*: @type {number} */
    var il;
  
    if (this.fileHeaderList) {
      return;
    }
  
    if (this.centralDirectoryOffset === void 0) {
      this.parseEndOfCentralDirectoryRecord();
    }
    ip = this.centralDirectoryOffset;
  
    for (i = 0, il = this.totalEntries; i < il; ++i) {
      fileHeader = new Unzip.FileHeader(this.input, ip);
      fileHeader.parse();
      ip += fileHeader.length;
      filelist[i] = fileHeader;
      filetable[fileHeader.filename] = i;
    }
  
    if (this.centralDirectorySize < ip - this.centralDirectoryOffset) {
      throw new Error('invalid file header size');
    }
  
    this.fileHeaderList = filelist;
    this.filenameToIndex = filetable;
  }
  
  /**
   * @param {number} index file header index.
   * @param {Object=} opt_params
   * @return {!(Array.<number>|Uint8Array)} file data.
   */
  getFileData(index, opt_params) {
    opt_params = opt_params || {};
    /** @type {!(Array.<number>|Uint8Array)} */
    var input = this.input;
    /** @type {Array.<Unzip.FileHeader>} */
    var fileHeaderList = this.fileHeaderList;
    /** @type {Unzip.LocalFileHeader} */
    var localFileHeader;
    /** @type {number} */
    var offset;
    /** @type {number} */
    var length;
    /** @type {!(Array.<number>|Uint8Array)} */
    var buffer;
    /** @type {number} */
    var crc32;
    /** @type {Array.<number>|Uint32Array|Object} */
    var key;
    /** @type {number} */
    var i;
    /** @type {number} */
    var il;
  
    if (!fileHeaderList) {
      this.parseFileHeader();
    }
  
    if (fileHeaderList[index] === void 0) {
      throw new Error('wrong index');
    }
  
    offset = fileHeaderList[index].relativeOffset;
    localFileHeader = new Unzip.LocalFileHeader(this.input, offset);
    localFileHeader.parse();
    offset += localFileHeader.length;
    length = localFileHeader.compressedSize;
  
    // decryption
    if ((localFileHeader.flags & Unzip.LocalFileHeader.Flags.ENCRYPT) !== 0) {
      if (!(opt_params['password'] || this.password)) {
        throw new Error('please set password');
      }
      key =  this.createDecryptionKey(opt_params['password'] || this.password);
  
      // encryption header
      for(i = offset, il = offset + 12; i < il; ++i) {
        this.decode(key, input[i]);
      }
      offset += 12;
      length -= 12;
  
      // decryption
      for (i = offset, il = offset + length; i < il; ++i) {
        input[i] = this.decode(key, input[i]);
      }
    }
  
    switch (localFileHeader.compression) {
      case Unzip.CompressionMethod.STORE:
        buffer = USE_TYPEDARRAY ?
          this.input.subarray(offset, offset + length) :
          this.input.slice(offset, offset + length);
        break;
      case Unzip.CompressionMethod.DEFLATE:
        buffer = new RawInflate(this.input, {
          'index': offset,
          'bufferSize': localFileHeader.plainSize
        }).decompress();
        break;
      default:
        throw new Error('unknown compression type');
    }
  
    if (this.verify) {
      crc32 = CRC32.calc(buffer);
      if (localFileHeader.crc32 !== crc32) {
        throw new Error(
          'wrong crc: file=0x' + localFileHeader.crc32.toString(16) +
          ', data=0x' + crc32.toString(16)
        );
      }
    }
  
    return buffer;
  }
  
  /**
   * @return {Array.<string>}
   */
  getFilenames() {
    /** @type {Array.<string>} */
    var filenameList = [];
    /** @type {number} */
    var i;
    /** @type {number} */
    var il;
    /** @type {Array.<Unzip.FileHeader>} */
    var fileHeaderList;
  
    if (!this.fileHeaderList) {
      this.parseFileHeader();
    }
    fileHeaderList = this.fileHeaderList;
  
    for (i = 0, il = fileHeaderList.length; i < il; ++i) {
      filenameList[i] = fileHeaderList[i].filename;
    }
  
    return filenameList;
  }
  
  /**
   * @param {string} filename extract filename.
   * @param {Object=} opt_params
   * @return {!(Array.<number>|Uint8Array)} decompressed data.
   */
  decompress(filename, opt_params) {
    /** @type {number} */
    var index;
  
    if (!this.filenameToIndex) {
      this.parseFileHeader();
    }
    index = this.filenameToIndex[filename];
  
    if (index === void 0) {
      throw new Error(filename + ' not found');
    }
  
    return this.getFileData(index, opt_params);
  }
  
  /**
   * @param {(Array.<number>|Uint8Array)} password
   */
  setPassword(password) {
    this.password = password;
  }
  
  /**
   * @param {(Array.<number>|Uint32Array|Object)} key
   * @param {number} n
   * @return {number}
   */
  decode(key, n) {
    n ^= this.getByte(/** @type {(Array.<number>|Uint32Array)} */(key));
    this.updateKeys(/** @type {(Array.<number>|Uint32Array)} */(key), n);
  
    return n;
  }

}

// common method
Unzip.prototype.updateKeys = Zip.prototype.updateKeys;
Unzip.prototype.createDecryptionKey = Zip.prototype.createEncryptionKey;
Unzip.prototype.getByte = Zip.prototype.getByte;

