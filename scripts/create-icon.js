const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

function createPng(width, height) {
  // Raw RGBA pixels
  const rows = [];
  const cx = width / 2;
  const cy = height / 2;
  const rOuter = width * 0.44;
  const rInner = width * 0.32;
  const rCore = width * 0.18;

  for (let y = 0; y < height; y++) {
    const row = [0]; // filter byte: None
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= rCore) {
        // Glowing cyan/white core
        const intensity = 1 - (dist / rCore) * 0.4;
        row.push(Math.round(200 * intensity), 255, 255, 255);
      } else if (dist <= rOuter && dist >= rInner) {
        // Glowing arc ring
        row.push(0, 210, 255, 240);
      } else if (dist <= rOuter + 2 && dist >= rInner - 2) {
        // Subtle outer glow
        row.push(0, 160, 255, 120);
      } else {
        // Transparent
        row.push(0, 0, 0, 0);
      }
    }
    rows.push(Buffer.from(row));
  }

  const rawData = Buffer.concat(rows);
  const compressed = zlib.deflateSync(rawData);

  // PNG Signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth
  ihdrData.writeUInt8(6, 9); // color type RGBA
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace

  const ihdr = makeChunk('IHDR', ihdrData);
  const idat = makeChunk('IDAT', compressed);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(8 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crc = crc32(chunk.subarray(4, 8 + len));
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

// CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

const pngBuffer = createPng(64, 64);
const targetPath = path.join(__dirname, '..', 'electron', 'icon.png');
fs.writeFileSync(targetPath, pngBuffer);
console.log('Icon created successfully at:', targetPath);
