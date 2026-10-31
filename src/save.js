// 保存・共有
import { MAXPX, QL } from "./config.js";
import { $ } from "./dom.js";
import { ensureBmp, trimBmps } from "./files.js";
import { tr } from "./i18n.js";
import { crop, paint } from "./render/paint.js";
import { state } from "./state.js";
import { msg } from "./ui/toast.js";
import { ui } from "./ui/ui.js";
const CAN_SHARE = (() => {
  try {
    return !!(navigator.canShare && navigator.canShare({ files: [new File(["x"], "a.jpg", { type: "image/jpeg" })] }));
  } catch (_) {
    return false;
  }
})();
async function render(it) {
  await ensureBmp(it);
  it.busy = true;
  try {
    return await render0(it);
  } finally {
    it.busy = false;
    trimBmps();
  }
}
async function render0(it) {
  const L = QL[state.qual], lim = L.max ? Math.min(1, L.max / Math.max(it.bmp.width, it.bmp.height)) : 1;
  const s = Math.min(lim, Math.sqrt(MAXPX / (it.bmp.width * it.bmp.height)), 1), c = document.createElement("canvas");
  paint(it, c, s, -1, false);
  const [x, y, w, h] = crop(c.width, c.height, it), o = document.createElement("canvas");
  o.width = w;
  o.height = h;
  o.getContext("2d").drawImage(c, x, y, w, h, 0, 0, w, h);
  c.width = c.height = 0;
  const blob = await new Promise((r) => o.toBlob(r, state.fmt, L.q));
  o.width = o.height = 0;
  const ext = { "image/png": "png", "image/webp": "webp" }[blob.type] || "jpg";
  return { blob, scaled: s < lim, name: outName(it) + "." + ext };
}
let saveAt = /* @__PURE__ */ new Date();
function outName(it) {
  const d = saveAt, p = (n) => String(n).padStart(2, "0"), l = state.items.filter((q) => q.ok), i = l.indexOf(it);
  return "NumberOFF_" + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "_" + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds()) + (l.length > 1 ? "_" + p(i + 1) : "");
}
async function save(kind) {
  saveAt = /* @__PURE__ */ new Date();
  const bs = ["#go", "#sv", "#sh"].map((q) => $(q));
  bs.forEach((b) => b.disabled = true);
  let done = 0, sc = false;
  const list = state.items.filter((q) => q.ok);
  try {
    if (kind == "share") {
      msg("準備中…");
      const fs = [];
      for (const it of list) {
        const r = await render(it);
        sc = sc || r.scaled;
        fs.push(new File([r.blob], r.name, { type: r.blob.type }));
      }
      try {
        await navigator.share({ files: fs });
        done = fs.length;
        list.forEach((q) => q.saved = true);
      } catch (err) {
        if (!(err && err.name == "AbortError")) msg(tr("共有できませんでした"));
      }
    } else if (state.dl) {
      for (const it of list) {
        try {
          const r = await render(it);
          sc = sc || r.scaled;
          await state.dl.save({ filename: r.name, data: r.blob });
          done++;
          it.saved = true;
        } catch (err) {
          if (err && err.code == "declined") break;
          msg(tr("保存できませんでした"));
          break;
        }
      }
    } else {
      for (const it of list) {
        const r = await render(it);
        sc = sc || r.scaled;
        const u = URL.createObjectURL(r.blob), a = document.createElement("a");
        a.href = u;
        a.download = r.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(u), 4e3);
        await new Promise((r2) => setTimeout(r2, 400));
        done++;
        it.saved = true;
      }
    }
    if (done) msg(tr(kind == "share" ? "{n}枚 共有しました" : "{n}枚 保存しました", { n: done }) + (sc ? tr("（端末の上限で縮小あり）") : ""));
  } finally {
    bs.forEach((b) => b.disabled = false);
    trimBmps();
    ui();
  }
}
addEventListener("beforeunload", (e) => {
  if (state.items.some((q) => !q.saved)) {
    e.preventDefault();
    e.returnValue = "";
  }
});
export {
  CAN_SHARE,
  save
};
