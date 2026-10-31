// 日本語／英語の切り替え
import { state } from "./state.js";
const EN = { "ここに写真をドロップ": "Drop photos here", "ご利用について": "Terms of use", "まとめて何枚でも": "As many as you like", "やり直す": "Redo", "インスタ": "Instagram", "ウェット": "Wet", "オリジナル": "Original", "オレンジ": "Orange", "グレー": "Gray", "グロス": "Gloss", "サンプルで試す": "Try a sample", "スキップ": "Skip", "ストーリーズ": "Stories", "ソースコード": "Source code", "タップして調整": "Tap to adjust", "ナンバーの検出は自動処理のため、隠し漏れが生じる場合があります。公開・共有の前に必ずご自身で確認してください。": "Detection is automatic and may miss a plate. Always check before you post or share.", "ナンバーを検出中…": "Finding plates…", "ナンバーを見つけて白く塗る": "Plates are found and painted over", "ピンク": "Pink", "マット": "Matte", "リサイズ": "Resize", "使い方": "How to use", "保存": "Save", "保存の画質": "Quality", "保存形式": "Format", "元": "Orig", "元に戻す": "Undo", "元サイズ": "Full size", "写真を選ぶ": "Choose photos", "削除しますか？": "Delete?", "加工前を表示（押している間）": "Show original (hold)", "好きな色": "Custom color", "戻る": "Back", "手動で隠す": "Hide by hand", "拡大": "Zoom in", "明るさ": "Brightness", "本アプリの利用により生じたいかなる損害についても、開発者は責任を負いません。": "The developer is not liable for any damage resulting from use of this app.", "検出モデル: YOLO11（AGPL-3.0）／推論: ONNX Runtime Web（MIT）": "Model: YOLO11 (AGPL-3.0) / Runtime: ONNX Runtime Web (MIT)", "標準": "Standard", "横長": "Wide", "次へ": "Next", "正方形": "Square", "水色": "Light blue", "決定": "Done", "濃いグレー": "Dark gray", "画像はすべてお使いの端末内で処理され、外部のサーバーへ送信・保存されることはありません。": "All photos are processed on your device and are never sent to or stored on any server.", "画像移動": "Pan", "白": "White", "範囲で検出": "Find in area", "範囲で検出 ／ 手動で隠す": "Find in area / Hide by hand", "紫": "Purple", "緑": "Green", "縮小": "Zoom out", "自動で隠れる": "Hidden automatically", "自動検出を準備中…": "Preparing detection…", "自動（写真になじむ白）": "Auto (matches the photo)", "色": "Color", "見つからない時は": "If one is missed", "角と辺をドラッグ": "Drag the corners and edges", "設定と情報": "Settings & info", "質感": "Finish", "赤": "Red", "軽量": "Light", "選ぶ": "Choose", "長辺2048": "2048px", "閉じる": "Close", "隠す": "Hide", "青": "Blue", "高画質": "High", "黄": "Yellow", "黒": "Black", "設定と情報 ": "Settings & info", "この写真を外す": "Remove this photo", "OKを押した写真が保存されます": "Photos you OK are saved", "OKを押した写真が共有されます": "Photos you OK are shared", "はじめる": "Start", "もうしばらくお待ちください…": "Almost there…", "使えません": "Unavailable", "使用できます": "Ready", "保存できませんでした": "Could not save", "共有できませんでした": "Could not share", "写真を外しました": "Photo removed", "切り抜き範囲の外です": "Outside the crop", "削除": "Delete", "削除しました": "Deleted", "検出できませんでした": "Detection failed", "検出の準備中… ": "Getting ready… ", "検出中…": "Finding…", "準備中": "Preparing", "自動検出がオフです": "Detection is off", "自動検出が使えません": "Detection unavailable", "自動検出できませんでした": "Detection failed", "自動検出を準備中… ": "Preparing detection… ", "自動検出を準備中です": "Detection is getting ready", "自動検出：": "Detection: ", "見つかりませんでした": "Nothing found", "開けない写真がありました": "Some photos could not be opened", "（端末の上限で縮小あり）": " (downsized for this device)", "{n}か所 隠し済み": "{n} hidden", "保存 {n}枚": "Save {n}", "共有": "Share", "{n}枚 共有しました": "Shared {n}", "{n}枚 保存しました": "Saved {n}", "{n}か所 見つかりました": "Found {n}", "言語": "Language", "設定と情報を開く": "Settings & info", "ブラウザで開いてください": "Open in your browser", "アプリの中のブラウザでは、写真の保存がうまくいかないことがあります。": "Saving photos may not work inside this app’s built-in browser.", "ブラウザで開く": "Open in browser", "リンクをコピー": "Copy link", "リンクをコピーしました": "Link copied", "右上の「…」→「外部ブラウザで開く」": "Tap “…” at the top right and choose “Open in external browser”", "このまま使う": "Continue here", "コピーしたリンクをSafariかChromeに貼り付けてください": "Paste the copied link into Safari or Chrome", "ベータ機能": "Beta features", "架空プレート": "Fictional plate", "プレート": "Plate", "なし": "None", "日本風": "Japan", "アメリカ風": "USA", "地名": "Place", "分類番号": "Class", "ひらがな": "Kana", "番号": "Number", "上の文字": "Top line", "文字": "Text", "このナンバーだけ": "This plate only", "この写真のナンバーすべて": "All plates in this photo", "実在の地名は使えません": "Real place names can’t be used", "日本": "Japan", "アメリカ": "USA" };
// スタート画面の下の紹介文
Object.assign(EN, {
  "ナンバーをタップすると1枚ずつ変えられます": "Tap a plate to change just that one",
  "ほかと同じにする": "Same as the others",
  "NumberOFFについて": "About NumberOFF",
  "写真のナンバープレートを、自動で隠す無料Webアプリ": "A free web app that hides license plates in your photos",
  "NumberOFF は、車の写真に写ったナンバープレートをAIで見つけて塗りつぶすWebアプリです。イベントやSNSに写真を投稿する前に、ブラウザだけで使えます。登録やインストールはいりません。":
    "NumberOFF finds the license plates in your car photos with AI and covers them up. Use it in your browser before posting photos from events or to social media. No sign-up or installation needed.",
  "できること": "What it does",
  "自動で検出": "Automatic detection",
  "写真を選ぶだけで、ナンバープレートを見つけて隠します。斜めのプレートにも形を合わせます。": "Just choose a photo and the plates are found and covered, even when they are at an angle.",
  "まとめて処理": "Many photos at once",
  "何枚でもまとめて選べます。": "Choose as many photos as you like.",
  "手直しも簡単": "Easy to adjust",
  "見落としは「範囲で検出」「手動で隠す」で追加でき、枠は角や辺をドラッグして調整できます。": "Add missed plates with “Find in area” or “Hide by hand”, and drag the corners and edges to adjust.",
  "自然な仕上がり": "Natural look",
  "塗りの色・明るさ・質感（マット・グロス・ウェット）を写真に合わせられます。": "Match the color, brightness and finish (matte, gloss, wet) to your photo.",
  "SNS向けに切り抜き": "Crop for social media",
  "インスタ（4:5）やストーリーズ（9:16）の比率で、そのまま保存・共有できます。": "Save or share in Instagram (4:5) or Stories (9:16) proportions.",
  "使い方": "How to use",
  "「写真を選ぶ」で写真を選ぶ": "Tap “Choose photos”",
  "自動で隠れた場所を確認し、必要なら調整する": "Check what was covered and adjust if needed",
  "「OK」を押して、保存または共有する": "Tap “OK”, then save or share",
  "写真は外に送られません": "Your photos never leave your device",
  "写真の処理はすべてお使いのスマホやPCの中で行います。サーバーへの送信や保存はしません。一度開けばオフラインでも使えます。":
    "All processing happens on your phone or computer. Nothing is uploaded or stored on a server. After the first visit it also works offline.",
  "よくある質問": "FAQ",
  "無料ですか？": "Is it free?",
  "無料です。登録もいりません。": "Yes, and no sign-up is needed.",
  "どの端末で使えますか？": "Which devices does it work on?",
  "iPhone・Androidのスマホ、Windows・MacのPCのブラウザで使えます。ホーム画面に追加すると、アプリのように起動できます。":
    "In the browser on iPhone and Android phones and on Windows and Mac computers. Add it to your home screen to open it like an app.",
  "隠し漏れはありますか？": "Can it miss a plate?",
  "自動検出のため、見落とすことがあります。公開・共有の前に必ずご自身で確認してください。": "Yes, automatic detection can miss plates. Always check before you publish or share.",
});
const tr = (k, p) => {
  let v = state.LANG == "en" && EN[k] != null ? EN[k] : k;
  if (p) for (const x in p) v = v.split("{" + x + "}").join(p[x]);
  return v;
};
const T0 = /* @__PURE__ */ new WeakMap();
const A0 = /* @__PURE__ */ new WeakMap();
const TITLE0 = document.title;
function i18n() {
  document.documentElement.lang = state.LANG;
  document.title = state.LANG == "en" ? "NumberOFF – Free web app that hides license plates in photos" : TITLE0;
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) {
    if (n.parentElement.closest("script,style")) continue;
    if (!T0.has(n)) T0.set(n, n.nodeValue);
    const o = T0.get(n), k = o.trim();
    if (!k) continue;
    n.nodeValue = state.LANG == "en" && EN[k] != null ? o.replace(k, EN[k]) : o;
  }
  document.querySelectorAll("[aria-label],[title],[placeholder]").forEach((e) => {
    if (!A0.has(e)) A0.set(e, { a: e.getAttribute("aria-label"), t: e.getAttribute("title"), p: e.getAttribute("placeholder") });
    const o = A0.get(e);
    if (o.a != null) e.setAttribute("aria-label", tr(o.a));
    if (o.t) e.setAttribute("title", tr(o.t));
    if (o.p) e.setAttribute("placeholder", tr(o.p));
  });
}
export {
  i18n,
  tr
};
