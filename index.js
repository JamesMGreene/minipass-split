// Node.js core modules
const { StringDecoder } = require('string_decoder')

// Userland modules
const kindOf = require('kind-of')
const Minipass = require('minipass')

// Constants
const TEXT_BUFFER = Symbol('textBuffer')
const DECODER = Symbol('decoder')
const EMITTED_ERROR = Symbol('emittedError')
const SEPARATOR = Symbol('separator')
const HANDLE_ERROR = Symbol('handleError')
const SUPER_WRITE = Symbol('superWrite')
const defaultSeparator = /\r?\n/

class SplitStream extends Minipass {
  constructor(options = {}) {
    super(options)

    const { separator } = options

    this[TEXT_BUFFER] = ''
    this[DECODER] = new StringDecoder('utf8')
    this[EMITTED_ERROR] = false
    this[SEPARATOR] = ['string', 'regexp'].includes(kindOf(separator))
      ? separator
      : defaultSeparator
  }

  [HANDLE_ERROR](error, callback) {
    this[EMITTED_ERROR] = true
    this.emit('error', error)

    if (callback) callback(error)

    // Return `false` to signal backpressure
    return false
  }

  [SUPER_WRITE](line) {
    let keepWriting = true

    // Only write the line if it is non-empty
    if (line) {
      keepWriting = super.write(line)
    }

    // Return the result of the last `write` attempt to help honor backpressure
    return keepWriting
  }

  write(chunk, encoding, callback) {
    // Parameter shuffling
    if (kindOf(encoding) === 'function') {
      callback = encoding
      encoding = null
    }

    if (kindOf(callback) !== 'function') {
      callback = null
    }

    // If an error was already emitted, bail out immediately
    if (this[EMITTED_ERROR]) {
      return this[HANDLE_ERROR](new Error('Previously emitted an error'), callback)
    }

    // Convert chunk to a buffer
    let buffer = chunk
    if (kindOf(chunk) === 'string') {
      buffer = Buffer.from(chunk, kindOf(encoding) === 'string' ? encoding : 'utf8')
    }

    // If the chunk could not be converted to a buffer, bail out early
    if (kindOf(buffer) !== 'buffer') {
      return this[HANDLE_ERROR](new Error('A chunk could not be converted to a buffer'), callback)
    }

    // Split it up!
    this[TEXT_BUFFER] += this[DECODER].write(buffer)
    const lines = this[TEXT_BUFFER].split(this[SEPARATOR])

    // Save the last partial line for the next write
    this[TEXT_BUFFER] = lines.pop()

    // Push lines onward to the next stream in the pipeline
    let keepWriting = true
    for (const line of lines) {
      try {
        keepWriting = this[SUPER_WRITE](line)
      } catch (error) {
        return this[HANDLE_ERROR](error, callback)
      }
    }

    if (callback) callback()

    // Return the result of the last `write` attempt to help honor backpressure
    return keepWriting
  }

  end(chunk, encoding, callback) {
    // Parameter shuffling
    if (kindOf(encoding) === 'function') {
      callback = encoding
      encoding = null
    } else if (kindOf(chunk) === 'function') {
      callback = chunk
      encoding = null
      chunk = null
    }

    if (kindOf(callback) !== 'function') {
      callback = null
    }

    if (chunk) {
      this.write(chunk, encoding)
    }

    // Forward any gibberish left in the decoder
    this[TEXT_BUFFER] += this[DECODER].end()

    const lastLine = this[TEXT_BUFFER]
    if (lastLine && !this[EMITTED_ERROR]) {
      try {
        this[SUPER_WRITE](lastLine)
      } catch (error) {
        return this[HANDLE_ERROR](error, callback)
      }
    }

    return super.end(null, null, callback)
  }

  // This method will automatically be called by Minipass's `destroy` method
  close() {
    this.emit('close')
  }
}

module.exports = SplitStream
