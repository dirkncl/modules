/**
 * defines
 */

// Safari has typeof Uint8Array === 'object' To be
// Deciding to use a Typed Array based on whether it is undefined or not

/** @const {boolean} use typed array flag. */
export var USE_TYPEDARRAY =
  (typeof Uint8Array !== 'undefined') &&
  (typeof Uint16Array !== 'undefined') &&
  (typeof Uint32Array !== 'undefined') &&
  (typeof DataView !== 'undefined');
