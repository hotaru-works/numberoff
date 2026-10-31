// 塗りの追加・削除
import { infer } from "../detect/model.js";
import { fitAll, priorOf } from "../detect/plates.js";
import { $ } from "../dom.js";
import { pushHist } from "./history.js";
import { draw, placeDel, unzoom } from "./view.js";
import { bbq, ovr } from "../geometry.js";
import { tr } from "../i18n.js";
import { state } from "../state.js";
import { msg } from "../ui/toast.js";
import { ui } from "../ui/ui.js";
async function runRegion(d) {
  const it = state.items[state.cur];
  if (!it || !it.bmp) return;
  it.busy = true;
  try {
    await runRegion0(it, d);
  } finally {
    it.busy = false;
  }
}
async function runRegion0(it, d) {
  const W = it.bmp.width, H = it.bmp.height, a = d.a, b = d.b;
  let x = Math.max(0, Math.min(a[0], b[0])), y = Math.max(0, Math.min(a[1], b[1])), w = Math.min(W - x, Math.abs(a[0] - b[0])), h = Math.min(H - y, Math.abs(a[1] - b[1]));
  if (w < W * 0.02 && h < W * 0.02) {
    return;
  }
  if (!state.sess) {
    msg(tr("自動検出がオフです"));
    return;
  }
  const ex = Math.max(w, h) * 0.12;
  x = Math.max(0, x - ex);
  y = Math.max(0, y - ex);
  w = Math.min(W - x, w + ex * 2);
  h = Math.min(H - y, h + ex * 2);
  msg(tr("検出中…"));
  try {
    let rs = await infer(it.bmp, x, y, w, h);
    if (!rs.length) rs = await infer(it.bmp, x, y, w, h, 0.08);
    rs = rs.filter((r) => {
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      return cx >= x && cx <= x + w && cy >= y && cy <= y + h;
    });
    const nb = fitAll(it.bmp, rs, priorOf(it.boxes)).filter((n) => !it.boxes.some((o) => ovr(bbq(o.q), bbq(n.q)) > 0.4));
    if (!nb.length) {
      msg(tr("見つかりませんでした"));
      return;
    }
    pushHist(it);
    it.boxes.push(...nb);
    it.ok = false;
    msg(tr("{n}か所 見つかりました", { n: nb.length }));
  } catch (_) {
    msg(tr("検出できませんでした"));
  }
  ui();
  draw();
}
$("#dely").onclick = () => {
  if (!state.cf) {
    state.cf = true;
    placeDel();
    return;
  }
  const it = state.items[state.cur];
  state.cf = false;
  if (state.sel >= 0 && it.boxes[state.sel]) {
    pushHist(it);
    it.boxes.splice(state.sel, 1);
    state.sel = -1;
    it.ok = false;
    unzoom();
    ui();
    draw();
  }
};
$("#deln").onclick = () => {
  state.cf = false;
  placeDel();
};
$("#decb").onclick = () => {
  state.sel = -1;
  state.cf = false;
  unzoom();
  ui();
  draw();
};
export {
  runRegion
};
