export default function buffer() {
  /*!
   * The buffer module from node.js, for the browser.
   * 6.0.3
   * @author   Feross Aboukhadijeh <https://feross.org>
   * @license  MIT
   */
  /* eslint-disable no-proto */
  var base64 = base64_js()
  var ieee754 = ieee754_js()
  
  const customInspectSymbol = (typeof Symbol === 'function' && typeof Symbol['for'] === 'function') ? Symbol['for']('nodejs.util.inspect.custom') : null
  
  //export 
  const INSPECT_MAX_BYTES = 50
  
  const K_MAX_LENGTH = 0x7fffffff
  
  //export 
  const kMaxLength = K_MAX_LENGTH
  
  /**
   * Not used internally, but exported to maintain api compatability
   * Uses 32-bit implementation value from Node defined in String:kMaxLength
   *
   * @see https://github.com/nodejs/node/blob/main/deps/v8/include/v8-primitive.h#L126
   * @see https://github.com/nodejs/node/blob/main/src/node_buffer.cc#L1298
   * @see https://github.com/nodejs/node/blob/main/lib/buffer.js#L142
   */
  const K_STRING_MAX_LENGTH = (1 << 28) - 16
  //export 
  const kStringMaxLength = K_STRING_MAX_LENGTH
  
  //export 
  const constants = {
    MAX_LENGTH: K_MAX_LENGTH,
    MAX_STRING_LENGTH: K_STRING_MAX_LENGTH
  }
  
  const _Blob = typeof Blob !== 'undefined' ? Blob : undefined
  const _File = typeof File !== 'undefined' ? File : undefined
  const _atob = typeof atob !== 'undefined' ? atob : undefined
  const _btoa = typeof btoa !== 'undefined' ? btoa : undefined
  
  //export {
  //  _Blob as Blob, _File as File, _atob as atob, _btoa as btoa
  //}
  
  
  /**
   * If `Buffer.TYPED_ARRAY_SUPPORT`:
   *   === true    Use Uint8Array implementation (fastest)
   *   === false   Print warning and recommend using `buffer` v4.x which has an Object
   *               implementation (most compatible, even IE6)
   *
   * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
   * Opera 11.6+, iOS 4.2+.
   *
   * We report that the browser does not support typed arrays if the are not subclassable
   * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
   * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
   * for __proto__ and has a buggy typed array implementation.
   */
  
  /**
   * The Buffer constructor returns instances of `Uint8Array` that have their
   * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
   * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
   * and the `Uint8Array` methods. Square bracket notation works as expected -- it
   * returns a single octet.
   *
   * The `Uint8Array` prototype remains unmodified.
   */
  //export 
  class Buffer extends Uint8Array {
    constructor(arg, encodingOrOffset, length) {
      // Common case.
      if (typeof arg === 'number') {
        if (typeof encodingOrOffset === 'string') {
          throw new TypeError(
            'The "string" argument must be of type string. Received type number'
          )
        }
        return Buffer.allocUnsafe_(arg)
      }
  
      if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
        typeof console.error === 'function') {
        console.error(
          'This browser lacks typed array (Uint8Array) support which is required by ' +
          '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
        )
      }
      super(arg)
  
      if (customInspectSymbol) {
        this[customInspectSymbol] = this.inspect
      }
  
  
      return Buffer.from(arg, encodingOrOffset, length)
    }
  
    // This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
    // to detect a Buffer instance. It's not possible to use `instanceof Buffer`
    // reliably in a browserify context because there could be multiple different
    // copies of the 'buffer' package in use. This method works even for Buffer
    // instances that were created from another copy of the `buffer` package.
    // See: https://github.com/feross/buffer/issues/154
    //_isBuffer = true
  
    get parent() {
      if (!Buffer.isBuffer(this)) return undefined
      return this.buffer
    }
  
    get offset() {
      if (!Buffer.isBuffer(this)) return undefined
      return this.byteOffset
    }
  
    static TYPED_ARRAY_SUPPORT = Buffer.typedArraySupport()
  
    static typedArraySupport() {
      // Can typed array instances be augmented?
      try {
        const arr = new Uint8Array(1)
        const proto = {
          foo: function() {
            return 42
          }
        }
        Object.setPrototypeOf(proto, Uint8Array.prototype)
        Object.setPrototypeOf(arr, proto)
        return arr.foo() === 42
      } catch (e) {
        return false
      }
    }
  
    static poolSize = 8192 // not used by this implementation
  
    /**
     * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
     * if value is a number.
     * Buffer.from(str[, encoding])
     * Buffer.from(array)
     * Buffer.from(buffer)
     * Buffer.from(arrayBuffer[, byteOffset[, length]])
     **/
    static from(value, encodingOrOffset, length) {
      if (typeof value === 'string') {
        return Buffer.fromString(value, encodingOrOffset)
      }
  
      if (ArrayBuffer.isView(value)) {
        return Buffer.fromArrayView(value)
      }
  
      if (value == null) {
        throw new TypeError(
          'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
          'or Array-like Object. Received type ' + (typeof value)
        )
      }
  
      if (Buffer.isInstance(value, ArrayBuffer) ||
        (value && Buffer.isInstance(value.buffer, ArrayBuffer))) {
        return Buffer.fromArrayBuffer(value, encodingOrOffset, length)
      }
  
      if (typeof SharedArrayBuffer !== 'undefined' &&
        (Buffer.isInstance(value, SharedArrayBuffer) ||
          (value && Buffer.isInstance(value.buffer, SharedArrayBuffer)))) {
        return Buffer.fromArrayBuffer(value, encodingOrOffset, length)
      }
  
      if (typeof value === 'number') {
        throw new TypeError(
          'The "value" argument must not be of type number. Received type number'
        )
      }
  
      const valueOf = value.valueOf && value.valueOf()
      if (valueOf != null && valueOf !== value) {
        return Buffer.from(valueOf, encodingOrOffset, length)
      }
  
      const b = Buffer.fromObject(value)
      if (b) return b
  
      if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
        typeof value[Symbol.toPrimitive] === 'function') {
        return Buffer.from(value[Symbol.toPrimitive]('string'), encodingOrOffset, length)
      }
  
      throw new TypeError(
        'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
        'or Array-like Object. Received type ' + (typeof value)
      )
    }
  
    static assertSize(size) {
      if (typeof size !== 'number') {
        throw new TypeError('"size" argument must be of type number')
      } else if (size < 0) {
        throw new RangeError('The value "' + size + '" is invalid for option "size"')
      }
    }
  
    static alloc(size, fill, encoding) {
      Buffer.assertSize(size)
      if (size <= 0) {
        return Buffer.createBuffer(size)
      }
      if (fill !== undefined) {
        // Only pay attention to encoding if it's a string. This
        // prevents accidentally sending in a number that would
        // be interpreted as a start offset.
        return typeof encoding === 'string' ?
          Buffer.createBuffer(size).fill(fill, encoding) :
          Buffer.createBuffer(size).fill(fill)
      }
      return Buffer.createBuffer(size)
    }
  
    /**
     * Creates a new filled Buffer instance.
     * alloc(size[, fill[, encoding]])
     **/
    static allocUnsafe_(size) {
      Buffer.assertSize(size)
      return Buffer.createBuffer(size < 0 ? 0 : checked(size) | 0)
    }
  
    /**
     * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
     * */
    static allocUnsafe(size) {
      return Buffer.allocUnsafe_(size)
    }
    /**
     * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
     */
    static allocUnsafeSlow(size) {
      return Buffer.allocUnsafe_(size)
    }
  
    static fromString(string, encoding) {
      if (typeof encoding !== 'string' || encoding === '') {
        encoding = 'utf8'
      }
  
      if (!Buffer.isEncoding(encoding)) {
        throw new TypeError('Unknown encoding: ' + encoding)
      }
  
      const length = Buffer.byteLength(string, encoding) | 0
      let buf = Buffer.createBuffer(length)
  
      const actual = buf.write(string, encoding)
  
      if (actual !== length) {
        // Writing a hex string, for example, that contains invalid characters will
        // cause everything after the first invalid character to be ignored. (e.g.
        // 'abxxcd' will be treated as 'ab')
        buf = buf.slice(0, actual)
      }
  
      return buf
    }
  
    static fromArrayLike(array) {
      const length = array.length < 0 ? 0 : checked(array.length) | 0
      const buf = Buffer.createBuffer(length)
      for (let i = 0; i < length; i += 1) {
        buf[i] = array[i] & 255
      }
      return buf
    }
  
    static fromArrayView(arrayView) {
      if (Buffer.isInstance(arrayView, Uint8Array)) {
        const copy = new Uint8Array(arrayView)
        return Buffer.fromArrayBuffer(copy.buffer, copy.byteOffset, copy.byteLength)
      }
      return Buffer.fromArrayLike(arrayView)
    }
  
    static fromArrayBuffer(array, byteOffset, length) {
      if (byteOffset < 0 || array.byteLength < byteOffset) {
        throw new RangeError('"offset" is outside of buffer bounds')
      }
  
      if (array.byteLength < byteOffset + (length || 0)) {
        throw new RangeError('"length" is outside of buffer bounds')
      }
  
      let buf
      if (byteOffset === undefined && length === undefined) {
        buf = new Uint8Array(array)
      } else if (length === undefined) {
        buf = new Uint8Array(array, byteOffset)
      } else {
        buf = new Uint8Array(array, byteOffset, length)
      }
  
      for (var prop in this) {
        if (!Object.prototype.hasOwnProperty.call(this, prop)) {
          buf[prop] = this[prop]
        }
      }
  
      return buf
    }
  
    static fromObject(obj) {
      if (Buffer.isBuffer(obj)) {
        // Note: Probably not necessary anymore.
        const len = checked(obj.length) | 0
        const buf = Buffer.createBuffer(len)
  
        if (buf.length === 0) {
          return buf
        }
  
        obj.copy(buf, 0, 0, len)
        return buf
      }
  
      if (obj.length !== undefined) {
        if (typeof obj.length !== 'number' || (obj.length !== obj.length)) {
          return Buffer.createBuffer(0)
        }
        return Buffer.fromArrayLike(obj)
      }
  
      if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
        return Buffer.fromArrayLike(obj.data)
      }
    }
  
    static createBuffer(length) {
      if (length > K_MAX_LENGTH) {
        throw new RangeError('The value "' + length + '" is invalid for option "size"')
      }
      const buf = new Uint8Array(length)
      Object.setPrototypeOf(buf, Buffer.prototype)
      return buf
    }
  
    static isBuffer(b) {
      return b != null && b._isBuffer === true &&
        b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
    }
  
    static compare(a, b) {
      if (!Buffer.isInstance(a, Uint8Array) || !Buffer.isInstance(b, Uint8Array)) {
        throw new TypeError(
          'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
        )
      }
  
      if (a === b) return 0
  
      let x = a.length
      let y = b.length
  
      for (let i = 0, len = Math.min(x, y); i < len; ++i) {
        if (a[i] !== b[i]) {
          x = a[i]
          y = b[i]
          break
        }
      }
  
      if (x < y) return -1
      if (y < x) return 1
      return 0
    }
  
    static isEncoding(encoding) {
      switch (String(encoding).toLowerCase()) {
        case 'hex':
        case 'utf8':
        case 'utf-8':
        case 'ascii':
        case 'latin1':
        case 'binary':
        case 'base64':
        case 'ucs2':
        case 'ucs-2':
        case 'utf16le':
        case 'utf-16le':
          return true
        default:
          return false
      }
    }
  
    static concat(list, length) {
      if (!Array.isArray(list)) {
        throw new TypeError('"list" argument must be an Array of Buffers')
      }
  
      if (list.length === 0) {
        return Buffer.alloc(0)
      }
  
      let i
      if (length === undefined) {
        length = 0
        for (i = 0; i < list.length; ++i) {
          length += list[i].length
        }
      }
  
      const buffer = Buffer.allocUnsafe(length)
      let pos = 0
      for (i = 0; i < list.length; ++i) {
        const buf = list[i]
        if (!Buffer.isInstance(buf, Uint8Array)) {
          throw new TypeError('"list" argument must be an Array of Buffers')
        }
        if (pos + buf.length > buffer.length) {
          buffer.set(buf.subarray(0, buffer.length - pos), pos)
          break
        }
        buffer.set(buf, pos)
        pos += buf.length
      }
      return buffer
    }
  
    static byteLength(string, encoding) {
      if (ArrayBuffer.isView(string) || Buffer.isInstance(string, ArrayBuffer)) {
        return string.byteLength
      }
      if (typeof SharedArrayBuffer !== 'undefined' &&
        Buffer.isInstance(string, SharedArrayBuffer)) {
        return string.byteLength
      }
      if (typeof string !== 'string') {
        throw new TypeError(
          'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
          'Received type ' + typeof string
        )
      }
  
      const len = string.length
      const mustMatch = (arguments.length > 2 && arguments[2] === true)
      if (!mustMatch && len === 0) return 0
  
      // Use a for loop to avoid recursion
      let loweredCase = false
      for (;;) {
        switch (encoding) {
          case 'ascii':
          case 'latin1':
          case 'binary':
            return len
          case 'utf8':
          case 'utf-8':
            return utf8ToBytes(string).length
          case 'ucs2':
          case 'ucs-2':
          case 'utf16le':
          case 'utf-16le':
            return len * 2
          case 'hex':
            return len >>> 1
          case 'base64':
            return base64ToBytes(string).length
          default:
            if (loweredCase) {
              return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
            }
            encoding = ('' + encoding).toLowerCase()
            loweredCase = true
        }
      }
    }
  
    static slowToString(encoding, start, end) {
      let loweredCase = false
  
      // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
      // property of a typed array.
  
      // This behaves neither like String nor Uint8Array in that we set start/end
      // to their upper/lower bounds if the value passed is out of range.
      // undefined is handled specially as per ECMA-262 6th Edition,
      // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
      if (start === undefined || start < 0) {
        start = 0
      }
      // Return early if start > this.length. Done here to prevent potential uint32
      // coercion fail below.
      if (start > this.length) {
        return ''
      }
  
      if (end === undefined || end > this.length) {
        end = this.length
      }
  
      if (end <= 0) {
        return ''
      }
  
      // Force coercion to uint32. This will also coerce falsey/NaN values to 0.
      end >>>= 0
      start >>>= 0
  
      if (end <= start) {
        return ''
      }
  
      if (!encoding) encoding = 'utf8'
  
      while (true) {
        switch (encoding) {
          case 'hex':
            return hexSlice(this, start, end)
  
          case 'utf8':
          case 'utf-8':
            return utf8Slice(this, start, end)
  
          case 'ascii':
            return asciiSlice(this, start, end)
  
          case 'latin1':
          case 'binary':
            return latin1Slice(this, start, end)
  
          case 'base64':
            return base64Slice(this, start, end)
  
          case 'ucs2':
          case 'ucs-2':
          case 'utf16le':
          case 'utf-16le':
            return utf16leSlice(this, start, end)
  
          default:
            if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
            encoding = (encoding + '').toLowerCase()
            loweredCase = true
        }
      }
    }
  
    swap16() {
      const len = this.length
      if (len % 2 !== 0) {
        throw new RangeError('Buffer size must be a multiple of 16-bits')
      }
      for (let i = 0; i < len; i += 2) {
        swap(this, i, i + 1)
      }
      return this
    }
  
    swap32() {
      const len = this.length
      if (len % 4 !== 0) {
        throw new RangeError('Buffer size must be a multiple of 32-bits')
      }
      for (let i = 0; i < len; i += 4) {
        swap(this, i, i + 3)
        swap(this, i + 1, i + 2)
      }
      return this
    }
  
    swap64() {
      const len = this.length
      if (len % 8 !== 0) {
        throw new RangeError('Buffer size must be a multiple of 64-bits')
      }
      for (let i = 0; i < len; i += 8) {
        swap(this, i, i + 7)
        swap(this, i + 1, i + 6)
        swap(this, i + 2, i + 5)
        swap(this, i + 3, i + 4)
      }
      return this
    }
  
    toString() {
      const length = this.length
      if (length === 0) return ''
      if (arguments.length === 0) return utf8Slice(this, 0, length)
      return Buffer.slowToString.apply(this, arguments)
    }
  
    toLocaleString() {
      return this.toString()
    }
  
    equalsequals(b) {
      if (this === b) return true
      return Buffer.compare(this, b) === 0
    }
  
    inspect() {
      let str = ''
      const max = INSPECT_MAX_BYTES
      str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
      if (this.length > max) str += ' ... '
      return '<Buffer ' + str + '>'
    }
  
    compare(target, start, end, thisStart, thisEnd) {
      if (!Buffer.isInstance(target, Uint8Array)) {
        throw new TypeError(
          'The "target" argument must be one of type Buffer or Uint8Array. ' +
          'Received type ' + (typeof target)
        )
      }
  
      if (start === undefined) {
        start = 0
      }
      if (end === undefined) {
        end = target ? target.length : 0
      }
      if (thisStart === undefined) {
        thisStart = 0
      }
      if (thisEnd === undefined) {
        thisEnd = this.length
      }
  
      if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
        throw new RangeError('out of range index')
      }
  
      if (thisStart >= thisEnd && start >= end) {
        return 0
      }
      if (thisStart >= thisEnd) {
        return -1
      }
      if (start >= end) {
        return 1
      }
  
      start >>>= 0
      end >>>= 0
      thisStart >>>= 0
      thisEnd >>>= 0
  
      if (this === target) return 0
  
      let x = thisEnd - thisStart
      let y = end - start
      const len = Math.min(x, y)
  
      for (let i = 0; i < len; ++i) {
        if (this[thisStart + i] !== target[start + i]) {
          x = this[thisStart + i]
          y = target[start + i]
          break
        }
      }
  
      if (x < y) return -1
      if (y < x) return 1
      return 0
    }
  
  
    includes(val, byteOffset, encoding) {
      return this.indexOf(val, byteOffset, encoding) !== -1
    }
  
    indexOf(val, byteOffset, encoding) {
      return Buffer.bidirectionalIndexOf(this, val, byteOffset, encoding, true)
    }
  
    lastIndexOf(val, byteOffset, encoding) {
      return Buffer.bidirectionalIndexOf(this, val, byteOffset, encoding, false)
    }
  
    write(string, offset, length, encoding) {
      // Buffer#write(string)
      if (offset === undefined) {
        encoding = 'utf8'
        length = this.length
        offset = 0
        // Buffer#write(string, encoding)
      } else if (length === undefined && typeof offset === 'string') {
        encoding = offset
        length = this.length
        offset = 0
        // Buffer#write(string, offset[, length][, encoding])
      } else if (isFinite(offset)) {
        offset = offset >>> 0
        if (isFinite(length)) {
          length = length >>> 0
          if (encoding === undefined) encoding = 'utf8'
        } else {
          encoding = length
          length = undefined
        }
      } else {
        throw new Error(
          'Buffer.write(string, encoding, offset[, length]) is no longer supported'
        )
      }
  
      const remaining = this.length - offset
      if (length === undefined || length > remaining) length = remaining
  
      if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
        throw new RangeError('Attempt to write outside buffer bounds')
      }
  
      if (!encoding) encoding = 'utf8'
  
      let loweredCase = false
      for (;;) {
        switch (encoding) {
          case 'hex':
            return hexWrite(this, string, offset, length)
  
          case 'utf8':
          case 'utf-8':
            return utf8Write(this, string, offset, length)
  
          case 'ascii':
          case 'latin1':
          case 'binary':
            return asciiWrite(this, string, offset, length)
  
          case 'base64':
            // Warning: maxLength not taken into account in base64Write
            return base64Write(this, string, offset, length)
  
          case 'ucs2':
          case 'ucs-2':
          case 'utf16le':
          case 'utf-16le':
            return ucs2Write(this, string, offset, length)
  
          default:
            if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
            encoding = ('' + encoding).toLowerCase()
            loweredCase = true
        }
      }
    }
  
    toJSON() {
      return {
        type: 'Buffer',
        data: Array.prototype.slice.call(this, 0)
      }
    }
  
    slice(start, end) {
      const len = this.length
      start = ~~start
      end = end === undefined ? len : ~~end
  
      if (start < 0) {
        start += len
        if (start < 0) start = 0
      } else if (start > len) {
        start = len
      }
  
      if (end < 0) {
        end += len
        if (end < 0) end = 0
      } else if (end > len) {
        end = len
      }
  
      if (end < start) end = start
  
      const newBuf = this.subarray(start, end)
      // Return an augmented `Uint8Array` instance
      Object.setPrototypeOf(newBuf, Buffer.prototype)
  
      return newBuf
    }
  
    /*
     * Need to make sure that buffer isn't trying to write out of bounds.
     */
    static checkOffset(offset, ext, length) {
      if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
      if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
    }
  
    readUIntLE(offset, byteLength, noAssert) {
      offset = offset >>> 0
      byteLength = byteLength >>> 0
      if (!noAssert) Buffer.checkOffset(offset, byteLength, this.length)
  
      let val = this[offset]
      let mul = 1
      let i = 0
      while (++i < byteLength && (mul *= 0x100)) {
        val += this[offset + i] * mul
      }
  
      return val
    }
  
    readUintLE(offset, byteLength, noAssert) {
      return this.readUIntLE(offset, byteLength, noAssert)
    }
  
    readUIntBE(offset, byteLength, noAssert) {
      offset = offset >>> 0
      byteLength = byteLength >>> 0
      if (!noAssert) {
        Buffer.checkOffset(offset, byteLength, this.length)
      }
  
      let val = this[offset + --byteLength]
      let mul = 1
      while (byteLength > 0 && (mul *= 0x100)) {
        val += this[offset + --byteLength] * mul
      }
  
      return val
    }
  
    readUintBE(offset, byteLength, noAssert) {
      return this.readUIntBE(offset, byteLength, noAssert)
    }
  
    readUInt8(offset, noAssert) {
      offset = offset >>> 0
      if (!noAssert) Buffer.checkOffset(offset, 1, this.length)
      return this[offset]
    }
  
    readUint8(offset, noAssert) {
      return this.readUInt8(offset, noAssert)
    }
  
    readUInt16LE(offset, noAssert) {
      offset = offset >>> 0
      if (!noAssert) Buffer.checkOffset(offset, 2, this.length)
      return this[offset] | (this[offset + 1] << 8)
    }
  
    readUint16LE(offset, noAssert) {
      return this.readUInt16LE(offset, noAssert)
    }
  
    readUInt16BE(offset, noAssert) {
      offset = offset >>> 0
      if (!noAssert) Buffer.checkOffset(offset, 2, this.length)
      return (this[offset] << 8) | this[offset + 1]
    }
  
    readUint16BE(offset, noAssert) {
      return this.readUInt16BE(offset, noAssert)
    }
  
    readUInt32LE(offset, noAssert) {
      offset = offset >>> 0
      if (!noAssert) Buffer.checkOffset(offset, 4, this.length)
  
      return ((this[offset]) |
          (this[offset + 1] << 8) |
          (this[offset + 2] << 16)) +
        (this[offset + 3] * 0x1000000)
    }
  
    readUint32LE(offset, noAssert) {
      return this.readUInt32LE(offset, noAssert)
    }
  
    readUInt32BE(offset, noAssert) {
      offset = offset >>> 0
      if (!noAssert) Buffer.checkOffset(offset, 4, this.length)
  
      return (this[offset] * 0x1000000) +
        ((this[offset + 1] << 16) |
          (this[offset + 2] << 8) |
          this[offset + 3])
    }
  
    readUint32BE(offset, noAssert) {
      return this.readUInt32BE(offset, noAssert)
    }
  
    readBigUInt64LE(offset) {
      if (typeof BigInt === 'undefined') throw new Error('BigInt not supported')
      offset = offset >>> 0
      validateNumber(offset, 'offset')
      const first = this[offset]
      const last = this[offset + 7]
      if (first === undefined || last === undefined) {
        boundsError(offset, this.length - 8)
      }
  
      const lo = first +
        this[++offset] * 2 ** 8 +
        this[++offset] * 2 ** 16 +
        this[++offset] * 2 ** 24
  
      const hi = this[++offset] +
        this[++offset] * 2 ** 8 +
        this[++offset] * 2 ** 16 +
        last * 2 ** 24
  
      return BigInt(lo) + (BigInt(hi) << BigInt(32))
    }
  
    readBigUInt64BE(offset) {
      if (typeof BigInt === 'undefined') throw new Error('BigInt not supported')
  
      offset = offset >>> 0
      validateNumber(offset, 'offset')
      const first = this[offset]
      const last = this[offset + 7]
      if (first === undefined || last === undefined) {
        boundsError(offset, this.length - 8)
      }
  
      const hi = first * 2 ** 24 +
        this[++offset] * 2 ** 16 +
        this[++offset] * 2 ** 8 +
        this[++offset]
  
      const lo = this[++offset] * 2 ** 24 +
        this[++offset] * 2 ** 16 +
        this[++offset] * 2 ** 8 +
        last
  
      return (BigInt(hi) << BigInt(32)) + BigInt(lo)
    }
  
    readIntLE(offset, byteLength, noAssert) {
      offset = offset >>> 0
      byteLength = byteLength >>> 0
      if (!noAssert) Buffer.checkOffset(offset, byteLength, this.length)
  
      let val = this[offset]
      let mul = 1
      let i = 0
      while (++i < byteLength && (mul *= 0x100)) {
        val += this[offset + i] * mul
      }
      mul *= 0x80
  
      if (val >= mul) val -= Math.pow(2, 8 * byteLength)
  
      return val
    }
  
    readIntBE(offset, byteLength, noAssert) {
      offset = offset >>> 0
      byteLength = byteLength >>> 0
      if (!noAssert) Buffer.checkOffset(offset, byteLength, this.length)
  
      let i = byteLength
      let mul = 1
      let val = this[offset + --i]
      while (i > 0 && (mul *= 0x100)) {
        val += this[offset + --i] * mul
      }
      mul *= 0x80
  
      if (val >= mul) val -= Math.pow(2, 8 * byteLength)
  
      return val
    }
  
    readInt8(offset, noAssert) {
      offset = offset >>> 0
      if (!noAssert) Buffer.checkOffset(offset, 1, this.length)
      if (!(this[offset] & 0x80)) return (this[offset])
      return ((0xff - this[offset] + 1) * -1)
    }
  
    readInt16LE(offset, noAssert) {
      offset = offset >>> 0
      if (!noAssert) Buffer.checkOffset(offset, 2, this.length)
      const val = this[offset] | (this[offset + 1] << 8)
      return (val & 0x8000) ? val | 0xFFFF0000 : val
    }
  
    readInt16BE(offset, noAssert) {
      offset = offset >>> 0
      if (!noAssert) Buffer.checkOffset(offset, 2, this.length)
      const val = this[offset + 1] | (this[offset] << 8)
      return (val & 0x8000) ? val | 0xFFFF0000 : val
    }
  
    readInt32LE(offset, noAssert) {
      offset = offset >>> 0
      if (!noAssert) Buffer.checkOffset(offset, 4, this.length)
  
      return (this[offset]) |
        (this[offset + 1] << 8) |
        (this[offset + 2] << 16) |
        (this[offset + 3] << 24)
    }
  
    readInt32BE(offset, noAssert) {
      offset = offset >>> 0
      if (!noAssert) Buffer.checkOffset(offset, 4, this.length)
  
      return (this[offset] << 24) |
        (this[offset + 1] << 16) |
        (this[offset + 2] << 8) |
        (this[offset + 3])
    }
  
    readBigInt64LE(offset) {
      if (typeof BigInt === 'undefined') throw new Error('BigInt not supported')
  
      offset = offset >>> 0
      validateNumber(offset, 'offset')
      const first = this[offset]
      const last = this[offset + 7]
      if (first === undefined || last === undefined) {
        boundsError(offset, this.length - 8)
      }
  
      const val = this[offset + 4] +
        this[offset + 5] * 2 ** 8 +
        this[offset + 6] * 2 ** 16 +
        (last << 24) // Overflow
  
      return (BigInt(val) << BigInt(32)) +
        BigInt(first +
          this[++offset] * 2 ** 8 +
          this[++offset] * 2 ** 16 +
          this[++offset] * 2 ** 24)
    }
  
    readBigInt64BE(offset) {
      if (typeof BigInt === 'undefined') throw new Error('BigInt not supported')
  
      offset = offset >>> 0
      validateNumber(offset, 'offset')
      const first = this[offset]
      const last = this[offset + 7]
      if (first === undefined || last === undefined) {
        boundsError(offset, this.length - 8)
      }
  
      const val = (first << 24) + // Overflow
        this[++offset] * 2 ** 16 +
        this[++offset] * 2 ** 8 +
        this[++offset]
  
      return (BigInt(val) << BigInt(32)) +
        BigInt(this[++offset] * 2 ** 24 +
          this[++offset] * 2 ** 16 +
          this[++offset] * 2 ** 8 +
          last)
    }
  
    readFloatLE(offset, noAssert) {
      offset = offset >>> 0
      if (!noAssert) Buffer.checkOffset(offset, 4, this.length)
      return ieee754.read(this, offset, true, 23, 4)
    }
  
    readFloatBE(offset, noAssert) {
      offset = offset >>> 0
      if (!noAssert) Buffer.checkOffset(offset, 4, this.length)
      return ieee754.read(this, offset, false, 23, 4)
    }
  
    readDoubleLE(offset, noAssert) {
      offset = offset >>> 0
      if (!noAssert) Buffer.checkOffset(offset, 8, this.length)
      return ieee754.read(this, offset, true, 52, 8)
    }
  
    readDoubleBE(offset, noAssert) {
      offset = offset >>> 0
      if (!noAssert) Buffer.checkOffset(offset, 8, this.length)
      return ieee754.read(this, offset, false, 52, 8)
    }
  
    static checkInt(buf, value, offset, ext, max, min) {
      if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
      if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
      if (offset + ext > buf.length) throw new RangeError('Index out of range')
    }
  
    writeUIntLE(value, offset, byteLength, noAssert) {
      value = +value
      offset = offset >>> 0
      byteLength = byteLength >>> 0
      if (!noAssert) {
        const maxBytes = Math.pow(2, 8 * byteLength) - 1
        Buffer.checkInt(this, value, offset, byteLength, maxBytes, 0)
      }
  
      let mul = 1
      let i = 0
      this[offset] = value & 0xFF
      while (++i < byteLength && (mul *= 0x100)) {
        this[offset + i] = (value / mul) & 0xFF
      }
  
      return offset + byteLength
    }
  
    writeUintLE(value, offset, byteLength, noAssert) {
      return this.writeUIntLE(value, offset, byteLength, noAssert)
    }
  
    writeUIntBE(value, offset, byteLength, noAssert) {
      value = +value
      offset = offset >>> 0
      byteLength = byteLength >>> 0
      if (!noAssert) {
        const maxBytes = Math.pow(2, 8 * byteLength) - 1
        Buffer.checkInt(this, value, offset, byteLength, maxBytes, 0)
      }
  
      let i = byteLength - 1
      let mul = 1
      this[offset + i] = value & 0xFF
      while (--i >= 0 && (mul *= 0x100)) {
        this[offset + i] = (value / mul) & 0xFF
      }
  
      return offset + byteLength
    }
  
    writeUintBE(value, offset, byteLength, noAssert) {
      return this.writeUIntBE(value, offset, byteLength, noAssert)
    }
  
  
    writeUInt8(value, offset, noAssert) {
      value = +value
      offset = offset >>> 0
      if (!noAssert) Buffer.checkInt(this, value, offset, 1, 0xff, 0)
      this[offset] = (value & 0xff)
      return offset + 1
    }
  
    writeUint8(value, offset, noAssert) {
      return this.writeUInt8(value, offset, noAssert)
    }
  
    writeUInt16LE(value, offset, noAssert) {
      value = +value
      offset = offset >>> 0
      if (!noAssert) Buffer.checkInt(this, value, offset, 2, 0xffff, 0)
      this[offset] = (value & 0xff)
      this[offset + 1] = (value >>> 8)
      return offset + 2
    }
  
    writeUint16LE(value, offset, noAssert) {
      return this.writeUInt16LE(value, offset, noAssert)
    }
  
    writeUInt16BE(value, offset, noAssert) {
      value = +value
      offset = offset >>> 0
      if (!noAssert) Buffer.checkInt(this, value, offset, 2, 0xffff, 0)
      this[offset] = (value >>> 8)
      this[offset + 1] = (value & 0xff)
      return offset + 2
    }
  
    writeUint16BE(value, offset, noAssert) {
      return this.writeUInt16BE(value, offset, noAssert)
    }
  
    writeUInt32LE(value, offset, noAssert) {
      value = +value
      offset = offset >>> 0
      if (!noAssert) Buffer.checkInt(this, value, offset, 4, 0xffffffff, 0)
      this[offset + 3] = (value >>> 24)
      this[offset + 2] = (value >>> 16)
      this[offset + 1] = (value >>> 8)
      this[offset] = (value & 0xff)
      return offset + 4
    }
    writeUint32LE(value, offset, noAssert) {
      return this.writeUInt32LE(value, offset, noAssert)
    }
  
    writeUInt32BE(value, offset, noAssert) {
      value = +value
      offset = offset >>> 0
      if (!noAssert) Buffer.checkInt(this, value, offset, 4, 0xffffffff, 0)
      this[offset] = (value >>> 24)
      this[offset + 1] = (value >>> 16)
      this[offset + 2] = (value >>> 8)
      this[offset + 3] = (value & 0xff)
      return offset + 4
    }
  
    writeUint32BE(value, offset, noAssert) {
      return this.writeUInt32BE(value, offset, noAssert)
    }
  
    writeBigUInt64LE(value, offset = 0) {
      if (typeof BigInt === 'undefined') throw new Error('BigInt not supported')
  
      return wrtBigUInt64LE(this, value, offset, BigInt(0), BigInt('0xffffffffffffffff'))
    }
  
    writeBigUInt64BE(value, offset = 0) {
      if (typeof BigInt === 'undefined') throw new Error('BigInt not supported')
  
      return wrtBigUInt64BE(this, value, offset, BigInt(0), BigInt('0xffffffffffffffff'))
    }
  
    writeIntLE(value, offset, byteLength, noAssert) {
      value = +value
      offset = offset >>> 0
      if (!noAssert) {
        const limit = Math.pow(2, (8 * byteLength) - 1)
  
        Buffer.checkInt(this, value, offset, byteLength, limit - 1, -limit)
      }
  
      let i = 0
      let mul = 1
      let sub = 0
      this[offset] = value & 0xFF
      while (++i < byteLength && (mul *= 0x100)) {
        if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
          sub = 1
        }
        this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
      }
  
      return offset + byteLength
    }
  
    writeIntBE(value, offset, byteLength, noAssert) {
      value = +value
      offset = offset >>> 0
      if (!noAssert) {
        const limit = Math.pow(2, (8 * byteLength) - 1)
  
        Buffer.checkInt(this, value, offset, byteLength, limit - 1, -limit)
      }
  
      let i = byteLength - 1
      let mul = 1
      let sub = 0
      this[offset + i] = value & 0xFF
      while (--i >= 0 && (mul *= 0x100)) {
        if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
          sub = 1
        }
        this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
      }
  
      return offset + byteLength
    }
  
    writeInt8(value, offset, noAssert) {
      value = +value
      offset = offset >>> 0
      if (!noAssert) Buffer.checkInt(this, value, offset, 1, 0x7f, -0x80)
      if (value < 0) value = 0xff + value + 1
      this[offset] = (value & 0xff)
      return offset + 1
    }
  
    writeInt16LE(value, offset, noAssert) {
      value = +value
      offset = offset >>> 0
      if (!noAssert) Buffer.checkInt(this, value, offset, 2, 0x7fff, -0x8000)
      this[offset] = (value & 0xff)
      this[offset + 1] = (value >>> 8)
      return offset + 2
    }
  
    writeInt16BE(value, offset, noAssert) {
      value = +value
      offset = offset >>> 0
      if (!noAssert) Buffer.checkInt(this, value, offset, 2, 0x7fff, -0x8000)
      this[offset] = (value >>> 8)
      this[offset + 1] = (value & 0xff)
      return offset + 2
    }
  
    writeInt32LE(value, offset, noAssert) {
      value = +value
      offset = offset >>> 0
      if (!noAssert) Buffer.checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
      this[offset] = (value & 0xff)
      this[offset + 1] = (value >>> 8)
      this[offset + 2] = (value >>> 16)
      this[offset + 3] = (value >>> 24)
      return offset + 4
    }
  
    writeInt32BE(value, offset, noAssert) {
      value = +value
      offset = offset >>> 0
      if (!noAssert) Buffer.checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
      if (value < 0) value = 0xffffffff + value + 1
      this[offset] = (value >>> 24)
      this[offset + 1] = (value >>> 16)
      this[offset + 2] = (value >>> 8)
      this[offset + 3] = (value & 0xff)
      return offset + 4
    }
  
    writeBigInt64LE(value, offset = 0) {
      if (typeof BigInt === 'undefined') throw new Error('BigInt not supported')
  
      return wrtBigUInt64LE(this, value, offset, -BigInt('0x8000000000000000'), BigInt('0x7fffffffffffffff'))
    }
  
    writeBigInt64BE(value, offset = 0) {
      if (typeof BigInt === 'undefined') throw new Error('BigInt not supported')
  
      return wrtBigUInt64BE(this, value, offset, -BigInt('0x8000000000000000'), BigInt('0x7fffffffffffffff'))
    }
  
    writeFloatLE(value, offset, noAssert) {
      return writeFloat(this, value, offset, true, noAssert)
    }
  
    writeFloatBE(value, offset, noAssert) {
      return writeFloat(this, value, offset, false, noAssert)
    }
  
  
    writeDoubleLE(value, offset, noAssert) {
      return writeDouble(this, value, offset, true, noAssert)
    }
  
    writeDoubleBE(value, offset, noAssert) {
      return writeDouble(this, value, offset, false, noAssert)
    }
  
    copy(target, targetStart, start, end) {
      if (!Buffer.isInstance(target, Uint8Array)) throw new TypeError('argument should be a Buffer')
      if (!start) start = 0
      if (!end && end !== 0) end = this.length
      if (targetStart >= target.length) targetStart = target.length
      if (!targetStart) targetStart = 0
      if (end > 0 && end < start) end = start
  
      // Copy 0 bytes; we're done
      if (end === start) return 0
      if (target.length === 0 || this.length === 0) return 0
  
      // Fatal error conditions
      if (targetStart < 0) {
        throw new RangeError('targetStart out of bounds')
      }
      if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
      if (end < 0) throw new RangeError('sourceEnd out of bounds')
  
      // Are we oob?
      if (end > this.length) end = this.length
      if (target.length - targetStart < end - start) {
        end = target.length - targetStart + start
      }
  
      const len = end - start
  
      if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
        // Use built-in when available, missing from IE11
        this.copyWithin(targetStart, start, end)
      } else {
        Uint8Array.prototype.set.call(
          target,
          this.subarray(start, end),
          targetStart
        )
      }
  
      return len
    }
  
    // Usage:
    //    buffer.fill(number[, offset[, end]])
    //    buffer.fill(buffer[, offset[, end]])
    //    buffer.fill(string[, offset[, end]][, encoding])
    fill(val, start, end, encoding) {
      // Handle string cases:
      if (typeof val === 'string') {
        if (typeof start === 'string') {
          encoding = start
          start = 0
          end = this.length
        } else if (typeof end === 'string') {
          encoding = end
          end = this.length
        }
        if (encoding !== undefined && typeof encoding !== 'string') {
          throw new TypeError('encoding must be a string')
        }
        if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
          throw new TypeError('Unknown encoding: ' + encoding)
        }
        if (val.length === 1) {
          const code = val.charCodeAt(0)
          if ((encoding === 'utf8' && code < 128) ||
            encoding === 'latin1') {
            // Fast path: If `val` fits into a single byte, use that numeric value.
            val = code
          }
        }
      } else if (typeof val === 'number') {
        val = val & 255
      } else if (typeof val === 'boolean') {
        val = Number(val)
      }
  
      // Invalid ranges are not set to a default, so can range check early.
      if (start < 0 || this.length < start || this.length < end) {
        throw new RangeError('Out of range index')
      }
  
      if (end <= start) {
        return this
      }
  
      start = start >>> 0
      end = end === undefined ? this.length : end >>> 0
  
      if (!val) val = 0
  
      let i
      if (typeof val === 'number') {
        for (i = start; i < end; ++i) {
          this[i] = val
        }
      } else {
        const bytes = Buffer.isInstance(val, Uint8Array) ?
          val :
          Buffer.from(val, encoding)
        const len = bytes.length
        if (len === 0) {
          throw new TypeError('The value "' + val +
            '" is invalid for argument "value"')
        }
        for (i = 0; i < end - start; ++i) {
          this[i + start] = bytes[i % len]
        }
      }
  
      return this
    }
  
    // Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
    // OR the last index of `val` in `buffer` at offset <= `byteOffset`.
    //
    // Arguments:
    // - buffer - a Buffer to search
    // - val - a string, Buffer, or number
    // - byteOffset - an index into `buffer`; will be clamped to an int32
    // - encoding - an optional encoding, relevant is val is a string
    // - dir - true for indexOf, false for lastIndexOf
    static bidirectionalIndexOf(buffer, val, byteOffset, encoding, dir) {
      // Empty buffer means no match
      if (buffer.length === 0) return -1
  
      // Normalize byteOffset
      if (typeof byteOffset === 'string') {
        encoding = byteOffset
        byteOffset = 0
      } else if (byteOffset > 0x7fffffff) {
        byteOffset = 0x7fffffff
      } else if (byteOffset < -0x80000000) {
        byteOffset = -0x80000000
      }
      byteOffset = +byteOffset // Coerce to Number.
  
      if (byteOffset !== byteOffset) {
        // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
        byteOffset = dir ? 0 : (buffer.length - 1)
      }
  
      // Normalize byteOffset: negative offsets start from the end of the buffer
      if (byteOffset < 0) byteOffset = buffer.length + byteOffset
      if (byteOffset >= buffer.length) {
        if (dir) return -1
        else byteOffset = buffer.length - 1
      } else if (byteOffset < 0) {
        if (dir) byteOffset = 0
        else return -1
      }
  
      // Normalize val
      if (typeof val === 'string') {
        val = Buffer.from(val, encoding)
      }
  
      // Finally, search either indexOf (if dir is true) or lastIndexOf
      if (Buffer.isBuffer(val)) {
        // Special case: looking for empty string/buffer always fails
        if (val.length === 0) {
          return -1
        }
        return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
      } else if (typeof val === 'number') {
        val = val & 0xFF // Search for a byte value [0-255]
        if (typeof Uint8Array.prototype.indexOf === 'function') {
          if (dir) {
            return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
          } else {
            return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
          }
        }
        return arrayIndexOf(buffer, [val], byteOffset, encoding, dir)
      }
  
      throw new TypeError('val must be string, number or Buffer')
    }
  
    // ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
    // the `instanceof` check but they should be treated as of that type.
    // See: https://github.com/feross/buffer/issues/166
    static isInstance(obj, type) {
      return obj instanceof type ||
        (obj != null && obj.constructor != null && obj.constructor.name != null &&
          obj.constructor.name === type.name) ||
        (type === Uint8Array && Buffer.isBuffer(obj))
    }
  
  }

  //export 
  function SlowBuffer(length) {
    if (+length != length) { // eslint-disable-line eqeqeq
      length = 0
    }
    return Buffer.alloc(+length)
  }
  
  function checked(length) {
    // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
    // length is NaN (which is otherwise coerced to zero.)
    if (length >= K_MAX_LENGTH) {
      throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
        'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
    }
    return length | 0
  }
  
  function swap(b, n, m) {
    const i = b[n]
    b[n] = b[m]
    b[m] = i
  }
  
  function arrayIndexOf(arr, val, byteOffset, encoding, dir) {
    let indexSize = 1
    let arrLength = arr.length
    let valLength = val.length
  
    if (encoding !== undefined) {
      encoding = String(encoding).toLowerCase()
      if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
        if (arr.length < 2 || val.length < 2) {
          return -1
        }
        indexSize = 2
        arrLength /= 2
        valLength /= 2
        byteOffset /= 2
      }
    }
  
    function read(buf, i) {
      if (indexSize === 1) {
        return buf[i]
      } else {
        return buf.readUInt16BE(i * indexSize)
      }
    }
  
    let i
    if (dir) {
      let foundIndex = -1
      for (i = byteOffset; i < arrLength; i++) {
        if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
          if (foundIndex === -1) foundIndex = i
          if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
        } else {
          if (foundIndex !== -1) i -= i - foundIndex
          foundIndex = -1
        }
      }
    } else {
      if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
      for (i = byteOffset; i >= 0; i--) {
        let found = true
        for (let j = 0; j < valLength; j++) {
          if (read(arr, i + j) !== read(val, j)) {
            found = false
            break
          }
        }
        if (found) return i
      }
    }
  
    return -1
  }
  
  // hex lookup table for Buffer.from(x, 'hex')
  /* eslint-disable no-multi-spaces, indent */
  const hexCharValueTable = [
    -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1,
     0,  1,  2,  3,  4,  5,  6,  7,
     8,  9, -1, -1, -1, -1, -1, -1,
    -1, 10, 11, 12, 13, 14, 15, -1,
    -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1,
    -1, 10, 11, 12, 13, 14, 15, -1,
    -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1
  ]
  
  function hexWrite(buf, string, offset, length) {
    offset = Number(offset) || 0
    const remaining = buf.length - offset
    if (!length) {
      length = remaining
    } else {
      length = Number(length)
      if (length > remaining) {
        length = remaining
      }
    }
  
    const strLen = string.length
  
    if (length > (strLen >>> 1)) {
      length = strLen >>> 1
    }
  
    for (let i = 0; i < length; ++i) {
      const a = string.charCodeAt(i * 2 + 0)
      const b = string.charCodeAt(i * 2 + 1)
      const hi = hexCharValueTable[a & 0x7f]
      const lo = hexCharValueTable[b & 0x7f]
  
      if ((a | b | hi | lo) & ~0x7f) {
        return i
      }
  
      buf[offset + i] = (hi << 4) | lo
    }
  
    return length
  }
  
  function utf8Write(buf, string, offset, length) {
    return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
  }
  
  function asciiWrite(buf, string, offset, length) {
    return blitBuffer(asciiToBytes(string), buf, offset, length)
  }
  
  function base64Write(buf, string, offset, length) {
    return blitBuffer(base64ToBytes(string), buf, offset, length)
  }
  
  function ucs2Write(buf, string, offset, length) {
    return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
  }
  
  function base64Slice(buf, start, end) {
    if (start === 0 && end === buf.length) {
      return base64.fromByteArray(buf)
    } else {
      return base64.fromByteArray(buf.slice(start, end))
    }
  }
  
  function utf8Slice(buf, start, end) {
    end = Math.min(buf.length, end)
    const res = []
  
    let i = start
    while (i < end) {
      const firstByte = buf[i]
      let codePoint = null
      let bytesPerSequence = (firstByte > 0xEF) ? 4 :
                             (firstByte > 0xDF) ? 3 :
                             (firstByte > 0xBF) ? 2 :
                                                  1
  
      if (i + bytesPerSequence <= end) {
        let secondByte, thirdByte, fourthByte, tempCodePoint
  
        switch (bytesPerSequence) {
          case 1:
            if (firstByte < 0x80) {
              codePoint = firstByte
            }
            break
          case 2:
            secondByte = buf[i + 1]
            if ((secondByte & 0xC0) === 0x80) {
              tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
              if (tempCodePoint > 0x7F) {
                codePoint = tempCodePoint
              }
            }
            break
          case 3:
            secondByte = buf[i + 1]
            thirdByte = buf[i + 2]
            if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
              tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
              if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
                codePoint = tempCodePoint
              }
            }
            break
          case 4:
            secondByte = buf[i + 1]
            thirdByte = buf[i + 2]
            fourthByte = buf[i + 3]
            if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
              tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
              if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
                codePoint = tempCodePoint
              }
            }
        }
      }
  
      if (codePoint === null) {
        // we did not generate a valid codePoint so insert a
        // replacement char (U+FFFD) and advance only 1 byte
        codePoint = 0xFFFD
        bytesPerSequence = 1
      } else if (codePoint > 0xFFFF) {
        // encode to utf16 (surrogate pair dance)
        codePoint -= 0x10000
        res.push(codePoint >>> 10 & 0x3FF | 0xD800)
        codePoint = 0xDC00 | codePoint & 0x3FF
      }
  
      res.push(codePoint)
      i += bytesPerSequence
    }
  
    return decodeCodePointsArray(res)
  }
  
  // Based on http://stackoverflow.com/a/22747272/680742, the browser with
  // the lowest limit is Chrome, with 0x10000 args.
  // We go 1 magnitude less, for safety
  const MAX_ARGUMENTS_LENGTH = 0x1000
  
  function decodeCodePointsArray(codePoints) {
    const len = codePoints.length
    if (len <= MAX_ARGUMENTS_LENGTH) {
      return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
    }
  
    // Decode in chunks to avoid "call stack size exceeded".
    let res = ''
    let i = 0
    while (i < len) {
      res += String.fromCharCode.apply(
        String,
        codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
      )
    }
    return res
  }
  
  function asciiSlice(buf, start, end) {
    let ret = ''
    end = Math.min(buf.length, end)
  
    for (let i = start; i < end; ++i) {
      ret += String.fromCharCode(buf[i] & 0x7F)
    }
    return ret
  }
  
  function latin1Slice(buf, start, end) {
    let ret = ''
    end = Math.min(buf.length, end)
  
    for (let i = start; i < end; ++i) {
      ret += String.fromCharCode(buf[i])
    }
    return ret
  }
  
  function hexSlice(buf, start, end) {
    const len = buf.length
  
    if (!start || start < 0) start = 0
    if (!end || end < 0 || end > len) end = len
  
    let out = ''
    for (let i = start; i < end; ++i) {
      out += hexSliceLookupTable[buf[i]]
    }
    return out
  }
  
  function utf16leSlice(buf, start, end) {
    const bytes = buf.slice(start, end)
    let res = ''
    // If bytes.length is odd, the last 8 bits must be ignored (same as node.js)
    for (let i = 0; i < bytes.length - 1; i += 2) {
      res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
    }
    return res
  }
  
  function checkIEEE754(buf, value, offset, ext, max, min) {
    if (offset + ext > buf.length) throw new RangeError('Index out of range')
    if (offset < 0) throw new RangeError('Index out of range')
  }
  
  function writeFloat(buf, value, offset, littleEndian, noAssert) {
    value = +value
    offset = offset >>> 0
    if (!noAssert) {
      checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
    }
    ieee754.write(buf, value, offset, littleEndian, 23, 4)
    return offset + 4
  }
  
  function writeDouble(buf, value, offset, littleEndian, noAssert) {
    value = +value
    offset = offset >>> 0
    if (!noAssert) {
      checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
    }
    ieee754.write(buf, value, offset, littleEndian, 52, 8)
    return offset + 8
  }
  
  
  function wrtBigUInt64LE(buf, value, offset, min, max) {
    checkIntBI(value, min, max, buf, offset, 7)
  
    let lo = Number(value & BigInt(0xffffffff))
    buf[offset++] = lo
    lo = lo >> 8
    buf[offset++] = lo
    lo = lo >> 8
    buf[offset++] = lo
    lo = lo >> 8
    buf[offset++] = lo
    
    let hi = Number(value >> BigInt(32) & BigInt(0xffffffff))
    buf[offset++] = hi
    hi = hi >> 8
    buf[offset++] = hi
    hi = hi >> 8
    buf[offset++] = hi
    hi = hi >> 8
    buf[offset++] = hi
    return offset
  }
  
  function wrtBigUInt64BE(buf, value, offset, min, max) {
    checkIntBI(value, min, max, buf, offset, 7)
  
    let lo = Number(value & BigInt(0xffffffff))
    buf[offset + 7] = lo
    lo = lo >> 8
    buf[offset + 6] = lo
    lo = lo >> 8
    buf[offset + 5] = lo
    lo = lo >> 8
    buf[offset + 4] = lo
    
    let hi = Number(value >> BigInt(32) & BigInt(0xffffffff))
    buf[offset + 3] = hi
    hi = hi >> 8
    buf[offset + 2] = hi
    hi = hi >> 8
    buf[offset + 1] = hi
    hi = hi >> 8
    buf[offset] = hi
    return offset + 8
  }
  
  // CUSTOM ERRORS
  // =============
  
  // Simplified versions from Node, changed for Buffer-only usage
  const errors = {}
  
  function E(sym, getMessage, Base) {
    class NodeError extends Base {
      err;
      constructor() {
        super()
        const err = new Base(getMessage.apply(null, arguments))
        this.err = err
  
        // Node.js `err.code` properties are own/enumerable properties.
        this.err.code = sym
        // Add the error code to the name to include it in the stack trace.
        this.err.name = `${err.name} [${sym}]`
        // Remove NodeError from the stack trace.
        if (Error.captureStackTrace) {
          //Error.captureStackTrace(this.err, NodeError)
          Error.captureStackTrace(this.err, this)
        }
        // Access the stack to generate the error message including the error code
        // from the name.
        this.err.stack // eslint-disable-line no-unused-expressions
        // Reset the name to the actual name.
        delete this.err.name
  
        return this.err
      }
  
      toString() {
        return `${this.name} [${sym}]: ${this.message}`
      }
    }
    
    errors[sym] = NodeError
    
  }
  
  E('ERR_BUFFER_OUT_OF_BOUNDS', bufferOutOfBounds, RangeError)
  E('ERR_INVALID_ARG_TYPE', invalidArgType, TypeError)
  E('ERR_OUT_OF_RANGE', outOfRange, RangeError)
  
  function bufferOutOfBounds(name) {
    if (name) {
      return `${name} is outside of buffer bounds`
    }
  
    return 'Attempt to access memory outside buffer bounds'
  }
  
  function invalidArgType(name, actual) {
    return `The "${name}" argument must be of type number. Received type ${typeof actual}`
  }
  
  function outOfRange(str, range, input) {
    let msg = `The value of "${str}" is out of range.`
    let received = input
    if (Number.isInteger(input) && Math.abs(input) > 2 ** 32) {
      received = addNumericalSeparator(String(input))
    } else if (typeof input === 'bigint') {
      received = String(input)
      if (input > BigInt(2) ** BigInt(32) || input < -(BigInt(2) ** BigInt(32))) {
        received = addNumericalSeparator(received)
      }
      received += 'n'
    }
    msg += ` It must be ${range}. Received ${received}`
    return msg
  }
  
  function addNumericalSeparator(val) {
    let res = ''
    let i = val.length
    const start = val[0] === '-' ? 1 : 0
    for (; i >= start + 4; i -= 3) {
      res = `_${val.slice(i - 3, i)}${res}`
    }
    return `${val.slice(0, i)}${res}`
  }
  
  // CHECK FUNCTIONS
  // ===============
  
  function checkBounds(buf, offset, byteLength) {
    validateNumber(offset, 'offset')
    if (buf[offset] === undefined || buf[offset + byteLength] === undefined) {
      boundsError(offset, buf.length - (byteLength + 1))
    }
  }
  
  function checkIntBI(value, min, max, buf, offset, byteLength) {
    if (value > max || value < min) {
      const n = typeof min === 'bigint' ? 'n' : ''
      let range
      if (byteLength > 3) {
        if (min === 0 || min === BigInt(0)) {
          range = `>= 0${n} and < 2${n} ** ${(byteLength + 1) * 8}${n}`
        } else {
          range = `>= -(2${n} ** ${(byteLength + 1) * 8 - 1}${n}) and < 2 ** ` +
            `${(byteLength + 1) * 8 - 1}${n}`
        }
      } else {
        range = `>= ${min}${n} and <= ${max}${n}`
      }
      throw new errors.ERR_OUT_OF_RANGE('value', range, value)
    }
    checkBounds(buf, offset, byteLength)
  }
  
  function validateNumber(value, name) {
    if (typeof value !== 'number') {
      throw new errors.ERR_INVALID_ARG_TYPE(name, 'number', value)
    }
  }
  
  function boundsError(value, length, type) {
    if (Math.floor(value) !== value) {
      validateNumber(value, type)
      throw new errors.ERR_OUT_OF_RANGE(type || 'offset', 'an integer', value)
    }
  
    if (length < 0) {
      throw new errors.ERR_BUFFER_OUT_OF_BOUNDS()
    }
  
    throw new errors.ERR_OUT_OF_RANGE(type || 'offset',
      `>= ${type ? 1 : 0} and <= ${length}`,
      value)
  }
  
  // HELPER FUNCTIONS
  // ================
  
  const INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g
  
  function base64clean(str) {
    // Node takes equal signs as end of the Base64 encoding
    str = str.split('=')[0]
    // Node strips out invalid characters like \n and \t from the string, base64-js does not
    str = str.trim().replace(INVALID_BASE64_RE, '')
    // Node converts strings with length < 2 to ''
    if (str.length < 2) return ''
    // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
    while (str.length % 4 !== 0) {
      str = str + '='
    }
    return str
  }
  
  function utf8ToBytes(string, units) {
    units = units || Infinity
    let codePoint
    const length = string.length
    let leadSurrogate = null
    const bytes = []
  
    for (let i = 0; i < length; ++i) {
      codePoint = string.charCodeAt(i)
  
      // is surrogate component
      if (codePoint > 0xD7FF && codePoint < 0xE000) {
        // last char was a lead
        if (!leadSurrogate) {
          // no lead yet
          if (codePoint > 0xDBFF) {
            // unexpected trail
            if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
            continue
          } else if (i + 1 === length) {
            // unpaired lead
            if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
            continue
          }
  
          // valid lead
          leadSurrogate = codePoint
  
          continue
        }
  
        // 2 leads in a row
        if (codePoint < 0xDC00) {
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          leadSurrogate = codePoint
          continue
        }
  
        // valid surrogate pair
        codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
      } else if (leadSurrogate) {
        // valid bmp char, but last char was a lead
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
      }
  
      leadSurrogate = null
  
      // encode utf8
      if (codePoint < 0x80) {
        if ((units -= 1) < 0) break
        bytes.push(codePoint)
      } else if (codePoint < 0x800) {
        if ((units -= 2) < 0) break
        bytes.push(
          codePoint >> 0x6 | 0xC0,
          codePoint & 0x3F | 0x80
        )
      } else if (codePoint < 0x10000) {
        if ((units -= 3) < 0) break
        bytes.push(
          codePoint >> 0xC | 0xE0,
          codePoint >> 0x6 & 0x3F | 0x80,
          codePoint & 0x3F | 0x80
        )
      } else if (codePoint < 0x110000) {
        if ((units -= 4) < 0) break
        bytes.push(
          codePoint >> 0x12 | 0xF0,
          codePoint >> 0xC & 0x3F | 0x80,
          codePoint >> 0x6 & 0x3F | 0x80,
          codePoint & 0x3F | 0x80
        )
      } else {
        throw new Error('Invalid code point')
      }
    }
  
    return bytes
  }
  
  function asciiToBytes(str) {
    const byteArray = []
    for (let i = 0; i < str.length; ++i) {
      // Node's code seems to be doing this and not & 0x7F..
      byteArray.push(str.charCodeAt(i) & 0xFF)
    }
    return byteArray
  }
  
  function utf16leToBytes(str, units) {
    let c, hi, lo
    const byteArray = []
    for (let i = 0; i < str.length; ++i) {
      if ((units -= 2) < 0) break
  
      c = str.charCodeAt(i)
      hi = c >> 8
      lo = c % 256
      byteArray.push(lo)
      byteArray.push(hi)
    }
  
    return byteArray
  }
  
  function base64ToBytes(str) {
    return base64.toByteArray(base64clean(str))
  }
  
  function blitBuffer(src, dst, offset, length) {
    let i
    for (i = 0; i < length; ++i) {
      if ((i + offset >= dst.length) || (i >= src.length)) break
      dst[i + offset] = src[i]
    }
    return i
  }
  
  
  // Create lookup table for `toString('hex')`
  // See: https://github.com/feross/buffer/issues/219
  const hexSliceLookupTable = (function() {
    const alphabet = '0123456789abcdef'
    const table = new Array(256)
    for (let i = 0; i < 16; ++i) {
      const i16 = i * 16
      for (let j = 0; j < 16; ++j) {
        table[i16 + j] = alphabet[i] + alphabet[j]
      }
    }
    return table
  })();

  
  ///////////////////////////////
  
  function base64_js() {

    var lookup = []
    var revLookup = []
    var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array
    
    var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    for (var i = 0, len = code.length; i < len; ++i) {
      lookup[i] = code[i]
      revLookup[code.charCodeAt(i)] = i
    }
    
    // Support decoding URL-safe base64 strings, as Node.js does.
    // See: https://en.wikipedia.org/wiki/Base64#URL_applications
    revLookup['-'.charCodeAt(0)] = 62
    revLookup['_'.charCodeAt(0)] = 63
    
    function getLens (b64) {
      var len = b64.length
    
      if (len % 4 > 0) {
        throw new Error('Invalid string. Length must be a multiple of 4')
      }
    
      // Trim off extra bytes after placeholder bytes are found
      // See: https://github.com/beatgammit/base64-js/issues/42
      var validLen = b64.indexOf('=')
      if (validLen === -1) validLen = len
    
      var placeHoldersLen = validLen === len
        ? 0
        : 4 - (validLen % 4)
    
      return [validLen, placeHoldersLen]
    }
    
    // base64 is 4/3 + up to two characters of the original data
    //export 
    function byteLength (b64) {
      var lens = getLens(b64)
      var validLen = lens[0]
      var placeHoldersLen = lens[1]
      return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
    }
    
    function _byteLength (b64, validLen, placeHoldersLen) {
      return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
    }
    
    //export 
    function toByteArray (b64) {
      var tmp
      var lens = getLens(b64)
      var validLen = lens[0]
      var placeHoldersLen = lens[1]
    
      var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))
    
      var curByte = 0
    
      // if there are placeholders, only get up to the last complete 4 chars
      var len = placeHoldersLen > 0
        ? validLen - 4
        : validLen
    
      var i
      for (i = 0; i < len; i += 4) {
        tmp =
          (revLookup[b64.charCodeAt(i)] << 18) |
          (revLookup[b64.charCodeAt(i + 1)] << 12) |
          (revLookup[b64.charCodeAt(i + 2)] << 6) |
          revLookup[b64.charCodeAt(i + 3)]
        arr[curByte++] = (tmp >> 16) & 0xFF
        arr[curByte++] = (tmp >> 8) & 0xFF
        arr[curByte++] = tmp & 0xFF
      }
    
      if (placeHoldersLen === 2) {
        tmp =
          (revLookup[b64.charCodeAt(i)] << 2) |
          (revLookup[b64.charCodeAt(i + 1)] >> 4)
        arr[curByte++] = tmp & 0xFF
      }
    
      if (placeHoldersLen === 1) {
        tmp =
          (revLookup[b64.charCodeAt(i)] << 10) |
          (revLookup[b64.charCodeAt(i + 1)] << 4) |
          (revLookup[b64.charCodeAt(i + 2)] >> 2)
        arr[curByte++] = (tmp >> 8) & 0xFF
        arr[curByte++] = tmp & 0xFF
      }
    
      return arr
    }
    
    function tripletToBase64 (num) {
      return lookup[num >> 18 & 0x3F] +
        lookup[num >> 12 & 0x3F] +
        lookup[num >> 6 & 0x3F] +
        lookup[num & 0x3F]
    }
    
    function encodeChunk (uint8, start, end) {
      var tmp
      var output = []
      for (var i = start; i < end; i += 3) {
        tmp =
          ((uint8[i] << 16) & 0xFF0000) +
          ((uint8[i + 1] << 8) & 0xFF00) +
          (uint8[i + 2] & 0xFF)
        output.push(tripletToBase64(tmp))
      }
      return output.join('')
    }
    
    //export 
    function fromByteArray (uint8) {
      var tmp
      var len = uint8.length
      var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
      var parts = []
      var maxChunkLength = 16383 // must be multiple of 3
    
      // go through the array every three bytes, we'll deal with trailing stuff later
      for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
        parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
      }
    
      // pad the end with zeros, but make sure to not forget the extra bytes
      if (extraBytes === 1) {
        tmp = uint8[len - 1]
        parts.push(
          lookup[tmp >> 2] +
          lookup[(tmp << 4) & 0x3F] +
          '=='
        )
      } else if (extraBytes === 2) {
        tmp = (uint8[len - 2] << 8) + uint8[len - 1]
        parts.push(
          lookup[tmp >> 10] +
          lookup[(tmp >> 4) & 0x3F] +
          lookup[(tmp << 2) & 0x3F] +
          '='
        )
      }
    
      return parts.join('')
    }
    
   
   return { byteLength, toByteArray, fromByteArray }
 
  }
  
  function ieee754_js() {
    /*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
    //export 
    function read() {
      const [ buffer, offset, isLE, mLen, nBytes ] = arguments
      let e, m
      const eLen = (nBytes * 8) - mLen - 1
      const eMax = (1 << eLen) - 1
      const eBias = eMax >> 1
      let nBits = -7
      let i = isLE ? (nBytes - 1) : 0
      const d = isLE ? -1 : 1
      let s = buffer[offset + i]
    
      i += d
    
      e = s & ((1 << (-nBits)) - 1)
      s >>= (-nBits)
      nBits += eLen
      while (nBits > 0) {
        e = (e * 256) + buffer[offset + i]
        i += d
        nBits -= 8
      }
    
      m = e & ((1 << (-nBits)) - 1)
      e >>= (-nBits)
      nBits += mLen
      while (nBits > 0) {
        m = (m * 256) + buffer[offset + i]
        i += d
        nBits -= 8
      }
    
      if (e === 0) {
        e = 1 - eBias
      } else if (e === eMax) {
        return m ? NaN : ((s ? -1 : 1) * Infinity)
      } else {
        m = m + Math.pow(2, mLen)
        e = e - eBias
      }
      return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
    }
    
    //export 
    function write() {
      const [ buffer, value, offset, isLE, mLen, nBytes ] = arguments
      let e, m, c
      let eLen = (nBytes * 8) - mLen - 1
      const eMax = (1 << eLen) - 1
      const eBias = eMax >> 1
      const rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
      let i = isLE ? 0 : (nBytes - 1)
      const d = isLE ? 1 : -1
      const s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0
    
      value = Math.abs(value)
    
      if (isNaN(value) || value === Infinity) {
        m = isNaN(value) ? 1 : 0
        e = eMax
      } else {
        e = Math.floor(Math.log(value) / Math.LN2)
        if (value * (c = Math.pow(2, -e)) < 1) {
          e--
          c *= 2
        }
        if (e + eBias >= 1) {
          value += rt / c
        } else {
          value += rt * Math.pow(2, 1 - eBias)
        }
        if (value * c >= 2) {
          e++
          c /= 2
        }
    
        if (e + eBias >= eMax) {
          m = 0
          e = eMax
        } else if (e + eBias >= 1) {
          m = ((value * c) - 1) * Math.pow(2, mLen)
          e = e + eBias
        } else {
          m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
          e = 0
        }
      }
    
      while (mLen >= 8) {
        buffer[offset + i] = m & 0xff
        i += d
        m /= 256
        mLen -= 8
      }
    
      e = (e << mLen) | m
      eLen += mLen
      while (eLen > 0) {
        buffer[offset + i] = e & 0xff
        i += d
        e /= 256
        eLen -= 8
      }
    
      buffer[offset + i - d] |= s * 128
    }
    
    return { read, write }
  }
  Buffer.prototype._isBuffer = true;

  
  
  return {
    Buffer,
    SlowBuffer,
    INSPECT_MAX_BYTES,
    K_MAX_LENGTH,
    kStringMaxLength,
    constants,
    Blob: _Blob,
    File: _File,
    atob: _atob,
    btoa: _btoa
  }
}