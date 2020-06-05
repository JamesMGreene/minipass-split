# `minipass-split`

Splits a [`minipass`](https://www.npmjs.com/package/minipass) text stream into a line stream.

The equivalent of a line-splitting `Transform` stream, similar to `split2`, but based on `minipass`.

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
//
// NOTE: In this example, the new file will NOT contain:
//  - any of the line breaks!
//  - any lines that are empty without their line breaks
readStream.pipe(splitStream).pipe(writeStream)
```

### Options

An `options` argument may be passed into the constructor.

Valid options include:

#### `separator`

_Optional._ (`String` or `RegExp`): The pattern describing where each split should occur, identical to the [`separator` parameter of `String.prototype.split`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/split#Parameters). Defaults to `/\r?\n/`.

```js
// Split on every ';' character
new SplitStream({ separator: ';' })

// Split on every 'BREAK' string
new SplitStream({ separator: 'BREAK' })

// Split on every ';' character, optionally followed by whitespace
new SplitStream({ separator: /,\s*/ })
```

## License

[MIT License](LICENSE.md) (c) 2020 James M. Greene
