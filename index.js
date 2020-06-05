// Userland modules
const kindOf = require('kind-of')
const Minipass = require('minipass')

// Constants
const TEXT_BUFFER = Symbol('textBuffer')
const HANDLE_ERROR = Symbol('handleError')
const EMITTED_ERROR = Symbol('emittedError')
const SEPARATOR = Symbol('separator')
const defaultSeparator = /\r?\n/

class SplitStream extends Minipass {
  constructor(options = {}) {
    super(options)

    const { separator } = options

    this[TEXT_BUFFER] = ''
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

    // Convert chunk to string
    const chunkType = kindOf(chunk)
    let text = chunk
    if (chunkType === 'string' && kindOf(encoding) === 'string' && encoding !== 'utf8') {
      text = Buffer.from(chunk, encoding).toString()
    } else if (chunkType === 'buffer') {
      text = chunk.toString()
    }

    // If the chunk could not be converted to a string, bail out early
    if (kindOf(text) !== 'string') {
      return this[HANDLE_ERROR](new Error('A chunk could not be converted to a string'), callback)
    }

    // Split it up!
    const lines = (this[TEXT_BUFFER] + text).split(this[SEPARATOR])

    // Save the last partial line for the next write
    this[TEXT_BUFFER] = lines.pop()

    // Push lines onward to the next stream in the pipeline
    let keepWriting = true
    for (const line of lines) {
      try {
        keepWriting = super.write(line)
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

    const lastLine = this[TEXT_BUFFER]
    if (lastLine && !this[EMITTED_ERROR]) {
      try {
        super.write(lastLine)
      } catch (error) {
        this[EMITTED_ERROR] = true
        this.emit('error', error)
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
