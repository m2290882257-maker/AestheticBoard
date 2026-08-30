const dns = require('node:dns').promises;
const nodeNet = require('node:net');

const allowedImageMimeTypes = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);
const maxRemoteImageBytes = 25 * 1024 * 1024;
const maxRemoteImagePixels = 40 * 1000 * 1000;
const maxRedirects = 5;
const fetchTimeoutMs = 12000;

function ipToNumber(ip) {
  return ip.split('.').reduce((sum, part) => (sum << 8) + Number(part), 0) >>> 0;
}

function inIpv4Range(ip, start, end) {
  const value = ipToNumber(ip);
  return value >= ipToNumber(start) && value <= ipToNumber(end);
}

function isBlockedIp(address) {
  const ipVersion = nodeNet.isIP(address);
  if (ipVersion === 4) {
    return address === '0.0.0.0'
      || inIpv4Range(address, '10.0.0.0', '10.255.255.255')
      || inIpv4Range(address, '127.0.0.0', '127.255.255.255')
      || inIpv4Range(address, '169.254.0.0', '169.254.255.255')
      || inIpv4Range(address, '172.16.0.0', '172.31.255.255')
      || inIpv4Range(address, '192.168.0.0', '192.168.255.255')
      || inIpv4Range(address, '224.0.0.0', '239.255.255.255')
      || inIpv4Range(address, '240.0.0.0', '255.255.255.255');
  }
  if (ipVersion === 6) {
    const normalized = address.toLowerCase();
    return normalized === '::1'
      || normalized === '::'
      || normalized.startsWith('fc')
      || normalized.startsWith('fd')
      || normalized.startsWith('fe80:');
  }
  return false;
}

function validateRemoteImageUrl(value) {
  let url;
  try { url = new URL(String(value || '')); } catch { throw new Error('REMOTE_INVALID_URL'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('REMOTE_UNSUPPORTED_PROTOCOL');
  const host = url.hostname.toLowerCase();
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) throw new Error('REMOTE_BLOCKED_LOCAL_HOST');
  if (isBlockedIp(host)) throw new Error('REMOTE_BLOCKED_PRIVATE_HOST');
  url.username = '';
  url.password = '';
  return url;
}

async function assertRemoteHostAllowed(url) {
  const host = url.hostname;
  if (nodeNet.isIP(host)) return;
  let records;
  try { records = await dns.lookup(host, { all: true, verbatim: true }); }
  catch { throw new Error('REMOTE_DNS_FAILED'); }
  if (!records.length) throw new Error('REMOTE_DNS_EMPTY');
  if (records.some((record) => isBlockedIp(record.address))) throw new Error('REMOTE_BLOCKED_PRIVATE_ADDRESS');
}

function mimeFromResponse(response) {
  return String(response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
}

function readUInt24(bytes, offset) {
  return (bytes[offset] << 16) + (bytes[offset + 1] << 8) + bytes[offset + 2];
}

function jpegSize(bytes) {
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset += 1; continue; }
    const marker = bytes[offset + 1];
    const length = bytes.readUInt16BE(offset + 2);
    if (length < 2) break;
    if (marker >= 0xc0 && marker <= 0xc3) return { width: bytes.readUInt16BE(offset + 7), height: bytes.readUInt16BE(offset + 5) };
    offset += 2 + length;
  }
  return { width: 0, height: 0 };
}

function webpSize(bytes) {
  const chunk = bytes.slice(12, 16).toString('ascii');
  if (chunk === 'VP8 ' && bytes.length >= 30) return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
  if (chunk === 'VP8L' && bytes.length >= 25) {
    const b0 = bytes[21], b1 = bytes[22], b2 = bytes[23], b3 = bytes[24];
    return { width: 1 + (((b1 & 0x3f) << 8) | b0), height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)) };
  }
  if (chunk === 'VP8X' && bytes.length >= 30) return { width: 1 + readUInt24(bytes, 24), height: 1 + readUInt24(bytes, 27) };
  return { width: 0, height: 0 };
}

function detectRemoteImageInfo(bytes) {
  if (bytes.length > 24 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return { mime: 'image/png', width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  if (bytes.length > 10 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { mime: 'image/jpeg', ...jpegSize(bytes) };
  if (bytes.length > 10 && bytes.slice(0, 3).toString('ascii') === 'GIF') return { mime: 'image/gif', width: bytes.readUInt16LE(6), height: bytes.readUInt16LE(8) };
  if (bytes.length > 30 && bytes.slice(0, 4).toString('ascii') === 'RIFF' && bytes.slice(8, 12).toString('ascii') === 'WEBP') return { mime: 'image/webp', ...webpSize(bytes) };
  throw new Error('REMOTE_UNSUPPORTED_MAGIC_BYTES');
}

function assertImageSizeAllowed(info) {
  const pixels = Number(info.width || 0) * Number(info.height || 0);
  if (pixels > maxRemoteImagePixels) throw new Error('REMOTE_IMAGE_PIXEL_LIMIT');
}

function policySummary() {
  return 'HTTP/HTTPS images only; blocks localhost, private/link-local addresses, over-large files, mismatched MIME, and more than ' + maxRedirects + ' redirects.';
}

module.exports = {
  allowedImageMimeTypes,
  maxRemoteImageBytes,
  maxRemoteImagePixels,
  maxRedirects,
  fetchTimeoutMs,
  validateRemoteImageUrl,
  assertRemoteHostAllowed,
  mimeFromResponse,
  detectRemoteImageInfo,
  assertImageSizeAllowed,
  policySummary
};
