'use strict';

if (global.Class == null) {
  require('neon');
}

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

  },

});

module.exports = {
};
