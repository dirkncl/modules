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

import { USE_TYPEDARRAY } from './hybrid.js';

/**
 * build huffman table from length list.
 * @param {!(Array.<number>|Uint8Array)} lengths length list.
 * @return {!Array} huffman table.
 */
export function buildHuffmanTable(lengths) {
  /** @type {number} length list size. */
  var listSize = lengths.length;
  /** @type {number} max code length for table size. */
  var maxCodeLength = 0;
  /** @type {number} min code length for table size. */
  var minCodeLength = Number.POSITIVE_INFINITY;
  /** @type {number} table size. */
  var size;
  /** @type {!(Array|Uint8Array)} huffman code table. */
  var table;
  /** @type {!(Array|Uint8Array)} huffman code table. (not filled) */
  var plaintable;
  /** @type {number} bit length. */
  var bitLength;
  /** @type {number} huffman code. */
  var code;
  /**
   * The skip length to fill tables of size 2^maxlength.
   * @type {number} skip length for table filling.
   */
  var skip;
  /** @type {number} reversed code. */
  var reversed;
  /** @type {number} reverse temp. */
  var rtemp;
  /** @type {number} loop counter. */
  var i;
  /** @type {number} loop limit. */
  var il;
  /** @type {number} loop counter. */
  var j;
  /** @type {number} loop limit. */
  var jl;

  // Math.max is slow, so use a for-loop to get the longest value.
  for (i = 0, il = listSize; i < il; ++i) {
    if (lengths[i] > maxCodeLength) {
      maxCodeLength = lengths[i];
    }
    if (lengths[i] < minCodeLength) {
      minCodeLength = lengths[i];
    }
  }

  size = 1 << maxCodeLength;
  table = new (USE_TYPEDARRAY ? Uint32Array : Array)(size);
  plaintable = [];

  // Assign Huffman codes in ascending order of bit length
  for (bitLength = 1, code = 0, skip = 2; bitLength <= maxCodeLength;) {
    for (i = 0; i < listSize; ++i) {
      if (lengths[i] === bitLength) {
        // Since the bit order is reversed, reverse the bit length.
        for (reversed = 0, rtemp = code, j = 0; j < bitLength; ++j) {
          reversed = (reversed << 1) | (rtemp & 1);
          rtemp >>= 1;
        }

        // Record the raw Huffman table
        plaintable.push([i, reversed, bitLength]);

        // To create a table based on the maximum bit length、
        // Outside the maximum bit length, there are places where either 0 or 1 is acceptable.
        // By filling the areas where either is acceptable with the same value,
        // Prevent problems from occurring even if more bits than the original bit length are acquired
        for (j = reversed; j < size; j += skip) {
          table[j] = (bitLength << 16) | i;
        }

        ++code;
      }
    }

    // Go to the next bit length
    ++bitLength;
    code <<= 1;
    skip <<= 1;
  }

  return [table, maxCodeLength, minCodeLength, plaintable];
};

