// Builds dist/ for Cloudflare Pages.
// - copies public/
// - bundles ONNX Runtime Web from node_modules (no CDN at runtime)
// - writes _headers with a strict CSP pinned to the inline script's hash
// - stamps the service worker with a build version
import { cpSync, mkdirSync, rmSync, existsSync, readFileSync, writeFileSync, copyFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const pub = join(root, 'public'), dist = join(root, 'dist');
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
cpSync(pub, dist, { recursive: true });

// ONNX Runtime Web (single-threaded build: no SharedArrayBuffer / cross-origin isolation needed)
const ortDir = join(root, 'node_modules', 'onnxruntime-web', 'dist');
mkdirSync(join(dist, 'ort'), { recursive: true });
for (const f of ['ort.min.js', 'ort-wasm.wasm', 'ort-wasm-simd.wasm']) {
  const src = join(ortDir, f);
  if (!existsSync(src)) { console.error(`missing ${src} - run "npm install" first`); process.exit(1); }
  copyFileSync(src, join(dist, 'ort', f));
}

if (!existsSync(join(dist, 'model.onnx'))) console.warn('warning: public/model.onnx not found - auto detection will be off');
else if (statSync(join(dist, 'model.onnx')).size > 25 * 1024 * 1024) { console.error('model.onnx exceeds the 25 MiB Cloudflare Pages limit'); process.exit(1); }

// CSP: only this site may be contacted. Photos physically cannot be sent anywhere.
const html = readFileSync(join(dist, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const hashes = scripts.map(s => `'sha256-${createHash('sha256').update(s, 'utf8').digest('base64')}'`).join(' ');
const csp = [
  "default-src 'self'",
  `script-src 'self' ${hashes} 'wasm-unsafe-eval'`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'"
].join('; ');
writeFileSync(join(dist, '_headers'), `/*
  Content-Security-Policy: ${csp}
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
  X-Frame-Options: DENY
/model.onnx
  Cache-Control: public, max-age=86400
/ort/*
  Cache-Control: public, max-age=31536000, immutable
/sw.js
  Cache-Control: no-cache
`);

// Version the service worker cache by content so updates roll out.
const ver = createHash('sha256').update(html).update(String(existsSync(join(dist, 'model.onnx')) ? statSync(join(dist, 'model.onnx')).size : 0)).digest('hex').slice(0, 10);
const swPath = join(dist, 'sw.js');
writeFileSync(swPath, readFileSync(swPath, 'utf8').replace('__BUILD_VERSION__', ver));
console.log(`built dist/ (version ${ver})`);
