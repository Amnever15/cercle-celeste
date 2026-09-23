/**
 * ZIP « store » (sans compression) — aucune dépendance npm.
 */
function crcTable() {
  var table = new Uint32Array(256);
  for (var n = 0; n < 256; n++) {
    var c = n;
    for (var k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
}

var CRC_TABLE = crcTable();

function crc32(buf) {
  var c = 0xffffffff;
  for (var i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function u16(n) {
  var b = Buffer.alloc(2);
  b.writeUInt16LE(n >>> 0, 0);
  return b;
}

function u32(n) {
  var b = Buffer.alloc(4);
  b.writeUInt32LE(n >>> 0, 0);
  return b;
}

/**
 * @param {{ name: string, data: Buffer|string }[]} files
 * @returns {Buffer}
 */
function buildZip(files) {
  var locals = [];
  var centrals = [];
  var offset = 0;
  (files || []).forEach(function (f) {
    var name = Buffer.from(String(f.name || 'file').replace(/\\/g, '/'), 'utf8');
    var data = Buffer.isBuffer(f.data) ? f.data : Buffer.from(String(f.data || ''), 'utf8');
    var crc = crc32(data);
    var local = Buffer.concat([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      name,
      data
    ]);
    var central = Buffer.concat([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      name
    ]);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  });
  var centralStart = offset;
  var centralBuf = Buffer.concat(centrals);
  var end = Buffer.concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralBuf.length),
    u32(centralStart),
    u16(0)
  ]);
  return Buffer.concat(locals.concat([centralBuf, end]));
}

module.exports = { buildZip, crc32 };
