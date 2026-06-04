import {
  UniverActionRecorderPlugin
} from "./chunk-3NR6OVFI.js";
import {
  UniverSheetsFindReplacePlugin
} from "./chunk-T3K5VKC6.js";
import {
  UniverSheetsSortUIPlugin
} from "./chunk-BOITWLAW.js";
import {
  UniverUniscriptPlugin
} from "./chunk-74F7T2NM.js";
import "./chunk-GMDX6E2J.js";
import "./chunk-A3DRKKMY.js";
import "./chunk-WLDOIN2T.js";
import {
  UniverSheetsCrosshairHighlightPlugin
} from "./chunk-VUTOEXQP.js";
import {
  UniverSheetsHyperLinkUIPlugin
} from "./chunk-LPUNP63X.js";
import "./chunk-ZCFWENAC.js";
import {
  UniverDebuggerPlugin
} from "./chunk-H6VC5INF.js";
import {
  UniverWatermarkPlugin
} from "./chunk-A5KEOE5U.js";
import "./chunk-UMVVH4XB.js";
import "./chunk-NDFRXY75.js";
import "./chunk-NKL7IQFT.js";
import "./chunk-ZLN3SZPW.js";
import "./chunk-7CJQIPA6.js";
import "./chunk-35M3EIPZ.js";
import "./chunk-KACUFL2P.js";
import "./chunk-CKTITCNC.js";
import "./chunk-2T36JBDO.js";
import "./chunk-7FLYWHI2.js";
import "./chunk-YTMFKFYO.js";
import "./chunk-QIKL6BZO.js";
import "./chunk-EQ2B2W73.js";
import "./chunk-DO7PIA5W.js";

// src/sheets-no-worker/very-lazy.ts
var IS_E2E = false;
function getVeryLazyPlugins() {
  const plugins = [
    [UniverActionRecorderPlugin],
    [UniverSheetsHyperLinkUIPlugin],
    [UniverSheetsSortUIPlugin],
    [UniverSheetsCrosshairHighlightPlugin],
    [UniverSheetsFindReplacePlugin],
    [UniverWatermarkPlugin]
  ];
  if (!IS_E2E) {
    plugins.push([UniverDebuggerPlugin]);
    plugins.push([UniverUniscriptPlugin, {
      getWorkerUrl(_, label) {
        if (label === "json") {
          return "/vs/language/json/json.worker.js";
        }
        if (label === "css" || label === "scss" || label === "less") {
          return "/vs/language/css/css.worker.js";
        }
        if (label === "html" || label === "handlebars" || label === "razor") {
          return "/vs/language/html/html.worker.js";
        }
        if (label === "typescript" || label === "javascript") {
          return "/vs/language/typescript/ts.worker.js";
        }
        return "/vs/editor/editor.worker.js";
      }
    }]);
  }
  return plugins;
}
export {
  getVeryLazyPlugins as default
};
