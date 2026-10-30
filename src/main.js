// エントリーポイント：各モジュールを読み込んで起動する
import "./styles.css";
import "./editor/pointer.js";
import "./editor/masks.js";
import "./editor/history.js";
import "./ui/tools.js";
import "./ui/plate-panel.js";
import "./ui/onboarding.js";
import "./ui/inapp.js";
import "./keyboard.js";
import "./files.js";
import "./save.js";
import { i18n } from "./i18n.js";
import { lsegUI } from "./ui/menu.js";
import { loadUI, ui } from "./ui/ui.js";
i18n();
lsegUI();
ui();
loadUI();
