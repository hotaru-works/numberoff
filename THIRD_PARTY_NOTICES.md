# Third-party notices

NumberOFF includes or uses the following third-party components.

## ONNX Runtime Web

- Version: 1.31.1 (copied into `dist/ort/` from npm by `vite.config.js` at build time)
- Copyright (c) Microsoft Corporation
- License: MIT
- https://github.com/microsoft/onnxruntime

## License plate detection model (`model.onnx`)

- Source: morsetechlab/yolov11-license-plate-detection (`license-plate-finetune-v1n.onnx`)
  https://huggingface.co/morsetechlab/yolov11-license-plate-detection
- Based on Ultralytics YOLO11 (https://github.com/ultralytics/ultralytics)
- License: AGPL-3.0
- Training data: see the model page for the dataset and its terms.

## Font: Outfit (`src/fonts/`)

- Source: https://github.com/Outfitio/Outfit-Fonts
- License: SIL Open Font License 1.1 (`src/fonts/OFL.txt`)

## Vehicle detection model (`car.onnx`)

- Source: Ultralytics YOLO11n pretrained weights (`yolo11n.pt`, release v8.3.0), exported to ONNX (640×640)
  https://github.com/ultralytics/ultralytics
- License: AGPL-3.0
- Training data: COCO 2017 (only the car, motorcycle, bus and truck classes are used by the app)

If a model is replaced (for example, retrained on Japanese plates), update this file with the new model's source, license and training data.
