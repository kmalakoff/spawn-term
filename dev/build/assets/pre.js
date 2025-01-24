"use strict";

var IntlSegmenter = typeof Intl === undefined || !Intl.Segmenter ? require('unicode-segmenter/intl-adapter').Segmenter : Intl.Segmenter;
