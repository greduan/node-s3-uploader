## Intro

The S3Uploader system is necessary in order for Teachers to be implemented
fully, it's just a simple interface to an Amazon S3 bucket, allowing you to
upload a file and giving you in return a URL.

Note that this is not the model for S3Uploader and those APIs, this is only the
upload system that those other parts would make use of.

## Feature summary

An individual module that provides a simple interface to uploading a file to an
Amazon S3 Bucket and getting back that file's URI on the bucket and also to have
constraints on what can be uploaded.

## Constraints

- Needs to be able to handle Documents and Images alike of any sort.
- Should be able to prevent from uploading if a file does not fulfill certain
  constraints.
- Should not upload file if over a provided byte size limit.

## Assumptions

- Will be used to upload any image, document or file the system would need.
  Branding, avatars, Teachers' documents, etc.
- Will be used alongside Multer.
- Whatever is being uploaded through streams is from a trusted source, for we
  can't check its constraints.

## Research

### Similar tools

- https://github.com/andrewrk/node-s3-client
- https://github.com/mindblaze/streaming-s3

### Resources

- Knox https://github.com/Automattic/knox
- Knox Multi-part Upload support https://github.com/nathanoehlman/knox-mpu
- `mime` https://github.com/broofa/node-mime
- Multer https://github.com/expressjs/multer

## Prototyping

- Knox client test: https://gist.github.com/greduan/0be4af8f2578a645117a3919114be3d6
- Knox functionality wrapped around a Promise: https://gist.github.com/greduan/f57ddee7d1e4888c9115e84e75a6fd3c

## Blackbox

### `#uploadFile` flowchart

<a href="https://www.lucidchart.com/publicSegments/view/9f756c47-83dd-40cb-b698-75b3eba1ccee/image.png"><img alt="#uploadFile flowchart" src="https://www.lucidchart.com/publicSegments/view/9f756c47-83dd-40cb-b698-75b3eba1ccee/image.png" width="300"></a>

## Functional spec

### `S3Uploader` class

You have a Class which on initalization takes two arguments, first of which is
required and should be an instance of a Knox client, created with
`knox.createClient`, this also allows for the tests to be mocked easily.  The
second argument is optional and should be an object, it can contain the
following properties:

```
{
  pathPrefix: String,
  acceptedMimeTypes: Array,
  maxFileSize: Number,
}
```

- `pathPrefix` is a string and should be a valid path format,
  i.e. `'/something'`.  By default an empty string.  This gets prepended to all
  files uploaded by this S3Uploader instance when building the paths.
- `acceptedMimeTypes` is an array and contains the mimetypes the S3Uploader
  instance will accept to upload.  By default an empty array, i.e. everything is
  allowed.
- `maxFileSize` is a number which is the max size the S3Uploader instance is
  willing to upload.  By default `0`, i.e. no limit.

#### `#uploadFile(srcPath, destPath)`

Returns a Promise which resolves whenever the upload is successful and the
resolve contains the full URI for the new uploaded file.  Any errors can be
caught with a call to `.catch` on the returned Promise.

Both arguments are required, `srcPath` is the path to the file that will be
uploaded to Amazon S3, should be a full path in the server's filesystem,
e.g. `/tmp/uploads/boop.png`.

`destPath` is a path for the file on the Amazon S3 cloud.  The `destPath` is
passed to `path.join('/attachments', instance.pathPrefix, filePath)` before
actually uploading, just to make sure it's a valid path.

This method would just make use of `instance._client.putFile` (Knox method) to
upload the file to the Amazon S3 bucket given to the client.

However, before uploading anything, it checks that the file it's asked to upload
meets the constraints, namely it makes sure that it doesn't break
`this.maxFileSize` and that it's in `this.acceptedMimeTypes`.  It does so by
calling `this.checkConstraints(srcPath)`, which returns an Error object or
nothing, if it returns an Error object we just return a rejected Promise with
the Error object, otherwise we continue.

#### `#uploadStream(srcStream, destPath)`

Returns a Promise which resolves whenever the upload is sucessful and the
resolve contains the full URI for the new uploaded file.  Any errors can be
caught with a call to `.catch` on the returned Promise.

Both arguments are required, `srcStream` is the stream that will be uploaded to
Amazon S3.

`destPath` is a path for the file on the Amazon S3 cloud.  The `destPath` is
passed to `path.join('/attachments', instance.pathPrefix, filePath)` before
actually uploading, just to make sure it's a valid path.

This method makes use of `knox-mpu` in order to upload the stream, we don't know
the size of the stream so this is the only way to go about this.

##### No constraints on streams

Sadly this is a limitation of the medium, so to speak.  Because of its nature,
you cannot know the length of a stream, and it's also not possible to know the
mimetype of a stream's contents.

Because of this, we cannot check to make sure the content being streamed does
not break the constraints.

We delegate this responsibility to whoever is making use of this library.

#### `#checkConstraints(srcPath)`

This function would just check the provided file path's mimetype and its size,
if its mimetype is not inside `this._acceptedMimeTypes` then it'll return an
Error object, unless `this._acceptedMimeTypes` is empty, because that means no
limits.

Important to note that the array containing the accepted mimetypes can be
composed of Strings or Regex expressions, if the file's mimetype matches any of
the values in the array then it should be uploaded, otherwise no.

It'll also check the file's size if `this._maxFileSize` is greater than `0`.  If
max file size is greater than 0 and the file's size is greater than the max file
size, then it'll return an Error object.

This function is fully synchronous.

### Reasoning for instances system and instance-based constraints

It's very simple, this way we are able to have several instances, all on the
same or on different buckets, with different prefixes or the same one, but we
are able to have different sets of constraints for different files.

For example, a PDF we may not accept one that's over 10kb in size, we'll have on
S3Uploader instance called `pdfUploader` for example, which will set its
constraints to be that it can only upload PDF files and that they can't be
bigger than 10kb.

Or images, we may not accept all of them, and those that we do we may only
accept up to a certain size.

So that's the reason the constraints are instance-based, so that we have much
more granular control over that stuff.

## Technical spec

### Class `S3Uploader(<Knox client> client, <Object> opts)`

#### Initialization

Parameters:

- `client`, Required, Knox client instance, created with `knox.createClient`
- `opts`, Optional, Object, object used to define some settings, may contain the
  following (all optional):
  - `pathPrefix`, String, added as a prefix to `#uploadFile`'s `destPath`
    argument before uploading
  - `acceptedMimeTypes`, Array, an array of the mimetypes the S3Uploader
    instance should allow itself to upload, any outside these will return an
    error when trying to upload
  - `maxFileSize`, Number, a number in bytes which delimits the max size the
    S3Uploader instance will be able to upload, trying to upload a bigger file
    would return an error

Typical use case:

```js
// global: S3Uploader
var client = knox.createClient({
  key: 'KEY',
  secret: 'SECRET KEY',
  bucket: 'BUCKET',
});

var attachments = new S3Uploader(client, {
  pathPrefix: '/attachments',
  acceptedMimeTypes: ['image/png', 'image/jpeg'],
});
```

Pseudo-code:

```
Run super init routines

If `client` is null or undefined
  Throw new Error 'S3Uploader: client parameter is required'
Else
  Set `this._client` to be `client`

If `opts` is an Object
  If `opts.pathPrefix` exists
    Set `this._pathPrefix` to be `opts.pathPrefix`
  Else
    Set `this._pathPrefix` to be an empty String

  If `opts.acceptedMimeTypes` exists
    Set `this._acceptedMimeTypes` to be `opts.acceptedMimeTypes`
  Else
    Set `this._acceptedMimeTypes` to be an empty Array

  If `opts.maxFileSize` exists
    Set `this._maxFileSize` to be `opts.maxFileSize`
  Else
    Set `this._maxFileSize` to be Number 0
Else
  Set `this._pathPrefix` to be an empty String
  Set `this._acceptedMimeTypes` to be an empty Array
  Set `this._maxFileSize` to be Number 0
```

#### `#uploadFile(<String> srcPath, <String> destPath)`

Parameters:

- `srcPath`, Required, String, it's the full path, in the server's file system,
  to the file to be uploaded, e.g. `/tmp/uploads/random-string.png`
- `destPath`, Required, String, it's the path in the bucket to upload the file
  as, e.g. `'avatar-28471'`, it is prefixed with `this._pathPrefix`

Returns:

A Promise which resolves to the path to the file in the bucket, without the
host, e.g. `'/attachments/avatar-28471'`.  Any errors can be caught with
`.catch`.

Typical use case:

```js
// attachments has pathPrefix as '/attachments'
attachments.uploadFile('/tmp/uploads/boop.png', '/attachment-boop')
  .then(function (path) {
    // path => '/attachments/attachment-boop'
  })
  .catch(...);
```

Pseudo-code:

```
Set consErr to be equal to:
  Call this.checkConstraints() with arguments:
    1. `srcPath`

If `consError` is an Error object
  Return rejected Promise with Error object

Set finalPath to be equal to:
  Call path.join() with arguments:
    1. `this._pathPrefix`
    2. `destPath`

Set that to be equal to `this`

Return new Promise with arguments:
  1. function with arguments `resolve` and `reject`
    Call `that._client.putFile` with arguments:
      1. `srcPath`
      2. `finalPath`
      3. function with arguments `err` and `res`
        If `err` is not null
          Return Call reject() with arguments:
            1. `err`
        Else
          Call res.resume() with no arguments
          Call resolve() with arguments:
            1. `finalPath`
```

#### `#uploadStream(<ReadableStream> srcStream, <String> destPath)`

Arguments:

- `srcStream`, Required, readable stream, the stream to upload as a file to the
  S3 server.
- `destPath`, Required, String, it's the path in the bucket to upload the file
  as, e.g. `'avatar-28471'`, it is prefixed with `this._pathPrefix`

Returns:

Typical use case:

```js
var readStream = fs.createReadStream('/tmp/yayfile.png')

// attachments has pathPrefix as '/attachments'
attachments.uploadStream(readStream, '/attachment-yay')
  .then(function (path) {
    // path => '/attachments/attachment-yay'
  })
  .catch(...);
```

Pseudo-code:

```
Set that to: this

Set finalPath to:
  Call path.join() with arguments:
    1. this._pathPrefix
    2. destPath

Return Call new Promise() with arguments:
  1. function with named arguments: resolve, reject
    Set mpu to:
      Call new MPU() with arguments:
        1. Object:
          {
            client: that._client,
            objectName: finalPath,
            stream: srcStream,
          }
        2. function with named arguments: err, body
          If err is not null
            Return Call reject() with arguments:
              1. err

          Return Call resolve() with arguments:
            1. body.Key
```

#### `#checkConstraints(<String> srcPath)`

Parameters:

- `srcPath`, Required, String, the file against which we want to check constraints.

Returns:

Null or undefined on success, if it finds a problem with the size or mimetype
it'll return an Error object.

Typical usage:

```js
var consErr = this.checkConstraints(srcPath);

if (consErr instanceof Error) {
  return Promise.reject(consErr);
}
```

Pseudo-code:

```
If `this._acceptedMimeTypes.length` is greater than zero
  Set fileMime to be equal to
    Call mime.lookup() with arguments:
      1. `srcPath`

  Set result to be equal to:
    Call this._acceptedMimeTypes.filter() with arguments:
      1. function with argument `val`
        If `val` typeof equals 'String'
          Call `fileMime.indexOf()` with arguments:
            1. `val`
          Return true if result is not equal to -1
        Else
          Call `fileMime.match()` with arguments:
            1. `val`
          Return true if result is not null

  If `result.length` is equal to zero
    Return new Error('S3Uploader: Invalid file mimetype')

If `this._maxFileSize` is greater than zero
  Set fileSize to be equal to;
    Call fs.statSync() with arguments:
      1. `srcPath`
    Grab `.size` property

  If `fileSize` is greater than `this._maxFileSize`
    Return new Error('S3Uploader: File too big')
```

## Examples

### Upload image file

```js
var attachments = new S3Uploader(knox.createClient(...), {
  pathPrefix: '/attachments',
  acceptedMimeTypes: ['image/png', 'image/jpeg'],
});

attachments
  .uploadFile(
    '/tmp/uploads/some-random-string.png',
    'attachment-3c105b58-8122-44c0-9198-db06a896e04d.png'
  )
  .then(function (url) {
    // url => '/attachments/attachment-3c105b58-8122-44c0-9198-db06a896e04d.png'
  });
```

### Regex mimetype constraint

```js
var attachments = new S3Uploader(knox.createClient(...), {
  acceptedMimeTypes: [
    /image\/.*/
  ],
});

attachments
  .uploadFile(
    '/tmp/uploads/some-random-string.pdf',
    'attachment-3c105b58-8122-44c0-9198-db06a896e04d.pdf'
  )
  .catch(function (err) {
    // err => Error 'S3Uploader: Invalid file mimetype'
  });
```
