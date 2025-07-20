/**
 * @fileoverview Heap Sort Implementation. Used in Huffman coding.
 */

import { USE_TYPEDARRAY } from './hybrid.js'

/**
 * A heap implementation for use with custom Huffman codes.
 * @param {number} length :Heap size.
 * @constructor
 */
export class Heap {
  constructor(length) {
    this.buffer = new (USE_TYPEDARRAY ? Uint16Array : Array)(length * 2);
    this.length = 0;
  };
  
  /**
   * Get the parent node index
   * @param {number} index :The index of the child node.
   * @return {number}The index of the parent node.
   *
   */
  getParent(index) {
    return ((index - 2) / 4 | 0) * 2;
  }
  
  /**
  * Get the index of the child node
  * @param {number} index :The index of the parent node.
  * @return {number} The index of the child node.
  */
  getChild(index) {
    return 2 * index + 2;
  }
  
  /**
  * Add a value to the heap
  * @param {number} index :The key index.
  * @param {number} value :The value.
  * @return {number} The current heap length.
  */
  push(index, value) {
    var current, parent,
        heap = this.buffer,
        swap;
  
    current = this.length;
    heap[this.length++] = value;
    heap[this.length++] = index;
  
    // Try swapping until we reach the root node
    while (current > 0) {
      parent = this.getParent(current);
  
      // Compare with the parent node and swap if the parent is smaller
      if (heap[current] > heap[parent]) {
        swap = heap[current];
        heap[current] = heap[parent];
        heap[parent] = swap;
  
        swap = heap[current + 1];
        heap[current + 1] = heap[parent + 1];
        heap[parent + 1] = swap;
  
        current = parent;
      // If replacement is no longer necessary, exit here.
      } else {
        break;
      }
    }
  
    return this.length;
  }
  
  /**
  * Return the largest value from the heap.
  * @return {{index: number, value: number, length: number}} {index: key index,
  * value: value, length: heap length} Object.
  */
  pop() {
    var index, value,
        heap = this.buffer,
        swap,
        current, parent;
  
    value = heap[0];
    index = heap[1];
  
    // Get the value from the back
    this.length -= 2;
    heap[0] = heap[this.length];
    heap[1] = heap[this.length + 1];
  
    parent = 0;
    // Go down from the root node
    while (true) {
      current = this.getChild(parent);
  
      // Range check
      if (current >= this.length) {
        break;
      }
  
      // Compare with the neighboring node, and if the neighboring node has a larger value, select the neighboring node as the current node
      if (current + 2 < this.length && heap[current + 2] > heap[current]) {
        current += 2;
      }
  
      // Swap if parent is smaller than parent node
      if (heap[current] > heap[parent]) {
        swap = heap[parent];
        heap[parent] = heap[current];
        heap[current] = swap;
  
        swap = heap[parent + 1];
        heap[parent + 1] = heap[current + 1];
        heap[current + 1] = swap;
      } else {
        break;
      }
  
      parent = current;
    }
  
    return {
      index,
      value,
      length: this.length
    };
  }
}
