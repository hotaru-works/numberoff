// 写真を展開せずにヘッダーから縦横のサイズを読む（JPEG・PNG・WebP）
// 大きな写真を最初から縮めて読み込むために使う。読めない形式は null。

const HEAD = 512 * 1024; // JPEG は EXIF やサムネイルの後ろにサイズがあるので多めに読む

export async function imageSize(file) {
  const d = new DataView(await file.slice(0, HEAD).arrayBuffer());
  if (d.byteLength < 30) return null;
  if (d.getUint16(0) == 0xffd8) return jpeg(d);
  if (d.getUint32(0) == 0x89504e47) return { w: d.getUint32(16), h: d.getUint32(20) };
  if (d.getUint32(0) == 0x52494646 && d.getUint32(8) == 0x57454250) return webp(d);
  return null;
}

function jpeg(d) {
  let o = 2,
    rot = 1;
  while (o + 9 < d.byteLength) {
    if (d.getUint8(o) != 0xff) return null;
    const m = d.getUint8(o + 1);
    if (m == 0xff) {
      o++;
      continue;
    }
    if (m == 0xd8 || m == 0x01 || (m >= 0xd0 && m <= 0xd7)) {
      o += 2;
      continue;
    }
    if (m == 0xd9 || m == 0xda) return null;
    const len = d.getUint16(o + 2);
    if (m == 0xe1) rot = exifOrientation(d, o + 4, len - 2) || rot;
    // SOF0–SOF15 (C4 = DHT, C8 = JPG, CC = DAC are not frame headers)
    if (m >= 0xc0 && m <= 0xcf && m != 0xc4 && m != 0xc8 && m != 0xcc) {
      const h = d.getUint16(o + 5),
        w = d.getUint16(o + 7);
      return rot >= 5 ? { w: h, h: w } : { w, h };
    }
    o += 2 + len;
  }
  return null;
}

function exifOrientation(d, o, len) {
  if (o + 14 > d.byteLength || d.getUint32(o) != 0x45786966) return 0; // "Exif"
  const t = o + 6,
    le = d.getUint16(t) == 0x4949,
    ifd = t + d.getUint32(t + 4, le),
    end = Math.min(d.byteLength, o + len);
  if (ifd + 2 > end) return 0;
  const n = d.getUint16(ifd, le);
  for (let i = 0; i < n; i++) {
    const e = ifd + 2 + i * 12;
    if (e + 10 > end) return 0;
    if (d.getUint16(e, le) == 0x0112) return d.getUint16(e + 8, le);
  }
  return 0;
}

function webp(d) {
  const c = d.getUint32(12);
  if (c == 0x56503820 /* "VP8 " */) return { w: d.getUint16(26, true) & 0x3fff, h: d.getUint16(28, true) & 0x3fff };
  if (c == 0x5650384c /* "VP8L" */) {
    const b = d.getUint32(21, true);
    return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 };
  }
  if (c == 0x56503858 /* "VP8X" */) {
    const w = d.getUint8(24) | (d.getUint8(25) << 8) | (d.getUint8(26) << 16),
      h = d.getUint8(27) | (d.getUint8(28) << 8) | (d.getUint8(29) << 16);
    return { w: w + 1, h: h + 1 };
  }
  return null;
}
