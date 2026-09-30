/**
 * PEGASUS Pure SVG QR Code Generator
 *
 * Lightweight, zero-dependency QR Matrix generator producing crisp,
 * scalable SVG vector graphics for mobile phone camera scanning.
 * Implements standard QR Code specification (ISO/IEC 18004) for Byte mode.
 */

type QRVersion = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

interface QRCodeOptions {
  size?: number;
  margin?: number;
  darkColor?: string;
  lightColor?: string;
}

// Reed-Solomon GF(256) tables
const GF256_EXP: number[] = new Array(512);
const GF256_LOG: number[] = new Array(256);

(function initGF() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF256_EXP[i] = x;
    GF256_EXP[i + 255] = x;
    GF256_LOG[x] = i;
    x = (x << 1) ^ (x >= 128 ? 0x11d : 0);
  }
  GF256_LOG[0] = 0;
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF256_EXP[GF256_LOG[a] + GF256_LOG[b]];
}

function gfPolyMul(p: number[], q: number[]): number[] {
  const r = new Array(p.length + q.length - 1).fill(0);
  for (let i = 0; i < p.length; i++) {
    for (let j = 0; j < q.length; j++) {
      r[i + j] ^= gfMul(p[i], q[j]);
    }
  }
  return r;
}

function getGeneratorPoly(degree: number): number[] {
  let g = [1];
  for (let i = 0; i < degree; i++) {
    g = gfPolyMul(g, [1, GF256_EXP[i]]);
  }
  return g;
}

function calcErrorCorrection(data: number[], ecCount: number): number[] {
  const gen = getGeneratorPoly(ecCount);
  const msg = [...data, ...new Array(ecCount).fill(0)];
  for (let i = 0; i < data.length; i++) {
    const coef = msg[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        msg[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }
  return msg.slice(data.length);
}

// Version capacities (Byte mode, Error Correction Level M)
// Version 1: 21x21 (16 bytes data, 10 EC)
// Version 2: 25x25 (28 bytes data, 16 EC)
// Version 3: 29x29 (44 bytes data, 26 EC)
// Version 4: 33x33 (64 bytes data, 36 EC)
// Version 5: 37x37 (86 bytes data, 48 EC)
// Version 6: 41x41 (108 bytes data, 64 EC)
const VERSION_CAPACITIES_M: { version: QRVersion; dataBytes: number; ecBytes: number; blocks: number }[] = [
  { version: 1, dataBytes: 16, ecBytes: 10, blocks: 1 },
  { version: 2, dataBytes: 28, ecBytes: 16, blocks: 1 },
  { version: 3, dataBytes: 44, ecBytes: 26, blocks: 1 },
  { version: 4, dataBytes: 64, ecBytes: 36, blocks: 2 },
  { version: 5, dataBytes: 86, ecBytes: 48, blocks: 2 },
  { version: 6, dataBytes: 108, ecBytes: 64, blocks: 4 },
];

function selectVersion(byteLength: number): { version: QRVersion; dataBytes: number; ecBytes: number; blocks: number } {
  // Byte mode header: 4 bits mode + 8 bits count
  const totalNeeded = byteLength + 2;
  for (const vc of VERSION_CAPACITIES_M) {
    if (vc.dataBytes >= totalNeeded) {
      return vc;
    }
  }
  return VERSION_CAPACITIES_M[VERSION_CAPACITIES_M.length - 1];
}

function encodeByteData(text: string, capacity: number): number[] {
  const utf8: number[] = [];
  for (let i = 0; i < text.length; i++) {
    let charCode = text.charCodeAt(i);
    if (charCode < 0x80) {
      utf8.push(charCode);
    } else if (charCode < 0x800) {
      utf8.push(0xc0 | (charCode >> 6), 0x80 | (charCode & 0x3f));
    } else {
      utf8.push(0xe0 | (charCode >> 12), 0x80 | ((charCode >> 6) & 0x3f), 0x80 | (charCode & 0x3f));
    }
  }

  const bitBuffer: number[] = [];
  function pushBits(val: number, bits: number) {
    for (let i = bits - 1; i >= 0; i--) {
      bitBuffer.push((val >> i) & 1);
    }
  }

  // 1. Mode indicator (0100 for Byte Mode)
  pushBits(0b0100, 4);

  // 2. Character count indicator (8 bits for versions 1-9)
  pushBits(utf8.length, 8);

  // 3. Data bits
  for (const byte of utf8) {
    pushBits(byte, 8);
  }

  // 4. Terminator (up to 4 zeroes)
  const remainingBits = capacity * 8 - bitBuffer.length;
  const termBits = Math.min(4, Math.max(0, remainingBits));
  pushBits(0, termBits);

  // 5. Pad to multiple of 8
  while (bitBuffer.length % 8 !== 0) {
    bitBuffer.push(0);
  }

  // Convert to bytes
  const bytes: number[] = [];
  for (let i = 0; i < bitBuffer.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) {
      b = (b << 1) | bitBuffer[i + j];
    }
    bytes.push(b);
  }

  // 6. Pad with alternating bytes 0xEC and 0x11 up to capacity
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bytes.length < capacity) {
    bytes.push(padBytes[padIdx]);
    padIdx = (padIdx + 1) % 2;
  }

  return bytes;
}

export function generateQrMatrix(text: string): boolean[][] {
  const versionInfo = selectVersion(text.length);
  const dataBytes = encodeByteData(text, versionInfo.dataBytes);
  const ecBytes = calcErrorCorrection(dataBytes, versionInfo.ecBytes);
  const allCodewords = [...dataBytes, ...ecBytes];

  const size = 17 + versionInfo.version * 4;
  const matrix: (boolean | null)[][] = Array.from({ length: size }, () => new Array(size).fill(null));

  function setModule(r: number, c: number, val: boolean) {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] = val;
    }
  }

  // Draw 7x7 Finder Patterns at 3 corners
  function drawFinderPattern(row: number, col: number) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const tr = row + r;
        const tc = col + c;
        if (tr < 0 || tr >= size || tc < 0 || tc >= size) continue;
        if (
          (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
          (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        ) {
          matrix[tr][tc] = true;
        } else {
          matrix[tr][tc] = false;
        }
      }
    }
  }

  drawFinderPattern(0, 0);
  drawFinderPattern(0, size - 7);
  drawFinderPattern(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    const val = i % 2 === 0;
    if (matrix[6][i] === null) matrix[6][i] = val;
    if (matrix[i][6] === null) matrix[i][6] = val;
  }

  // Dark module
  matrix[4 * versionInfo.version + 9][8] = true;

  // Alignment patterns for version >= 2
  if (versionInfo.version >= 2) {
    const alignPositions: Record<number, number[]> = {
      2: [6, 18],
      3: [6, 22],
      4: [6, 26],
      5: [6, 30],
      6: [6, 34],
    };
    const coords = alignPositions[versionInfo.version] || [];
    for (const r of coords) {
      for (const c of coords) {
        if (matrix[r][c] !== null) continue; // Skip finder overlaps
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            if (Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0)) {
              matrix[r + dr][c + dc] = true;
            } else {
              matrix[r + dr][c + dc] = false;
            }
          }
        }
      }
    }
  }

  // Reserve format info areas around finders
  for (let i = 0; i <= 8; i++) {
    if (matrix[8][i] === null) matrix[8][i] = false;
    if (matrix[i][8] === null) matrix[i][8] = false;
  }
  for (let i = size - 8; i < size; i++) {
    if (matrix[8][i] === null) matrix[8][i] = false;
    if (matrix[i][8] === null) matrix[i][8] = false;
  }

  // Convert codewords to bitstream
  const bitstream: number[] = [];
  for (const b of allCodewords) {
    for (let i = 7; i >= 0; i--) {
      bitstream.push((b >> i) & 1);
    }
  }

  // Place data bits in standard 2-column upward/downward zig-zag
  let bitIdx = 0;
  let upwards = true;
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right--; // Skip vertical timing pattern
    const left = right - 1;
    for (let i = 0; i < size; i++) {
      const row = upwards ? size - 1 - i : i;
      for (const col of [right, left]) {
        if (matrix[row][col] === null) {
          const bit = bitIdx < bitstream.length ? bitstream[bitIdx++] : 0;
          // Apply standard mask pattern 0: (row + col) % 2 === 0
          const mask = (row + col) % 2 === 0;
          matrix[row][col] = (bit === 1) !== mask;
        }
      }
    }
    upwards = !upwards;
  }

  // Format info for Mask 0 + Error Correction M (format bits: 101010000010010)
  const formatBits = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0];
  for (let i = 0; i < 6; i++) matrix[8][i] = Boolean(formatBits[i]);
  matrix[8][7] = Boolean(formatBits[6]);
  matrix[8][8] = Boolean(formatBits[7]);
  matrix[7][8] = Boolean(formatBits[8]);
  for (let i = 9; i < 15; i++) matrix[14 - i][8] = Boolean(formatBits[i]);

  // Bottom-left / top-right copies of format info
  for (let i = 0; i < 7; i++) matrix[size - 1 - i][8] = Boolean(formatBits[i]);
  for (let i = 7; i < 15; i++) matrix[8][size - 15 + i] = Boolean(formatBits[i]);

  return matrix.map((row) => row.map((cell) => Boolean(cell)));
}

/**
 * Generates an SVG string of a QR code.
 */
export function generateQrSvgString(
  text: string,
  options?: QRCodeOptions,
): string {
  const size = options?.size ?? 260;
  const margin = options?.margin ?? 4;
  const darkColor = options?.darkColor ?? "#000000";
  const lightColor = options?.lightColor ?? "#ffffff";

  const matrix = generateQrMatrix(text);
  const matrixSize = matrix.length;
  const totalModules = matrixSize + margin * 2;
  const cellSize = size / totalModules;

  const rects: string[] = [];
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (matrix[r][c]) {
        const x = (c + margin) * cellSize;
        const y = (r + margin) * cellSize;
        rects.push(
          `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${(cellSize + 0.05).toFixed(2)}" height="${(cellSize + 0.05).toFixed(2)}" fill="${darkColor}" />`,
        );
      }
    }
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="crispEdges">
      <rect width="${size}" height="${size}" fill="${lightColor}" rx="8" ry="8"/>
      ${rects.join("")}
    </svg>
  `.trim();
}
