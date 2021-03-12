let bytes = [0]
let byteIndex = 0

export function setBytes (hash) {
  bytes = hash
  byteIndex = hash[hash.length - 1] % hash.length // set the starting point
}

// returns a value from 0 to 1, determined by the next byte in the hash
export function value () {
  const result = bytes[byteIndex] / 256.0
  byteIndex = (byteIndex + 1) % bytes.length
  return result
}

export function createColor (lightness) {
  // hue is the whole color spectrum
  const h = Math.floor(value() * 360)
  // saturation goes from 40 to 100, it avoids greyish colors
  const s = ((value() * 60) + 40)
  // lightness can be anything from 0 to 100, but with a little bump in the distribution around the middle
  const l = lightness || (value() * 100 + ((value() + value() + value() + value()) * 25)) / 2

  // other possible distributions of l
  // const l = ((value() + value() + value() + value()) * 25)
  // const l = ((value() + value()) * 50)
  // const l = value() * 100
  return { h, s, l }
}

export function mixColors (a, b, amt) {
  return {
    h: (a.h * (1 - amt)) + (b.h * amt),
    s: (a.s * (1 - amt)) + (b.s * amt),
    l: (a.l * (1 - amt)) + (b.l * amt)
  }
}

export function encodeColor ({ h, s, l }) {
  return `hsl(${h}, ${s}%, ${l}%)`
}

export function stringToBits (string) {
  return Array
    .from(string)
    .reduce((acc, char) => acc.concat(char.charCodeAt().toString(2)), [])
    .map(bin => '0'.repeat(8 - bin.length) + bin)
    .join('')
}

function drawTriangle (cc, radius, center) {
  const a1 = value() * 2 * Math.PI
  const dx1 = radius * Math.cos(a1)
  const dy1 = radius * Math.sin(a1)
  const x1 = center.x + dx1
  const y1 = center.x + dy1

  const a2 = a1 + (2 * Math.PI * 0.3)
  const dx2 = radius * Math.cos(a2)
  const dy2 = radius * Math.sin(a2)
  const x2 = center.x + dx2
  const y2 = center.x + dy2

  const a3 = a2 + (2 * Math.PI * 0.3)
  const dx3 = radius * Math.cos(a3)
  const dy3 = radius * Math.sin(a3)
  const x3 = center.x + dx3
  const y3 = center.x + dy3

  cc.beginPath()
  cc.moveTo(x1, y1)
  cc.lineTo(x2, y2)
  cc.lineTo(x3, y3)
  cc.fill()
}

function buildOpts (opts) {
  const newOpts = {}

  newOpts.hash = opts.hash || [0]

  setBytes(newOpts.hash)

  if (opts.size && opts.gridSize && opts.scale) {
    throw new Error("Don't specify size, gridSize *and* scale. Choose two.")
  }

  newOpts.gridSize = opts.gridSize || opts.size / opts.scale || 8
  newOpts.scale = opts.scale || opts.size / opts.gridSize || 4
  newOpts.size = opts.size || newOpts.gridSize * newOpts.scale

  return {
    backgroundColor: opts.backgroundColor || encodeColor(createColor()),
    ...newOpts
  }
}

// opts : {
//   hash: Uint8Array
//   size: Int
//   backgroundColor: String (a css color specification)
//   gridsize: Int
//   scale: Int
// }
// canvas: HTMLCanvasElement

export default function renderIcon (opts, canvas) {
  opts = buildOpts(opts || {})
  const { size, backgroundColor } = opts

  canvas.width = canvas.height = size

  const cc = canvas.getContext('2d')
  cc.fillStyle = backgroundColor
  cc.fillRect(0, 0, canvas.width, canvas.height)
  const numShapes = value() < 0.5 ? 2 : 3
  const shapes = Array.apply(null, Array(numShapes)).map((_, i) => {
    // gaurantees one bright shape and one dark shape, hopefully helpful for color blind users
    const lightness = i === 0
      ? 5 + (value() * 25)
      : i === 1
        ? 70 + (value() * 25)
        : null
    return {
      x: value() * size,
      y: value() * size,
      radius: 5 + (value() * size * 0.25),
      type: Math.floor(value() * 3),
      color: encodeColor(createColor(lightness))
    }
  }).sort((a, b) => (a.radius > b.radius) ? -1 : 1) // puts the small shapes in front of the large

  for (let i = 0; i < numShapes; i++) {
    const shape = shapes[i]
    const { x, y, radius, type, color } = shape
    cc.fillStyle = color

    switch (type) {
      case 0:
        cc.beginPath()
        cc.arc(x, y, radius, 0, 2 * Math.PI)
        cc.fill()
        break
      case 1:
        cc.fillRect(x, y, radius * 2, radius * 2)
        break
      case 2:
        drawTriangle(cc, radius * 2, { x, y })
        break
      default:
        throw new Error('shape is greater than 2, this should never happen')
    }
  }

  return canvas
}
