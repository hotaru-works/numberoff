# NumberOFF

写真に写ったナンバープレートを、スマホやPCの中だけで自動で隠せるWebアプリです。
https://numberoff.pages.dev/

- 写真は端末の外に一切送信されません（サーバー処理なし。CSPで外部通信も禁止しています）
- AIでナンバーを自動検出し、斜めのプレートにも合わせて塗ります
- 見落としは「範囲で検出」「手動で隠す」で追加できます
- 色・明るさ・質感（マット／グロス／ウェット）を調整できます
- インスタ用などの比率で切り抜いて、そのまま共有・保存できます
- ホーム画面に追加すると、アプリのように起動し、オフラインでも使えます

隠し漏れが生じる場合があります。公開・共有の前に必ずご自身で確認してください。

## 開発

Node.js 20 以上が必要です。

```bash
npm install       # 依存パッケージ（Vite・ONNX Runtime Web など）を取得
npm run dev       # 開発サーバー（http://localhost:5173）
npm run build     # dist/ に本番用ファイルを生成
npm run preview   # ビルド結果をローカルで確認（http://localhost:4173）
npm test          # Playwright で E2E テスト（初回は npx playwright install chromium）
npm run lint      # ESLint
npm run format    # Prettier で整形
```

### フォルダ構成

```
index.html              画面のマークアップ（SEO用のmeta・JSON-LDを含む）
src/
  main.js               エントリーポイント（各モジュールを読み込んで起動）
  styles.css            スタイル
  state.js              アプリ全体で共有する状態
  config.js             定数（画素数の上限、検出しきい値、保存画質など）
  i18n.js               日本語／英語の切り替え
  dom.js                DOMヘルパー
  geometry.js           四角形・ホモグラフィなどの幾何計算
  detect/
    model.js            ONNX Runtime と検出モデルの読み込み・推論
    plates.js           検出結果の整形（タイル分割、プレート形状への補正、誤検知の除外）
  render/
    paint.js            画像と塗りの描画・切り抜き
    plate.js            塗りの質感、ベータ機能の架空ナンバー
  editor/
    view.js             表示・ズーム
    pointer.js          タップ・ドラッグ・ピンチ操作
    masks.js            塗りの追加・削除
    history.js          元に戻す／やり直す
  ui/                   ツール列、パネル、メニュー、初回ガイド、アプリ内ブラウザ案内など
  files.js              写真の読み込みとサムネイル
  save.js               保存・共有
  keyboard.js           キーボード操作（PC）
  pwa.js                Service Worker の登録
public/                 そのまま配信するファイル（model.onnx、アイコン、manifest、sw.js、robots.txt、sitemap.xml）
tests/                  Playwright の E2E テスト
vite.config.js          ビルド設定（下記）
```

### ビルドで行うこと（`vite.config.js`）

- `src/` をまとめて `dist/assets/` に出力（ファイル名にハッシュ付き）
- ONNX Runtime Web を `node_modules` から `dist/ort/` にコピー（実行時にCDNへ通信しない）
- セキュリティヘッダー（CSP など）とキャッシュ設定を `dist/_headers` に生成
- Service Worker にキャッシュするファイル一覧とバージョンを書き込み

### 検出モデル

`public/model.onnx` に、ナンバープレート検出用の YOLO（ONNX形式、入力 640×640）を置いています。
現在は [morsetechlab/yolov11-license-plate-detection](https://huggingface.co/morsetechlab/yolov11-license-plate-detection) の
`license-plate-finetune-v1n.onnx`（約10.5MB）を `model.onnx` に改名して使用しています。

## 公開（Cloudflare Pages）

- ルートディレクトリ: （空欄）
- ビルドコマンド: `npm run build`
- 出力ディレクトリ: `dist`

`main` ブランチに入ると自動で公開されます。プルリクエストごとにプレビューURLも発行されます。

## ライセンス

本ソフトウェアは **GNU Affero General Public License v3.0**（AGPL-3.0）で公開しています。全文は `LICENSE` を参照してください。
同梱しているライブラリ・モデルのライセンスは `THIRD_PARTY_NOTICES.md` を参照してください。
