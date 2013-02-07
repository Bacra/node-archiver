/**
 * node-archiver
 *
 * Copyright (c) 2012-2013 Chris Talkington, contributors.
 * Licensed under the MIT license.
 * https://github.com/ctalkington/node-archiver/blob/master/LICENSE-MIT
 */

require('../compat/buffer');

var Readable = require('readable-stream');
var inherits = require('util').inherits;

var util = require('../util');

var Archiver = module.exports = function(options) {
  var self = this;
  Readable.call(self, options);

  self.archiver = {
    processing: false,
    finalize: false,
    finalized: false,
    eof: false,
    pointer: 0,
    file: {},
    files: [],
    queue: []
  };
};

inherits(Archiver, Readable);

Archiver.prototype._read = function(n, callback) {
  var self = this;

  if (self.archiver.processing) {
    return;
  } else if (self.archiver.finalized && self.archiver.eof === false) {
    self.archiver.eof = true;
    self._push(0);
  } else if (self.archiver.finalize && self.archiver.queue.length === 0) {
    self._finalize();
  } else if (self.archiver.queue.length > 0) {
    var next = self.archiver.queue.shift();

    self._processFile(next.source, next.data, next.callback);
  }
};

Archiver.prototype._push = function(data) {
  var self = this;

  self.push(data);

  if (data.length > 0) {
    self.archiver.pointer += data.length;
  }
};

Archiver.prototype._emitErrorCallback = function(err, data) {
  var self = this;

  if (err) {
    self.emit('error', err);
  }
};

Archiver.prototype._processFile = function(source, data, callback) {
  var self = this;

  callback(new Error('method not implemented'));
};

Archiver.prototype._processQueue = function() {
  var self = this;

  if (self.archiver.processing || self.archiver.finalized) {
    return;
  }

  if (self.archiver.queue.length > 0) {
    var next = self.archiver.queue.shift();

    self._processFile(next.source, next.data, next.callback);
  } else if (self.archiver.finalize && self.archiver.queue.length === 0) {
    self._finalize();
  }
};

Archiver.prototype._finalize = function() {
  var self = this;

  self.emit('error', new Error('method not implemented'));
};

Archiver.prototype.addFile = function(source, data, callback) {
  var self = this;

  if (util.lo.isString(source)) {
    source = new Buffer(source, 'utf-8');
  } else if (util.lo.isObject(source) && util.lo.isFunction(source.pause)) {
    source.pause();
  }

  if (util.lo.isFunction(callback) === false) {
    callback = self._emitErrorCallback;
  }

  if (self.archiver.processing || self.archiver.queue.length) {
    self.archiver.queue.push({
      data: data,
      source: source,
      callback: callback
    });
  } else {
    self._processFile(source, data, callback);
  }

  return self;
};

Archiver.prototype.finalize = function(callback) {
  var self = this;

  if (util.lo.isFunction(callback)) {
    self.on('end', function(written) {
      callback(null, self.archiver.pointer);
    });
  }

  self.archiver.finalize = true;

  self._processQueue();

  return self;
};