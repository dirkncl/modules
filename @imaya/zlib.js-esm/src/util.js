/**
 * @fileoverview A module implementation that brings together a variety of miscellaneous functions.
 */

/**
 * Convert a byte string to a byte array.
 * @param {!string} str byte string.
 * @return {!Array.<number>} byte array.
 */
export function stringToByteArray(str) {
  /** @type {!Array.<(string|number)>} */
  var tmp = str.split('');
  /** @type {number} */
  var i;
  /** @type {number} */
  var il;

  for (i = 0, il = tmp.length; i < il; i++) {
    tmp[i] = (tmp[i].charCodeAt(0) & 0xff) >>> 0;
  }

  return tmp;
};

