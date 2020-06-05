// NOTE: These test concepts are borrowed heavily from:
// https://github.com/mcollina/split2/blob/master/test.js

// Userland modules
const Minipass = require('minipass')
const test = require('ava')

// Local modules
const SplitStream = require('.')

test('reads and writes Buffers by default', async (t) => {
  const input = new Minipass()
  const transform = new SplitStream()

  input.pipe(transform)
  input.end(Buffer.from('hello\nworld'))

  const lines = await transform.collect()
  t.is(lines.length, 2)
  t.deepEqual(lines[0], Buffer.from('hello'))
  t.deepEqual(lines[1], Buffer.from('world'))
})

test('reads strings if encoding is provided to preceding input stream', async (t) => {
  const input = new Minipass({ encoding: 'utf8' })
  const transform = new SplitStream()

  input.pipe(transform)
  input.end('hello\nworld')

  const lines = await transform.collect()
  t.is(lines.length, 2)
  t.deepEqual(lines[0], Buffer.from('hello'))
  t.deepEqual(lines[1], Buffer.from('world'))
})

test('writes strings if encoding is provided', async (t) => {
  const input = new Minipass()
  const transform = new SplitStream({ encoding: 'utf8' })

  input.pipe(transform)
  input.end(Buffer.from('hello\nworld'))

  const lines = await transform.collect()
  t.is(lines.length, 2)
  t.is(lines[0], 'hello')
  t.is(lines[1], 'world')
})

test('reads and writes strings if encoding is provided to surrounding input and output streams', async (t) => {
  const input = new Minipass({ encoding: 'utf8' })
  const transform = new SplitStream()
  const output = new Minipass({ encoding: 'utf8' })

  input.pipe(transform).pipe(output)
  input.end('hello\nworld')

  const lines = await output.collect()
  t.is(lines.length, 2)
  t.is(lines[0], 'hello')
  t.is(lines[1], 'world')
})

test('splits two lines on end', async (t) => {
  const transform = new SplitStream({ encoding: 'utf8' })

  transform.end('hello\nworld')

  const lines = await transform.collect()
  t.is(lines.length, 2)
  t.is(lines[0], 'hello')
  t.is(lines[1], 'world')
})

test('splits two lines on two writes', async (t) => {
  const transform = new SplitStream({ encoding: 'utf8' })

  transform.write('hello')
  transform.write('\nworld')
  transform.end()

  const lines = await transform.collect()
  t.is(lines.length, 2)
  t.is(lines[0], 'hello')
  t.is(lines[1], 'world')
})

test('splits four lines on three writes', async (t) => {
  const transform = new SplitStream({ encoding: 'utf8' })

  transform.write('hello\nwor')
  transform.write('ld\nbye\nwo')
  transform.write('rld')
  transform.end()

  const lines = await transform.collect()
  t.is(lines.length, 4)
  t.is(lines[0], 'hello')
  t.is(lines[1], 'world')
  t.is(lines[2], 'bye')
  t.is(lines[3], 'world')
})

test('splits four lines on three writes and end', async (t) => {
  const transform = new SplitStream({ encoding: 'utf8' })

  transform.write('hello\nwor')
  transform.write('ld\nbye\nwo')
  transform.write('rl')
  transform.end('d')

  const lines = await transform.collect()
  t.is(lines.length, 4)
  t.is(lines[0], 'hello')
  t.is(lines[1], 'world')
  t.is(lines[2], 'bye')
  t.is(lines[3], 'world')
})

test('split lines when the "\\n" comes at the end of a chunk', async (t) => {
  const transform = new SplitStream({ encoding: 'utf8' })

  transform.write('hello\n')
  transform.end('world')

  const lines = await transform.collect()
  t.is(lines.length, 2)
  t.is(lines[0], 'hello')
  t.is(lines[1], 'world')
})

test('accumulates multiple writes', async (t) => {
  const transform = new SplitStream({ encoding: 'utf8' })

  transform.write('hello')
  transform.write('world')
  transform.end()

  const lines = await transform.collect()
  t.is(lines.length, 1)
  t.is(lines[0], 'helloworld')
})

test('splits using a custom string separator', async (t) => {
  const transform = new SplitStream({ encoding: 'utf8', separator: '~' })

  transform.end('hello~world')

  const lines = await transform.collect()
  t.is(lines.length, 2)
  t.is(lines[0], 'hello')
  t.is(lines[1], 'world')
})

test('splits using a custom multi-character string separator', async (t) => {
  const transform = new SplitStream({ encoding: 'utf8', separator: 'BREAK' })

  transform.end('helloBREAKworld')

  const lines = await transform.collect()
  t.is(lines.length, 2)
  t.is(lines[0], 'hello')
  t.is(lines[1], 'world')
})

test('splits using a custom RegExp separator', async (t) => {
  const transform = new SplitStream({ encoding: 'utf8', separator: /~/ })

  transform.end('hello~world')

  const lines = await transform.collect()
  t.is(lines.length, 2)
  t.is(lines[0], 'hello')
  t.is(lines[1], 'world')
})

test('splits using a custom multi-character RegExp separator', async (t) => {
  const transform = new SplitStream({ encoding: 'utf8', separator: /BREAK/ })

  transform.end('helloBREAKworld')

  const lines = await transform.collect()
  t.is(lines.length, 2)
  t.is(lines[0], 'hello')
  t.is(lines[1], 'world')
})

test('splits lines for Windows-style separators', async (t) => {
  const transform = new SplitStream({ encoding: 'utf8' })

  transform.end('hello\r\nworld')

  const lines = await transform.collect()
  t.is(lines.length, 2)
  t.is(lines[0], 'hello')
  t.is(lines[1], 'world')
})

test('does not split two lines at "\\r" only on end', async (t) => {
  const transform = new SplitStream({ encoding: 'utf8' })

  transform.end('hello\rworld')

  const lines = await transform.collect()
  t.is(lines.length, 1)
  t.is(lines[0], 'hello\rworld')
})

test('has a destroy method that signals closure', async (t) => {
  t.plan(1)

  const transform = new SplitStream({ encoding: 'utf8' })

  await new Promise((resolve, reject) => {
    function onClose() {
      t.pass('close emitted')

      // Remove the other listener for cleanliness
      transform.removeListener('error', onError)

      resolve()
    }

    function onError(error) {
      // Remove the other listener for cleanliness
      transform.removeListener('close', onClose)

      reject(error)
    }

    transform.once('close', onClose)
    transform.once('error', onError)

    transform.destroy()
  })
})

test('does not modify the options object', async (t) => {
  const options = { encoding: 'utf8' }
  const transform = new SplitStream(options)

  transform.end()

  const lines = await transform.collect()
  t.is(lines.length, 0)
  t.deepEqual(options, { encoding: 'utf8' })
})

test('splits utf8 characters 1-by-1 as Buffers', async (t) => {
  const transform = new SplitStream()

  const buf = Buffer.from('烫烫烫\n锟斤拷', 'utf8')
  for (let i = 0; i < buf.length; i += 1) {
    transform.write(buf.slice(i, i + 1))
  }

  transform.end()

  const lines = await transform.collect()
  t.is(lines.length, 2)
  t.deepEqual(lines[0], Buffer.from('烫烫烫', 'utf8'))
  t.deepEqual(lines[1], Buffer.from('锟斤拷', 'utf8'))
})

test('splits utf8 characters 1-by-1 as strings if encoding is provided', async (t) => {
  const transform = new SplitStream({ encoding: 'utf8' })

  const buf = Buffer.from('烫烫烫\n锟斤拷', 'utf8')
  for (let i = 0; i < buf.length; i += 1) {
    transform.write(buf.slice(i, i + 1))
  }

  transform.end()

  const lines = await transform.collect()
  t.is(lines.length, 2)
  t.is(lines[0], '烫烫烫')
  t.is(lines[1], '锟斤拷')
})

test('splits utf8 characters 2-by-2', async (t) => {
  const transform = new SplitStream({ encoding: 'utf8' })

  const buf = Buffer.from('烫烫烫\n锟斤拷', 'utf8')
  for (let i = 0; i < buf.length; i += 2) {
    transform.write(buf.slice(i, i + 2))
  }

  transform.end()

  const lines = await transform.collect()
  t.is(lines.length, 2)
  t.is(lines[0], '烫烫烫')
  t.is(lines[1], '锟斤拷')
})

test('splits with truncated utf-8 character', async (t) => {
  const transform = new SplitStream({ encoding: 'utf8' })

  const buf = Buffer.from('烫烫', 'utf8')
  transform.write(buf.slice(0, 3))
  transform.end(buf.slice(3, 4))

  const lines = await transform.collect()
  t.is(lines.length, 1)
  t.is(lines[0], '烫' + Buffer.from('e7', 'hex').toString())
})
