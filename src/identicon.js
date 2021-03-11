let bytes = [0]
let byteIndex = 0

export function seedrand (hash) {
  console.log('hash', hash)
  bytes = hash
  byteIndex = 0
}

export function rand () {
  const result = bytes[byteIndex] / 256.0
  byteIndex = (byteIndex + 1) % bytes.length
  return result
}

export function createColor () {
  // saturation is the whole color spectrum
  const h = Math.floor(rand() * 360)
  // saturation goes from 40 to 100, it avoids greyish colors
  const s = ((rand() * 60) + 40)
  // lightness can be anything from 0 to 100, but probabilities are a bell curve around 50%
  const l = ((rand() + rand() + rand() + rand()) * 25)

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

export function * getBitStream (string) {
  const bits = stringToBits(string)

  for (let i = 0; i < bits.length; i++) {
    yield parseInt(bits[i])
  }
}

function buildOpts (opts) {
  const newOpts = {}

  newOpts.seed = opts.seed || Math.floor((Math.random() * Math.pow(10, 16))).toString(16)

  seedrand(newOpts.seed)

  if (opts.size && opts.gridSize && opts.scale) {
    throw new Error("Don't specify size, gridSize *and* scale. Choose two.")
  }

  newOpts.gridSize = opts.gridSize || opts.size / opts.scale || 8
  newOpts.scale = opts.scale || opts.size / opts.gridSize || 4
  newOpts.size = opts.size || newOpts.gridSize * newOpts.scale

  console.log('createCior', encodeColor(createColor()))

  return {
    backgroundColor: encodeColor(createColor()),
    strokeColor: encodeColor(createColor()),
    ...opts,
    ...newOpts
  }
}

export default function renderIcon (opts, canvas) {
  opts = buildOpts(opts || {})
  const { size, backgroundColor, strokeColor } = opts

  canvas.width = canvas.height = size

  const cc = canvas.getContext('2d')
  cc.fillStyle = backgroundColor
  cc.fillRect(0, 0, canvas.width, canvas.height)
  const numDiscs = 1 + (rand() * 2)
  const centers = []
  for (let i = 0; i < numDiscs; i++) {
    centers.push({
      x: rand() * size,
      y: rand() * size
    })
  }

  cc.lineWidth = 0.5
  cc.strokeStyle = strokeColor

  // for (let i = 0; i < 4; i++) {
  //   for (let j = 0; j < 2; j++) {
  //     cc.strokeStyle = encodeColor(createColor())

  //     const start = centers[Math.floor(centers.length * rand())]
  //     const end = centers[Math.floor(centers.length * rand())]
  //     cc.beginPath()
  //     cc.moveTo(start.x, start.y)
  //     cc.lineTo(end.x, end.y)
  //     cc.stroke()
  //   }
  // }

  console.log('numDiscs', numDiscs)

  for (let i = 0; i < numDiscs; i++) {
    const { x, y } = centers[i]
    cc.fillStyle = encodeColor(createColor())
    const shape = Math.floor(rand() * 3)

    const radius = 3 + (rand() * size * 0.25)

    switch (shape) {
      case 0:
        cc.beginPath()
        cc.arc(x, y, radius, 0, 2 * Math.PI)
        cc.fill()
        break
      case 1:
        cc.fillRect(x, y, radius * 2, radius * 2)
        break
      case 2:
        drawTriangle(cc, radius * 2, centers[i])
        break
      default:
        throw new Error('shape is greater than 2, this should never happen')
    }
  }

  return canvas
}

function drawTriangle (cc, radius, center) {
  const a1 = rand() * 2 * Math.PI
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
