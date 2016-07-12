'use strict';

if (global.Class == null) {
  require('neon');
}

var fs = require('fs');
var mime = require('mime');

Class('Attachments')({

  prototype: {

    init: function (client, opts) {
      // No super routines to run

      if (client == null) {
        throw new Error('Attachments: client parameter is required');
      } else {
        this._client = client;
      }

      if (opts != null && typeof opts === 'object') {
        if (opts.pathPrefix) {
          this._pathPrefix = opts.pathPrefix;
        } else {
          this._pathPrefix = '';
        }

        if (opts.acceptedMimeTypes) {
          this._acceptedMimeTypes = opts.acceptedMimeTypes;
        } else {
          this._acceptedMimeTypes = [];
        }

        if (opts.maxFileSize) {
          this._maxFileSize = opts.maxFileSize;
        } else {
          this._maxFileSize = 0;
        }
      } else {
        this._pathPrefix = '';
        this._acceptedMimeTypes = [];
        this._maxFileSize = 0;
      }
    },

    _checkConstraints: function (srcPath) {
      if (this._acceptedMimeTypes.length > 0) {
        var fileMime = mime.lookup(srcPath);

        var result = this._acceptedMimeTypes.filter(function (val) {
          if (typeof val === 'string') {
            return (fileMime.indexOf(val) !== -1)
          } else {
            return (fileMime.match(val) !== null)
          }
        });

        if (result.length === 0) {
          return new Error('Attachments: Invalid file mimetype');
        }
      }

      if (this._maxFileSize > 0) {
        var fileSize = fs.statSync(srcPath).size;

        if (fileSize > this._maxFileSize) {
          return new Error('Attachments: File too big');
        }
      }
    },

  },

});
