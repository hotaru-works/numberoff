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

// English page (/en/): the same app with the static text, title and search metadata in English,
// so search engines can show it for English searches. The UI dictionary is taken from src/i18n.js.
const SITE = "https://numberoff.pages.dev/";
const EN_TITLE = "NumberOFF – Hide or blur license plates in photos automatically (free web app)";
const EN_DESC =
  "NumberOFF finds the license plates in your car photos and covers them automatically – a free web app and a natural-looking alternative to blurring or pixelating plates. No sign-up or install, and your photos never leave your phone or computer.";
function enDict() {
  const src = readFileSync(resolve("src/i18n.js"), "utf8");
  const a = src.indexOf("const EN = "), b = src.indexOf("\n});", a) + 4;
  return new Function(src.slice(a, b) + "\nreturn EN;")();
}
const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
function englishPage(html) {
  const EN = enDict();
  const tr = (s) => {
    const k = s.trim();
    return EN[k] != null ? s.replace(k, EN[k]) : s;
  };
  // translate text between tags and accessible names, but never inside <script>
  const parts = html.split(/(<script[\s\S]*?<\/script>)/);
  for (let i = 0; i < parts.length; i += 2) {
    parts[i] = parts[i]
      .replace(/>([^<>]+)</g, (m, s) => ">" + tr(s) + "<")
      .replace(/ (aria-label|title|placeholder)="([^"]*)"/g, (m, a, s) => ` ${a}="${esc(tr(s))}"`);
  }
  html = parts.join("");
  const ld = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "NumberOFF",
    alternateName: ["Number OFF", "NumberOff", "ナンバーオフ"],
    url: SITE + "en/",
    description: EN_DESC,
    applicationCategory: "PhotographyApplication",
    operatingSystem: "iOS, Android, Windows, macOS",
    inLanguage: "en",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    image: SITE + "og.jpg",
    featureList: [
      "Automatic license plate detection and cover-up",
      "Many photos at once",
      "Find in area, hide by hand, adjust the box",
      "Color, brightness and finish (matte, gloss, wet) of the cover",
      "Crop for Instagram posts and Stories",
      "Runs on your device only (photos are never uploaded)",
      "Works offline",
    ],
    author: { "@type": "Person", name: "kaito_camaro5", url: "https://www.instagram.com/kaito_camaro5/" },
  };
  return html
    .replace('<html lang="ja">', '<html lang="en">')
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(EN_TITLE)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(EN_DESC)}">`)
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${SITE}en/">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(EN_TITLE)}">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(EN_DESC)}">`)
    .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${SITE}en/">`)
    .replace(/<meta property="og:image:alt" content="[^"]*">/, '<meta property="og:image:alt" content="NumberOFF: hide license plates in photos automatically">')
    .replace('<meta property="og:locale" content="ja_JP">', '<meta property="og:locale" content="en_US">')
    .replace('<meta property="og:locale:alternate" content="en_US">', '<meta property="og:locale:alternate" content="ja_JP">')
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, `<script type="application/ld+json">${JSON.stringify(ld)}</script>`);
}

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

      // 5. English page
      mkdirSync(join(outDir, "en"), { recursive: true });
      writeFileSync(join(outDir, "en", "index.html"), englishPage(readFileSync(join(outDir, "index.html"), "utf8")));

      // 6. sitemap: last modified = build date
      const sitemap = join(outDir, "sitemap.xml");
      if (existsSync(sitemap)) {
        const today = new Date().toISOString().slice(0, 10);
        writeFileSync(sitemap, readFileSync(sitemap, "utf8").replace(/<lastmod>[^<]*<\/lastmod>/g, `<lastmod>${today}</lastmod>`));
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
