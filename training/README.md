# 検出モデルの追加学習

`NumberOFF_train.ipynb` を Google Colab（無料の T4 GPU）で上から順に実行すると、今のモデルに日本のナンバーを追加で覚えさせた `model.onnx` ができます。

Colab で直接開く：
https://colab.research.google.com/github/hotaru-works/numberoff/blob/main/training/NumberOFF_train.ipynb

- 写真と枠のデータは自分の Google ドライブ（`NumberOFF/`）だけに置き、このリポジトリには入れません
- できたモデルは元のモデル（YOLO11）と同じ AGPL-3.0 です
