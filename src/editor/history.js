// 元に戻す／やり直す
import { $ } from "../dom.js";
import { draw, unzoom } from "./view.js";
import { state } from "../state.js";
import { ui } from "../ui/ui.js";
function snap(it) {
  return it.boxes.map((b) => b.pl ? { q: b.q.map((v) => [...v]), pl: { ...b.pl } } : { q: b.q.map((v) => [...v]) });
}
const look = (it) => ({ cl: it.cl, br: it.br, tx: it.tx, pl: it.pl ? { ...it.pl } : void 0 });
const setLook = (it, a) => {
  it.cl = a.cl;
  it.br = a.br;
  it.tx = a.tx;
  it.pl = a.pl ? { ...a.pl } : void 0;
};
function pushHist(it, sn) {
  (it.hist = it.hist || []).push({ b: sn || snap(it), a: look(it) });
  if (it.hist.length > 40) it.hist.shift();
  it.fut = [];
}
function afterHist(it) {
  state.cf = false;
  it.ok = false;
  if (state.sel >= it.boxes.length) {
    state.sel = -1;
    unzoom();
  }
  ui();
  draw();
}
$("#undo").onclick = () => {
  const it = state.items[state.cur];
  if (!it || !it.hist || !it.hist.length) return;
  (it.fut = it.fut || []).push({ b: snap(it), a: look(it) });
  const e = it.hist.pop();
  it.boxes = e.b;
  setLook(it, e.a);
  afterHist(it);
};
$("#redo").onclick = () => {
  const it = state.items[state.cur];
  if (!it || !it.fut || !it.fut.length) return;
  (it.hist = it.hist || []).push({ b: snap(it), a: look(it) });
  const e = it.fut.pop();
  it.boxes = e.b;
  setLook(it, e.a);
  afterHist(it);
};
export {
  pushHist,
  snap
};
