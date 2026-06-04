import {
  UniverSheetsDrawingUIPlugin
} from "./chunk-UMVVH4XB.js";
import {
  UniverSheetsConditionalFormattingUIPlugin,
  UniverSheetsDataValidationUIPlugin,
  UniverSheetsFilterUIPlugin
} from "./chunk-HVTLLVZV.js";
import "./chunk-3ONI6QG4.js";
import "./chunk-NKL7IQFT.js";
import "./chunk-ZLN3SZPW.js";
import "./chunk-IV4BI4PG.js";
import "./chunk-7CJQIPA6.js";
import "./chunk-KACUFL2P.js";
import "./chunk-CKTITCNC.js";
import "./chunk-2T36JBDO.js";
import "./chunk-7FLYWHI2.js";
import "./chunk-YTMFKFYO.js";
import "./chunk-QIKL6BZO.js";
import "./chunk-EQ2B2W73.js";
import "./chunk-DO7PIA5W.js";

// src/sheets-multi-units/lazy.ts
function getLazyPlugins() {
  return [
    [UniverSheetsDataValidationUIPlugin],
    [UniverSheetsConditionalFormattingUIPlugin],
    [UniverSheetsFilterUIPlugin, { useRemoteFilterValuesGenerator: false }],
    [UniverSheetsDrawingUIPlugin]
  ];
}
export {
  getLazyPlugins as default
};
