// shim for using process in browser

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimeout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
//(function cachedSet() {
//    try {
//        if (typeof setTimeout === 'function') {
//            cachedSetTimeout = setTimeout;
//        } else {
//            cachedSetTimeout = defaultSetTimeout;
//        }
//    } catch (e) {
//        cachedSetTimeout = defaultSetTimeout;
//    }
//    try {
//        if (typeof clearTimeout === 'function') {
//            cachedClearTimeout = clearTimeout;
//        } else {
//            cachedClearTimeout = defaultClearTimeout;
//        }
//    } catch (e) {
//        cachedClearTimeout = defaultClearTimeout;
//    }
//} ())

function cachedSet() {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimeout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimeout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
}

cachedSet()

function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimeout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

export function nextTick(fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
class Item{
  constructor(fun, array) {
    this.fun = fun;
    this.array = array;
  }
  run() {
    this.fun.apply(null, this.array);
  }
}
function noop() {}

export var title = 'browser';
export var browser = true;
export var env = {};
export var argv = [];
export var version = ''; // empty string to avoid regexp issues
export var versions = {};

export var on = noop;
export var addListener = noop;
export var once = noop;
export var off = noop;
export var removeListener = noop;
export var removeAllListeners = noop;
export var emit = noop;
export var prependListener = noop;
export var prependOnceListener = noop;

export function listeners(name) { return [] }

export function binding(name) {
    throw new Error('process.binding is not supported');
};

export function cwd() { return '/' };

export function chdir(dir) {
    throw new Error('process.chdir is not supported');
};

export function umask() { return 0; };

var performance = globalThis.performance || {}
var performanceNow =
  performance.now        ||
  performance.mozNow     ||
  performance.msNow      ||
  performance.oNow       ||
  performance.webkitNow  ||
  function(){ return (new Date()).getTime() }

// generate timestamp or delta
// see http://nodejs.org/api/process.html#process_process_hrtime
export function hrtime(previousTimestamp){
  var clocktime = performanceNow.call(performance)*1e-3
  var seconds = Math.floor(clocktime)
  var nanoseconds = Math.floor((clocktime%1)*1e9)
  if (previousTimestamp) {
    seconds = seconds - previousTimestamp[0]
    nanoseconds = nanoseconds - previousTimestamp[1]
    if (nanoseconds<0) {
      seconds--
      nanoseconds += 1e9
    }
  }
  return [ seconds, nanoseconds ]
}

//export default {
//  nextTick,
//  title,
//  browser,
//  env,
//  argv,
//  version,
//  versions,
//  on,
//  addListener,
//  once,
//  off,
//  removeListener,
//  removeAllListeners,
//  emit,
//  prependListener,
//  prependOnceListener,
//  listeners,
//  binding,
//  cwd,
//  chdir,
//  umask,
//  hrtime
//}


//var process = {};
//process.nextTick = nextTick 
//process.title = title;
//process.browser = browser;
//process.env = env;
//process.argv = argv;
//process.version = version; // empty string to avoid regexp issues
//process.versions = versions;
//process.on = on;
//process.addListener = addListener;
//process.once = once;
//process.off = off;
//process.removeListener = removeListener;
//process.removeAllListeners = removeAllListeners;
//process.emit = emit;
//process.prependListener = prependListener;
//process.prependOnceListener = prependOnceListener;
//process.listeners = listeners
//process.binding = binding
//process.cwd = cwd
//process.chdir = chdir
//process.umask = umask
//export default process

//module.exports = process.hrtime || hrtime

// polyfil for window.performance.now
