import { mkdir, writeFile } from 'node:fs/promises'
import { deflateSync } from 'node:zlib'

const outputDirectory = new URL('../public/', import.meta.url)
const dark = [17, 17, 15, 255]
const surface = [29, 29, 25, 255]
const accent = [107, 215, 189, 255]
const text = [238, 236, 227, 255]
const muted = [145, 142, 132, 255]

const glyphs = {
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '/': ['00001', '00010', '00100', '01000', '10000', '00000', '00000'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '00110', '00110'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '10000', '11110', '00001', '00001', '11110'],
  '6': ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01111', '10000', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
}

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type)
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const checksum = Buffer.alloc(4)
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])))
  return Buffer.concat([length, typeBuffer, data, checksum])
}

function createImage(width, height, color) {
  const pixels = Buffer.alloc(width * height * 4)
  for (let offset = 0; offset < pixels.length; offset += 4) pixels.set(color, offset)
  return { width, height, pixels }
}

function fillRect(image, x, y, width, height, color) {
  for (let row = Math.max(0, y); row < Math.min(image.height, y + height); row += 1) {
    for (let column = Math.max(0, x); column < Math.min(image.width, x + width); column += 1) {
      image.pixels.set(color, (row * image.width + column) * 4)
    }
  }
}

function drawText(image, value, x, y, scale, color) {
  let cursor = x
  for (const character of value.toUpperCase()) {
    const glyph = glyphs[character] || glyphs[' ']
    glyph.forEach((row, rowIndex) => {
      ;[...row].forEach((pixel, columnIndex) => {
        if (pixel === '1') fillRect(image, cursor + columnIndex * scale, y + rowIndex * scale, scale, scale, color)
      })
    })
    cursor += 6 * scale
  }
}

function encodePng(image) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(image.width, 0)
  header.writeUInt32BE(image.height, 4)
  header[8] = 8
  header[9] = 6
  const scanlines = Buffer.alloc((image.width * 4 + 1) * image.height)
  for (let row = 0; row < image.height; row += 1) {
    const target = row * (image.width * 4 + 1)
    scanlines[target] = 0
    image.pixels.copy(scanlines, target + 1, row * image.width * 4, (row + 1) * image.width * 4)
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(scanlines, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function createIcon(size) {
  const image = createImage(size, size, dark)
  fillRect(image, 0, 0, Math.max(2, Math.round(size * 0.08)), size, accent)
  const scale = Math.max(1, Math.floor(size / 18))
  drawText(image, '//', Math.round(size * 0.24), Math.round(size * 0.37), scale, accent)
  return image
}

function createSocialCard() {
  const image = createImage(1200, 630, dark)
  for (let y = 0; y < image.height; y += 6) fillRect(image, 0, y, image.width, 1, [107, 215, 189, 12])
  fillRect(image, 72, 72, 8, 486, accent)
  fillRect(image, 112, 84, 958, 1, muted)
  fillRect(image, 112, 530, 958, 1, muted)
  drawText(image, 'DEV/TAB', 112, 150, 18, text)
  drawText(image, 'KEYBOARD-FIRST NEW TAB', 118, 330, 6, accent)
  drawText(image, 'SEARCH  COMMANDS  NOTES  GITHUB', 118, 430, 4, muted)
  fillRect(image, 1040, 84, 30, 30, accent)
  fillRect(image, 1050, 94, 10, 10, surface)
  return image
}

const gifPalette = [dark, surface, accent, text, muted, [54, 54, 47, 255], [230, 175, 88, 255]]

function createIndexedImage(width, height, color = 0) {
  return { width, height, pixels: new Uint8Array(width * height).fill(color) }
}

function fillIndexed(image, x, y, width, height, color) {
  for (let row = Math.max(0, y); row < Math.min(image.height, y + height); row += 1) {
    image.pixels.fill(color, row * image.width + Math.max(0, x), row * image.width + Math.min(image.width, x + width))
  }
}

function frameRect(image, x, y, width, height, color = 5) {
  fillIndexed(image, x, y, width, 2, color)
  fillIndexed(image, x, y + height - 2, width, 2, color)
  fillIndexed(image, x, y, 2, height, color)
  fillIndexed(image, x + width - 2, y, 2, height, color)
}

function drawIndexedText(image, value, x, y, scale, color) {
  let cursor = x
  for (const character of value.toUpperCase()) {
    const glyph = glyphs[character] || glyphs[' ']
    glyph.forEach((row, rowIndex) => {
      ;[...row].forEach((pixel, columnIndex) => {
        if (pixel === '1') fillIndexed(image, cursor + columnIndex * scale, y + rowIndex * scale, scale, scale, color)
      })
    })
    cursor += 6 * scale
  }
}

function baseDemoFrame(label) {
  const image = createIndexedImage(720, 405)
  for (let y = 0; y < image.height; y += 5) fillIndexed(image, 0, y, image.width, 1, 5)
  fillIndexed(image, 34, 28, 4, 349, 2)
  drawIndexedText(image, 'DEV/TAB', 58, 35, 5, 3)
  drawIndexedText(image, label, 58, 88, 3, 2)
  fillIndexed(image, 58, 120, 610, 2, 5)
  return image
}

function createDemoFrames() {
  const search = baseDemoFrame('SEARCH')
  frameRect(search, 58, 150, 450, 48)
  drawIndexedText(search, 'OPEN SOMETHING', 76, 166, 2, 4)
  fillIndexed(search, 508, 150, 112, 48, 2)
  drawIndexedText(search, 'GO', 545, 166, 2, 0)
  frameRect(search, 58, 225, 180, 108)
  frameRect(search, 253, 225, 367, 108)
  drawIndexedText(search, 'WEATHER', 76, 245, 2, 4)
  drawIndexedText(search, 'GITHUB', 272, 245, 2, 4)

  const command = baseDemoFrame('COMMANDS')
  fillIndexed(command, 124, 135, 500, 205, 1)
  frameRect(command, 124, 135, 500, 205, 2)
  drawIndexedText(command, 'RUN A COMMAND', 150, 158, 3, 3)
  frameRect(command, 150, 205, 448, 42)
  drawIndexedText(command, 'CALC 12 4', 164, 217, 2, 4)
  fillIndexed(command, 150, 265, 448, 52, 5)
  drawIndexedText(command, '48', 164, 278, 3, 2)

  const notes = baseDemoFrame('NOTES')
  frameRect(notes, 58, 142, 145, 205)
  frameRect(notes, 218, 142, 402, 205)
  drawIndexedText(notes, 'PLAN', 76, 162, 2, 3)
  drawIndexedText(notes, 'IDEAS', 76, 202, 2, 4)
  drawIndexedText(notes, 'SHIP DEVTAB', 246, 166, 2, 3)
  ;['TEST BUILD', 'WRITE README', 'PUSH'].forEach((item, index) => {
    frameRect(notes, 246, 210 + index * 36, 18, 18, index === 0 ? 2 : 5)
    drawIndexedText(notes, item, 278, 212 + index * 36, 2, 4)
  })

  const customize = baseDemoFrame('CUSTOMIZE')
  frameRect(customize, 58, 142, 562, 205)
  drawIndexedText(customize, 'DARK  LIGHT  SYSTEM', 84, 170, 2, 4)
  ;[2, 6, 3, 4].forEach((color, index) => fillIndexed(customize, 84 + index * 62, 225, 42, 42, color))
  drawIndexedText(customize, 'LOCAL FIRST', 84, 300, 2, 3)
  return [search, command, notes, customize]
}

function littleEndian(value) {
  return Buffer.from([value & 0xff, (value >> 8) & 0xff])
}

function lzwImageData(pixels) {
  const clearCode = 256
  const endCode = 257
  const codes = [clearCode]
  pixels.forEach((pixel, index) => {
    codes.push(pixel)
    if ((index + 1) % 200 === 0) codes.push(clearCode)
  })
  codes.push(endCode)
  const bytes = []
  let accumulator = 0
  let bits = 0
  codes.forEach((code) => {
    accumulator |= code << bits
    bits += 9
    while (bits >= 8) {
      bytes.push(accumulator & 0xff)
      accumulator >>>= 8
      bits -= 8
    }
  })
  if (bits > 0) bytes.push(accumulator & 0xff)
  const blocks = [Buffer.from([8])]
  for (let index = 0; index < bytes.length; index += 255) {
    const block = Buffer.from(bytes.slice(index, index + 255))
    blocks.push(Buffer.from([block.length]), block)
  }
  blocks.push(Buffer.from([0]))
  return Buffer.concat(blocks)
}

function encodeGif(frames, delay = 75) {
  const { width, height } = frames[0]
  const palette = Buffer.alloc(256 * 3)
  gifPalette.forEach((color, index) => palette.set(color.slice(0, 3), index * 3))
  const parts = [
    Buffer.from('GIF89a'),
    littleEndian(width),
    littleEndian(height),
    Buffer.from([0xf7, 0, 0]),
    palette,
    Buffer.from([0x21, 0xff, 0x0b]),
    Buffer.from('NETSCAPE2.0'),
    Buffer.from([0x03, 0x01, 0x00, 0x00, 0x00]),
  ]
  frames.forEach((frame) => {
    parts.push(
      Buffer.from([0x21, 0xf9, 0x04, 0x00]),
      littleEndian(delay),
      Buffer.from([0x00, 0x00]),
      Buffer.from([0x2c]),
      littleEndian(0),
      littleEndian(0),
      littleEndian(width),
      littleEndian(height),
      Buffer.from([0x00]),
      lzwImageData(frame.pixels),
    )
  })
  parts.push(Buffer.from([0x3b]))
  return Buffer.concat(parts)
}

await mkdir(outputDirectory, { recursive: true })
for (const size of [16, 32, 48, 128, 192, 512]) {
  await writeFile(new URL(`icon-${size}.png`, outputDirectory), encodePng(createIcon(size)))
}
await writeFile(new URL('og.png', outputDirectory), encodePng(createSocialCard()))
await writeFile(new URL('demo.gif', outputDirectory), encodeGif(createDemoFrames()))
