// 塗りの質感、ベータ機能の架空ナンバー
import { PL0 } from "../config.js";
import { homog } from "../geometry.js";
import { state } from "../state.js";
const REAL_PLACES = "札幌,函館,旭川,室蘭,苫小牧,釧路,知床,帯広,北見,青森,八戸,弘前,岩手,盛岡,平泉,宮城,仙台,秋田,山形,庄内,福島,会津,郡山,白河,いわき,水戸,土浦,つくば,宇都宮,那須,とちぎ,日光,群馬,前橋,高崎,埼玉,大宮,川口,所沢,川越,熊谷,春日部,越谷,千葉,成田,習志野,市川,船橋,袖ヶ浦,市原,野田,柏,松戸,東京,品川,世田谷,練馬,杉並,板橋,足立,江東,葛飾,江戸川,八王子,多摩,府中,神奈川,横浜,川崎,相模,湘南,山梨,富士山,新潟,長岡,上越,富山,石川,金沢,福井,長野,松本,諏訪,安曇野,南信州,岐阜,飛騨,静岡,浜松,沼津,伊豆,愛知,名古屋,豊橋,三河,岡崎,豊田,尾張小牧,一宮,春日井,三重,鈴鹿,四日市,伊勢志摩,滋賀,京都,大阪,なにわ,和泉,堺,兵庫,奈良,飛鳥,和歌山,神戸,姫路,鳥取,島根,出雲,岡山,倉敷,広島,福山,山口,下関,徳島,香川,高松,愛媛,高知,福岡,北九州,久留米,筑豊,佐賀,長崎,佐世保,熊本,大分,宮崎,鹿児島,奄美,沖縄,北海道,青森,岩手,茨城,栃木".split(",");
const isRealPlace = (s) => {
  const t = (s || "").replace(/\s/g, "");
  return !!t && REAL_PLACES.some((n) => t.includes(n));
};
try {
  state.BETA = localStorage.getItem("nk_beta") == "1";
  const o = JSON.parse(localStorage.getItem("nk_pl") || "null");
  if (o) state.dPl = { ...PL0, ...o };
} catch (_) {
}
const PCOL = { jp: { white: ["#f4f4ee", "#1d5a36"], yellow: ["#f2c81c", "#161616"] }, us: { white: ["#f6f6f2", "#1c2f6b", "#b3262d"], yellow: ["#f2c200", "#151515", "#151515"], black: ["#151515", "#f2c200", "#f2c200"] } };
const plEff = (it, b) => {
  if (!state.BETA) return null;
  const p = b && b.pl || it.pl || state.dPl;
  return p && p.s != "none" ? p : null;
};
const plKey = (p) => p ? [p.s, p.col, p.s == "jp" ? [p.r, p.c, p.k, p.n].join("/") : [p.t, p.m].join("/")].join("|") : "";
const PFONT = '"Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans JP","Yu Gothic","Meiryo",system-ui,sans-serif';
function plateTex(p, W) {
  const H = Math.round(W / 2), c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d"), u = H / 100;
  const pal = (PCOL[p.s] || PCOL.us)[p.col] || (PCOL[p.s] || PCOL.us)[Object.keys(PCOL[p.s] || PCOL.us)[0]];
  const rr = (x, y, w, h, r) => {
    g.beginPath();
    g.roundRect(x, y, w, h, r);
  };
  g.fillStyle = pal[0];
  rr(0, 0, W, H, 7 * u);
  g.fill();
  if (p.s == "us") {
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, "rgba(255,255,255,.18)");
    gr.addColorStop(1, "rgba(0,0,0,.06)");
    g.fillStyle = gr;
    rr(0, 0, W, H, 7 * u);
    g.fill();
    g.strokeStyle = pal[1];
    g.lineWidth = 2.4 * u;
    rr(3.2 * u, 3.2 * u, W - 6.4 * u, H - 6.4 * u, 5 * u);
    g.stroke();
  } else {
    g.strokeStyle = "rgba(0,0,0,.16)";
    g.lineWidth = 1.6 * u;
    rr(3.5 * u, 3.5 * u, W - 7 * u, H - 7 * u, 5 * u);
    g.stroke();
    g.strokeStyle = "rgba(255,255,255,.55)";
    g.lineWidth = 0.8 * u;
    rr(5 * u, 5 * u, W - 10 * u, H - 10 * u, 4 * u);
    g.stroke();
  }
  const txt = (s, x, y, size, maxW, color, weight = 800, align = "center") => {
    if (!s) return;
    g.font = `${weight} ${size}px ${PFONT}`;
    g.textAlign = align;
    g.textBaseline = "alphabetic";
    const w = g.measureText(s).width, sx = Math.min(1, maxW / Math.max(1, w));
    for (const [dx, dy, cl] of [[0.7 * u, 0.8 * u, "rgba(0,0,0,.28)"], [-0.45 * u, -0.5 * u, "rgba(255,255,255,.55)"], [0, 0, color]]) {
      g.save();
      g.translate(x + dx, y + dy);
      g.scale(sx, 1);
      g.fillStyle = cl;
      g.fillText(s, 0, 0);
      g.restore();
    }
  };
  const bolt = (x, y) => {
    const r = 3.4 * u, gr = g.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    gr.addColorStop(0, "#f2f2f2");
    gr.addColorStop(0.6, "#a9a9a9");
    gr.addColorStop(1, "#555");
    g.fillStyle = gr;
    g.beginPath();
    g.arc(x, y, r, 0, 7);
    g.fill();
    g.strokeStyle = "rgba(0,0,0,.35)";
    g.lineWidth = 0.6 * u;
    g.beginPath();
    g.moveTo(x - r * 0.55, y);
    g.lineTo(x + r * 0.55, y);
    g.stroke();
  };
  if (p.s == "jp") {
    const ink = pal[1];
    txt(`${p.r || ""} ${p.c || ""}`.trim(), W / 2, 33 * u, 23 * u, W * 0.5, ink, 700);
    txt(p.k || "", W * 0.115, 86 * u, 22 * u, W * 0.12, ink, 700);
    txt(p.n || "", W * 0.575, 89 * u, 54 * u, W * 0.75, ink, 700);
    bolt(W * 0.2, 17 * u);
    bolt(W * 0.8, 17 * u);
  } else {
    txt((p.t || "").toUpperCase(), W / 2, 23 * u, 15 * u, W * 0.7, pal[2], 800);
    txt(p.m || "", W / 2, 79 * u, 50 * u, W * 0.84, pal[1], 800);
    bolt(W * 0.12, 13 * u);
    bolt(W * 0.88, 13 * u);
    bolt(W * 0.12, 87 * u);
    bolt(W * 0.88, 87 * u);
  }
  return c;
}
function warpTo(g, tex, Q) {
  const W = tex.width, H = tex.height, M = homog([[0, 0], [W, 0], [W, H], [0, H]], Q), NX = 12, NY = 6, P = [];
  for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) {
    const s = [W * i / NX, H * j / NY];
    P.push({ s, d: M(s) });
  }
  const tri = (a, b, c) => {
    const [s0, s1, s2] = [a.s, b.s, c.s], [d0, d1, d2] = [a.d, b.d, c.d], den = (s1[0] - s0[0]) * (s2[1] - s0[1]) - (s2[0] - s0[0]) * (s1[1] - s0[1]);
    if (!den) return;
    const A = ((d1[0] - d0[0]) * (s2[1] - s0[1]) - (d2[0] - d0[0]) * (s1[1] - s0[1])) / den, C = ((d2[0] - d0[0]) * (s1[0] - s0[0]) - (d1[0] - d0[0]) * (s2[0] - s0[0])) / den, B = ((d1[1] - d0[1]) * (s2[1] - s0[1]) - (d2[1] - d0[1]) * (s1[1] - s0[1])) / den, D = ((d2[1] - d0[1]) * (s1[0] - s0[0]) - (d1[1] - d0[1]) * (s2[0] - s0[0])) / den;
    const cx = (d0[0] + d1[0] + d2[0]) / 3, cy = (d0[1] + d1[1] + d2[1]) / 3, ex = (p) => {
      const dx = p[0] - cx, dy = p[1] - cy, l = Math.hypot(dx, dy) || 1;
      return [p[0] + dx / l * 0.6, p[1] + dy / l * 0.6];
    };
    g.save();
    g.beginPath();
    [d0, d1, d2].map(ex).forEach((p, k) => k ? g.lineTo(...p) : g.moveTo(...p));
    g.closePath();
    g.clip();
    g.setTransform(A, B, C, D, d0[0] - A * s0[0] - C * s0[1], d0[1] - B * s0[0] - D * s0[1]);
    g.drawImage(tex, 0, 0);
    g.restore();
  };
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    const a = P[j * (NX + 1) + i], b = P[j * (NX + 1) + i + 1], c = P[(j + 1) * (NX + 1) + i + 1], d = P[(j + 1) * (NX + 1) + i];
    tri(a, b, c);
    tri(a, c, d);
  }
}
const PTC = /* @__PURE__ */ new Map();
function plateTexC(p, w) {
  const k = plKey(p) + "|" + w;
  let c = PTC.get(k);
  if (!c) {
    if (PTC.size > 24) PTC.clear();
    c = plateTex(p, w);
    PTC.set(k, c);
  }
  return c;
}
export {
  PCOL,
  isRealPlace,
  plEff,
  plKey,
  plateTexC,
  warpTo
};
