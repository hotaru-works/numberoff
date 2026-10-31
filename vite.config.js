import { defineConfig } from "vite";
import { copyFileSync, createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";

// ONNX Runtime Web is loaded at runtime from /ort/ (single-threaded build, so no cross-origin isolation is needed).
const ORT_DIR = resolve("node_modules/onnxruntime-web/dist");
// the WebAssembly-only bundle (ort.wasm.min.js) and its runtime (.wasm and the .mjs loader);
// the WebGPU variants (*.jsep.*) are much larger and not used
const ORT_JS = "ort.wasm.min.js";
const ortFiles = () => readdirSync(ORT_DIR).filter((f) => f == ORT_JS || /^ort-wasm[\w-]*\.(wasm|mjs)$/.test(f));
const MAX_FILE = 25 * 1024 * 1024; // Cloudflare Pages per-file limit

// CSP: only this site may be contacted, so photos physically cannot be sent anywhere.
// The one exception is Cloudflare Web Analytics (visit counts only; it never sees photos).
const ANALYTICS_SCRIPT = "https://static.cloudflareinsights.com";
const ANALYTICS_REPORT = "https://cloudflareinsights.com";
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'wasm-unsafe-eval' ${ANALYTICS_SCRIPT}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  `connect-src 'self' ${ANALYTICS_REPORT}`,
  "worker-src 'self'",
  "manifest-src 'self'",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join("; ");

const SECURITY = {
  "Content-Security-Policy": CSP,
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "X-Frame-Options": "DENY",
  "Cross-Origin-Opener-Policy": "same-origin",
};

const HEADERS = `/*
${Object.entries(SECURITY)
  .map(([k, v]) => `  ${k}: ${v}`)
  .join("\n")}
/assets/*
  Cache-Control: public, max-age=31536000, immutable
/ort/*
  Cache-Control: public, max-age=86400
/model.onnx
  Cache-Control: public, max-age=86400
/sw.js
  Cache-Control: no-cache
`;

function numberoff() {
  let outDir = "dist";
  return {
    name: "numberoff",
    configResolved(c) {
      outDir = c.build.outDir;
    },
    // dev server: serve the runtime from node_modules
    configureServer(server) {
      server.middlewares.use("/ort", (req, res, next) => {
        const f = join(ORT_DIR, decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, ""));
        if (!ortFiles().some((n) => f.endsWith("/" + n))) return next();
        res.setHeader("Content-Type", f.endsWith(".wasm") ? "application/wasm" : "text/javascript");
        createReadStream(f).pipe(res);
      });
    },
    closeBundle() {
      // 1. ONNX Runtime Web
      if (!existsSync(join(ORT_DIR, ORT_JS))) throw new Error(`missing ${ORT_DIR}/${ORT_JS} - run "npm install" first`);
      mkdirSync(join(outDir, "ort"), { recursive: true });
      const ort = ortFiles();
      for (const f of ort) {
        copyFileSync(join(ORT_DIR, f), join(outDir, "ort", f));
        if (statSync(join(outDir, "ort", f)).size > MAX_FILE) throw new Error(`ort/${f} exceeds the 25 MiB Cloudflare Pages limit`);
      }

      // 2. detection model
      const model = join(outDir, "model.onnx");
      if (!existsSync(model)) this.warn("public/model.onnx not found - auto detection will be off");
      else if (statSync(model).size > MAX_FILE) throw new Error("model.onnx exceeds the 25 MiB Cloudflare Pages limit");

      // 3. security and cache headers
      writeFileSync(join(outDir, "_headers"), HEADERS);

      // 4. service worker: precache list and a content-based version so updates roll out
      const assets = readdirSync(join(outDir, "assets")).map((f) => `assets/${f}`);
      const hash = createHash("sha256").update(readFileSync(join(outDir, "index.html")));
      for (const a of assets) hash.update(a);
      if (existsSync(model)) hash.update(readFileSync(model));
      for (const f of ort) hash.update(readFileSync(join(outDir, "ort", f)));
      // files the service worker keeps for offline use: the model and the runtime
      const heavy = [...(existsSync(model) ? ["model.onnx"] : []), ...ort.map((f) => `ort/${f}`)];
      const ver = hash.digest("hex").slice(0, 10);
      const sw = join(outDir, "sw.js");
      writeFileSync(
        sw,
        readFileSync(sw, "utf8")
          .replace("__BUILD_VERSION__", ver)
          .replace("/* __ASSETS__ */", assets.map((a) => JSON.stringify(a)).join(", "))
          .replace("/* __HEAVY__ */", heavy.map((a) => JSON.stringify(a)).join(", ")),
      );

      // 5. sitemap: last modified = build date
      const sitemap = join(outDir, "sitemap.xml");
      if (existsSync(sitemap)) {
        const today = new Date().toISOString().slice(0, 10);
        writeFileSync(sitemap, readFileSync(sitemap, "utf8").replace(/<lastmod>[^<]*<\/lastmod>/, `<lastmod>${today}</lastmod>`));
      }
      console.log(`numberoff: dist ready (sw version ${ver})`);
    },
  };
}

export default defineConfig({
  // like Cloudflare Pages with a 404.html: unknown URLs are 404, not the app
  appType: "mpa",
  build: {
    target: "es2022",
    outDir: "dist",
    emptyOutDir: true,
  },
  // the preview server sends the same security headers as production, so tests catch CSP problems
  preview: { port: 4173, headers: SECURITY },
  plugins: [numberoff()],
});
