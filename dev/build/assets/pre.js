"use strict";

var IntlSegmenter = typeof Intl === 'undefined' || !Intl.Segmenter ? require('./intl-adapter.cjs').Segmenter : Intl.Segmenter;
var globalThis = global;
