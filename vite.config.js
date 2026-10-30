import { defineConfig } from "vite";
import { copyFileSync, createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";

// ONNX Runtime Web is loaded at runtime from /ort/ (single-threaded build, so no cross-origin isolation is needed).
const ORT_DIR = resolve("node_modules/onnxruntime-web/dist");
const ORT_FILES = ["ort.min.js", "ort-wasm.wasm", "ort-wasm-simd.wasm"];
const MAX_FILE = 25 * 1024 * 1024; // Cloudflare Pages per-file limit

// CSP: only this site may be contacted, so photos physically cannot be sent anywhere.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
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
};

const HEADERS = `/*
${Object.entries(SECURITY)
  .map(([k, v]) => `  ${k}: ${v}`)
  .join("\n")}
/assets/*
  Cache-Control: public, max-age=31536000, immutable
/ort/*
  Cache-Control: public, max-age=31536000, immutable
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
        if (!ORT_FILES.some((n) => f.endsWith(n)) || !existsSync(f)) return next();
        res.setHeader("Content-Type", f.endsWith(".wasm") ? "application/wasm" : "text/javascript");
        createReadStream(f).pipe(res);
      });
    },
    closeBundle() {
      // 1. ONNX Runtime Web
      mkdirSync(join(outDir, "ort"), { recursive: true });
      for (const f of ORT_FILES) {
        const src = join(ORT_DIR, f);
        if (!existsSync(src)) throw new Error(`missing ${src} - run "npm install" first`);
        copyFileSync(src, join(outDir, "ort", f));
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
      const ver = hash.digest("hex").slice(0, 10);
      const sw = join(outDir, "sw.js");
      writeFileSync(
        sw,
        readFileSync(sw, "utf8")
          .replace("__BUILD_VERSION__", ver)
          .replace("/* __ASSETS__ */", assets.map((a) => JSON.stringify(a)).join(", ")),
      );
      console.log(`numberoff: dist ready (sw version ${ver})`);
    },
  };
}

export default defineConfig({
  build: {
    target: "es2022",
    outDir: "dist",
    emptyOutDir: true,
  },
  // the preview server sends the same security headers as production, so tests catch CSP problems
  preview: { port: 4173, headers: SECURITY },
  plugins: [numberoff()],
});
