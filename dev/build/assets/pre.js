"use strict";

var IntlSegmenter = typeof Intl === 'undefined' || !Intl.Segmenter ? require('./intl-adapter.cjs').Segmenter : Intl.Segmenter;
var globalThis = global;

var _waiting = [];
var _isReady = false;
function _notifyInitialized() {
  _isReady = true;
  _waiting.slice(0).forEach(function (fn) { fn(); })
}
exports.initialize = function _initialize(fn) {
  _isReady ? fn() : _waiting.push(fn);
  return;
}
