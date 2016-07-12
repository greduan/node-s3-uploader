'use strict';

var assert = require('assert');
var td = require('testdouble');

if (global.Attachments == null) {
  require(__dirname + '/../../../lib/Attachments');
}

var createKnoxMock = function () {
  return {
    putFile: td.function(),
  };
};

describe('Attachments module', function () {

  describe('Initialization', function () {

    it('Should not throw at initialization without opts arg', function () {
      assert.doesNotThrow(function () {
        var a = new Attachments(createKnoxMock());
      }, Error);
    });

    it('Should populate defaults correctly', function () {
      var a = new Attachments(createKnoxMock());

      assert.equal(a._pathPrefix, '');
      assert.equal(a._maxFileSize, 0);
      assert.ok(Array.isArray(a._acceptedMimeTypes));
    });

    it('Should populate not-given defaults correctly', function () {
      var a = new Attachments(createKnoxMock(), {});

      assert.equal(a._pathPrefix, '');
      assert.equal(a._maxFileSize, 0);
      assert.ok(Array.isArray(a._acceptedMimeTypes));
    });

    it('Should respect optional passed-in options', function () {
      var a = new Attachments(createKnoxMock(), {
        pathPrefix: '/boop',
        maxFileSize: 512,
        acceptedMimeTypes: ['image/png'],
      });

      assert.equal(a._pathPrefix, '/boop');
      assert.equal(a._maxFileSize, 512);
      assert.deepEqual(a._acceptedMimeTypes, ['image/png']);
    });

  });

  describe('#_checkConstraints', function () {

    var bigFilePath = __dirname + '/big-file.txt';

    describe('Max file size', function () {

      var fileSizeError = new Error('Attachments: File too big');

      it('Should return error for file bigger than limit', function () {
        var a = new Attachments(createKnoxMock(), {
          maxFileSize: 1023,
        });

        assert.deepEqual(a._checkConstraints(bigFilePath), fileSizeError);
      });

      it('Should allow file that does not break limit', function () {
        var a = new Attachments(createKnoxMock(), {
          maxFileSize: 1024,
        });

        assert.notDeepEqual(a._checkConstraints(bigFilePath), fileSizeError);
      });

    });

    describe('Accepted Mimetypes', function () {

      var mimeTypeError = new Error('Attachments: Invalid file mimetype');

      it('Should return Error for file that is not in accepted array', function () {
        var a = new Attachments(createKnoxMock(), {
          acceptedMimeTypes: ['image/png'],
        });

        assert.deepEqual(a._checkConstraints(bigFilePath), mimeTypeError);
      });

      it('Should allow file that is in accepted array', function () {
        var a = new Attachments(createKnoxMock(), {
          acceptedMimeTypes: ['text/plain'],
        });

        assert.notDeepEqual(a._checkConstraints(bigFilePath), mimeTypeError);
      });

      it('Should accept Regex as array value', function () {
        var a = new Attachments(createKnoxMock(), {
          acceptedMimeTypes: [/^.*plain$/],
        });

        assert.notDeepEqual(a._checkConstraints(bigFilePath), mimeTypeError);
      });

    });

  });

  describe('#uploadFile', function () {

    it('Should call client#putFile once');

  });

});
