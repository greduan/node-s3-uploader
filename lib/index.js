'use strict';

if (global.Class == null) {
  require('neon');
}

var fs = require('fs');
var mime = require('mime');
var path = require('path');
var Promise = require('bluebird');

Class('S3Uploader')({

  prototype: {

    init: function (client, opts) {
      // No super routines to run

      if (client == null) {
        throw new Error('S3Uploader: client parameter is required');
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
          return new Error('S3Uploader: Invalid file mimetype');
        }
      }

      if (this._maxFileSize > 0) {
        var fileSize = fs.statSync(srcPath).size;

        if (fileSize > this._maxFileSize) {
          return new Error('S3Uploader: File too big');
        }
      }
    },

    uploadFile: function (srcPath, destPath) {
      var consErr = this._checkConstraints(srcPath);

      if (consErr instanceof Error) {
        return Promise.reject(consErr);
      }

      var finalPath = path.join(this._pathPrefix, destPath);

      var that = this;

      return new Promise(function (resolve, reject) {
        that._client.putFile(srcPath, finalPath, function (err, res) {
          if (err) { return reject(err); }

          // Knox documents out that you should always do something with `res`
          // or at least call this.
          res.resume();

          resolve(finalPath);
        });
      });
    },

  },

});
