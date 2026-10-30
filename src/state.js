// アプリ全体で共有する状態
import { PL0 } from "./config.js";
const state = {
  LANG: (() => {
    try {
      const v = localStorage.getItem("nk_lang");
      if (v) return v;
    } catch (_) {
    }
    return /^ja/i.test(navigator.language || "ja") ? "ja" : "en";
  })(),
  items: [],
  cur: -1,
  sess: null,
  drag: null,
  dl: null,
  ratio: "",
  lastCur: -2,
  z: 1,
  tx: 0,
  ty: 0,
  pan: false,
  g0: null,
  sel: -1,
  cf: false,
  mode: "",
  panel: "",
  qual: "md",
  fmt: "image/jpeg",
  peek: false,
  mstate: "loading",
  dBr: 0,
  dTx: "matte",
  dCl: "auto",
  BC: null,
  BETA: false,
  dPl: { ...PL0 },
  mprog: 0
};
export {
  state
};
