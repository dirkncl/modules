/**
 * defines
 */

// Because Safari will return typeof Uint8Array === 'object' .
// Deciding to use a Typed Array based on whether it is undefined or not

/** @const {number} use typed array flag. */
export var USE_TYPEDARRAY =
  (typeof Uint8Array !== 'undefined') &&
  (typeof Uint16Array !== 'undefined') &&
  (typeof Uint32Array !== 'undefined');
