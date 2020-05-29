# `minipass-split`

Split a [`minipass`](https://www.npmjs.com/package/minipass) text stream into a line stream.

The equivalent of a line-splitting `Transform` stream, a la `split2`, but based on `minipass`.

It is intentionally **NOT** API-compatible with [`split`](https://www.npmjs.com/package/split) or [`split2`](https://www.npmjs.com/package/split2).

## Installation

```shell
npm install --save minipass minipass-split
```

## Usage

```js
const fsm = require('fs-minipass')
const SplitStream = require('minipass-split')

const readStream = new fsm.ReadStream('input.txt')
const splitSteam = new SplitStream()
const writeStream = new fsm.WriteStream('output.txt')

// Read a file, break it into chunks by line, write those chunks to a new file
// NOTE: In this example, the new file will NOT contain any of the line breaks!
readStream.pipe(splitStream).pipe(writeStream)
```

### Options

An `options` argument may be passed into the constructor.

Valid options include:

#### `separator`

_Optional._ (`String` or `RegExp`): The pattern describing where each split should occur, identical to the [`separator` parameter of `String.prototype.split`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/split#Parameters). Defaults to `/\r?\n/`.

```js
// Split on every ';' character
new Split({ separator: ';' })

// Split on every 'BREAK' string
new Split({ separator: 'BREAK' })

// Split on every ';' character, optionally followed by whitespace
new Split({ separator: /,\s*/ })
```

#### `trailing`

_Optional._ (`Boolean`): By default, the last buffer not delimited by a newline or `options.separator` will still be emitted. To prevent this, set `trailing` to `false`. Defaults to `true`.

```js
// Do not emit the last line
new Split({ trailing: false })
```

#### `maxLength`

_Optional._ (`Number`): The maximum buffer length without seeing a newline or `options.separator`. If a single line exceeds this, the stream will emit an error. Defaults to `Infinity`.

```js
new Split({ maxLength: 10 })
```

#### `skipOverflow`

_Optional._ (`Boolean`): When used in conjunction with a specific `options.maxLength` value, setting `skipOverflow` to `true` will suppress the error from being emitted and instead just skip past any lines that cause the internal buffer to exceed `options.maxLength`. Defaults to `false`.

```js
new Split({ maxLength: 10, skipOverflow: true })
```

## License

[MIT License](LICENSE.md) (c) 2020 James M. Greene
