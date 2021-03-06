'use strict';

var assert = require('assert');
var td = require('testdouble');

if (global.S3Uploader == null) {
  require(__dirname + '/../lib');
}

var createKnoxStub = function () {
  return {
    putFile: td.function(),
  };
};

describe('S3Uploader module', function () {

  describe('Initialization', function () {

    it('Should not throw at initialization without opts arg', function () {
      assert.doesNotThrow(function () {
        var a = new S3Uploader(createKnoxStub());
      }, Error);
    });

    it('Should set this._client', function () {
      var a = new S3Uploader(createKnoxStub());

      assert.notEqual(a._client, undefined);
    });

    it('Should populate defaults correctly', function () {
      var a = new S3Uploader(createKnoxStub());

      assert.equal(a._pathPrefix, '');
      assert.equal(a._maxFileSize, 0);
      assert.ok(Array.isArray(a._acceptedMimeTypes));
    });

    it('Should populate not-given defaults correctly', function () {
      var a = new S3Uploader(createKnoxStub(), {});

      assert.equal(a._pathPrefix, '');
      assert.equal(a._maxFileSize, 0);
      assert.ok(Array.isArray(a._acceptedMimeTypes));
    });

    it('Should respect optional passed-in options', function () {
      var a = new S3Uploader(createKnoxStub(), {
        pathPrefix: '/boop',
        maxFileSize: 512,
        acceptedMimeTypes: ['image/png'],
      });

      assert.equal(a._pathPrefix, '/boop');
      assert.equal(a._maxFileSize, 512);
      assert.deepEqual(a._acceptedMimeTypes, ['image/png']);
    });

  });

  describe('#checkConstraints', function () {

    var bigFilePath = __dirname + '/big-file.txt';

    describe('Max file size', function () {

      var fileSizeError = new Error('S3Uploader: File too big');

      it('Should return error for file bigger than limit', function () {
        var a = new S3Uploader(createKnoxStub(), {
          maxFileSize: 1023,
        });

        assert.deepEqual(a.checkConstraints(bigFilePath), fileSizeError);
      });

      it('Should allow file that does not break limit', function () {
        var a = new S3Uploader(createKnoxStub(), {
          maxFileSize: 1024,
        });

        assert.notDeepEqual(a.checkConstraints(bigFilePath), fileSizeError);
      });

    });

    describe('Accepted Mimetypes', function () {

      var mimeTypeError = new Error('S3Uploader: Invalid file mimetype');

      it('Should return Error for file that is not in accepted array', function () {
        var a = new S3Uploader(createKnoxStub(), {
          acceptedMimeTypes: ['image/png'],
        });

        assert.deepEqual(a.checkConstraints(bigFilePath), mimeTypeError);
      });

      it('Should allow file that is in accepted array', function () {
        var a = new S3Uploader(createKnoxStub(), {
          acceptedMimeTypes: ['text/plain'],
        });

        assert.notDeepEqual(a.checkConstraints(bigFilePath), mimeTypeError);
      });

      it('Should accept Regex as array value', function () {
        var a = new S3Uploader(createKnoxStub(), {
          acceptedMimeTypes: [/^.*plain$/],
        });

        assert.notDeepEqual(a.checkConstraints(bigFilePath), mimeTypeError);
      });

    });

  });

  describe('#uploadFile', function () {

    // For these tests we heavily use testdouble.js, please refer to its
    // documentation: https://github.com/testdouble/testdouble.js#docs

    var bigFilePath = __dirname + '/big-file.txt';

    it('Should call #checkConstraints once', function () {
      var a = new S3Uploader(createKnoxStub());

      a.checkConstraints = td.function('checkConstraints');
      td
        .when(a.checkConstraints(bigFilePath))
        .thenReturn(undefined);

      a.uploadFile(bigFilePath, '/yay.txt');
    });

    it('Should return rejected Promise if #checkConstraints returns error', function () {
      var a = new S3Uploader(createKnoxStub());

      a.checkConstraints = td.function('checkConstraints');
      td
        .when(a.checkConstraints(bigFilePath))
        .thenReturn(new Error('S3Uploader: Invalid file mimetype'));

      var res = a.uploadFile(bigFilePath, '/yay.txt');

      assert.ok(res.then);

      return res
        .then(function () {
          throw 'Should not have resolved';
        })
        .catch(function (err) {
          assert.deepEqual(err, new Error('S3Uploader: Invalid file mimetype'));
        })
    });

    it('Should call client#putFile() once and call res.resume() once', function (doneTest) {
      // Stub code

      var resStub = {
        resume: td.function('resume'),
      };

      var putFile = td.function('putFile');
      td
        .when(putFile(bigFilePath, '/yes.txt', td.callback))
        .thenCallback(null, resStub);

      var knoxStub = {
        putFile: putFile,
      };

      // Test code

      var a = new S3Uploader(knoxStub);

      return a.uploadFile(bigFilePath, '/yes.txt')
        .then(function () {
          td.verify(
            putFile(bigFilePath, '/yes.txt', td.callback(null, resStub)),
            { times: 1 }
          );

          td.verify(resStub.resume(), { times: 1 });

          doneTest();
        })
        .catch(doneTest);
    });

    it('Should return correct String according to input', function (doneTest) {
      // Stub code

      var resStub = {
        resume: td.function('resume'),
      };

      var putFile = td.function('putFile');
      td
        .when(putFile(bigFilePath, '/foo/yes.txt', td.callback))
        .thenCallback(null, resStub);

      var knoxStub = {
        putFile: putFile,
      };

      // Test code

      var a = new S3Uploader(knoxStub, {
        pathPrefix: '/foo',
      });

      return a.uploadFile(bigFilePath, '/yes.txt')
        .then(function (destPath) {
          td.verify(
            putFile(bigFilePath, '/foo/yes.txt', td.callback(null, resStub)),
            { times: 1 }
          );

          td.verify(resStub.resume(), { times: 1 });

          assert.equal(destPath, '/foo/yes.txt');

          doneTest();
        })
        .catch(doneTest);
    });

  });

});
