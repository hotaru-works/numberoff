# NumberOFF

写真に写ったナンバープレートを、スマホやPCの中だけで白く隠せるWebアプリです。

- 写真は端末の外に一切送信されません（サーバー処理なし。CSPで外部通信も禁止しています）
- AIでナンバーを自動検出し、斜めのプレートにも合わせて塗ります
- 見落としは「範囲で検出」「手動で隠す」で追加できます
- インスタ用などの比率で切り抜いて、そのまま共有・保存できます
- ホーム画面に追加すると、アプリのように起動し、オフラインでも使えます

## 使い方

1. 「写真を選ぶ」で写真を選ぶ（何枚でも）
2. 自動で隠れたナンバーを確認し、必要なら枠をタップして角や辺をドラッグで調整
3. 「OK」で確認済みにして、「共有」または「保存」

隠し漏れが生じる場合があります。公開・共有の前に必ずご自身で確認してください。

## 開発

```bash
npm install          # ONNX Runtime Web を取得
# public/model.onnx を置く（下記「検出モデル」参照）
npm run build        # dist/ を生成
npm run preview      # ローカルで確認
```

ソースは `public/index.html` の1ファイルです（HTML / CSS / JavaScript、フレームワークなし）。
`npm run build` は次を行います。

- `public/` を `dist/` にコピー
- ONNX Runtime Web を `dist/ort/` に同梱（実行時にCDNへ通信しない）
- インラインスクリプトのハッシュ付きCSPを `dist/_headers` に生成
- Service Worker のキャッシュバージョンを更新

### 検出モデル

`public/model.onnx` に、ナンバープレート検出用の YOLO（ONNX形式、入力 640×640）を置いてください。
現在は [morsetechlab/yolov11-license-plate-detection](https://huggingface.co/morsetechlab/yolov11-license-plate-detection) の
`license-plate-finetune-v1n.onnx`（約10.5MB）を `model.onnx` に改名して使用しています。

## 公開（Cloudflare Pages）

- ビルドコマンド: `npm run build`
- 出力ディレクトリ: `dist`
- ルートディレクトリ: （空欄）

## ライセンス

本ソフトウェアは **GNU Affero General Public License v3.0**（AGPL-3.0）で公開しています。全文は `LICENSE` を参照してください。
同梱しているライブラリ・モデルのライセンスは `THIRD_PARTY_NOTICES.md` を参照してください。
