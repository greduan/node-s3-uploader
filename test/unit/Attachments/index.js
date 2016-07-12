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

});
