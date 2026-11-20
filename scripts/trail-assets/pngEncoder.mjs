/**
 * Deterministic zero-dependency indexed-color PNG encoder (Color Type 3, 8-bit).
 * Uses only Node.js built-in `node:zlib` and IEEE 802.3 CRC32.
 *
 * Encodes our Dual-Theme LUT directly into the PNG `PLTE` and `tRNS` chunks,
 * preserving full alpha transparency on index 0 and translucent mist-veil alphas.
 */

import { deflateSync } from 'node:zlib';

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

/**
 * Parse a `#RRGGBB`, `#RRGGBBAA`, or `null` palette entry into `[r, g, b, a]`.
 */
export function parseHexRgba(color) {
  if (color === null) {
    return [0, 0, 0, 0];
  }
  if (typeof color !== 'string' || !/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(color)) {
    throw new Error(`Invalid hex color in palette: ${String(color)}`);
  }
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  const a = color.length === 9 ? parseInt(color.slice(7, 9), 16) : 255;
  return [r, g, b, a];
}

/**
 * Encode an indexed pixel buffer (`Uint8Array` of length `width * height`)
 * and LUT array (`(string | null)[]`) into a deterministic PNG `Buffer`.
 */
export function encodeIndexedPng(width, height, indices, palette) {
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new Error(`Invalid PNG dimensions: ${width}x${height}`);
  }
  if (indices.length !== width * height) {
    throw new Error(
      `Pixel buffer length (${indices.length}) does not match ${width}x${height} (${width * height})`
    );
  }
  if (palette.length === 0 || palette.length > 256) {
    throw new Error(`Indexed PNG palette must have 1..256 entries, got ${palette.length}`);
  }

  // Build PLTE and tRNS payloads
  const plte = Buffer.alloc(palette.length * 3);
  const alphas = new Array(palette.length);
  let lastNonOpaqueIndex = -1;

  for (let i = 0; i < palette.length; i += 1) {
    const [r, g, b, a] = parseHexRgba(palette[i]);
    plte[i * 3] = r;
    plte[i * 3 + 1] = g;
    plte[i * 3 + 2] = b;
    alphas[i] = a;
    if (a < 255) {
      lastNonOpaqueIndex = i;
    }
  }

  // IHDR: width(4), height(4), bitDepth(1)=8, colorType(1)=3 (indexed),
  // compression(1)=0, filter(1)=0, interlace(1)=0
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 3;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // Build uncompressed scanlines (filter type 0 per row)
  const stride = width + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * stride;
    raw[rowOffset] = 0; // Filter None
    for (let x = 0; x < width; x += 1) {
      const idx = indices[y * width + x];
      if (idx < 0 || idx >= palette.length) {
        throw new Error(`Pixel index ${idx} at (${x}, ${y}) out of palette bounds [0..${palette.length - 1}]`);
      }
      raw[rowOffset + 1 + x] = idx;
    }
  }

  const compressed = deflateSync(raw, { level: 9 });

  const chunks = [
    PNG_SIGNATURE,
    makeChunk('IHDR', ihdr),
    makeChunk('PLTE', plte),
  ];

  if (lastNonOpaqueIndex >= 0) {
    const trns = Buffer.from(alphas.slice(0, lastNonOpaqueIndex + 1));
    chunks.push(makeChunk('tRNS', trns));
  }

  chunks.push(makeChunk('IDAT', compressed));
  chunks.push(makeChunk('IEND', Buffer.alloc(0)));

  return Buffer.concat(chunks);
}
