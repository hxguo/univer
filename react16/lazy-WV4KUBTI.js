import {
  UniverSheetsThreadCommentUIPlugin
} from "./chunk-NMBYFNRV.js";
import {
  UniverSheetsNoteUIPlugin,
  UniverSheetsTableUIPlugin
} from "./chunk-K2XLDXCC.js";
import {
  UniverDocsMentionUIPlugin
} from "./chunk-2W5XID3U.js";
import {
  UniverThreadCommentUIPlugin
} from "./chunk-J4TSATB3.js";
import "./chunk-SD6NM5MJ.js";
import "./chunk-JOUWZMLP.js";
import "./chunk-ZCFWENAC.js";
import "./chunk-L5ASSDDU.js";
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
import {
  UniverSheetsNumfmtUIPlugin
} from "./chunk-VX6P75UM.js";
import {
  UniverSheetsFormulaUIPlugin
} from "./chunk-ZLN3SZPW.js";
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

// src/sheets/lazy.ts
function getLazyPlugins() {
  return [
    [UniverDocsMentionUIPlugin],
    [UniverSheetsNumfmtUIPlugin],
    [UniverThreadCommentUIPlugin],
    [UniverSheetsThreadCommentUIPlugin],
    [UniverSheetsNoteUIPlugin],
    [UniverSheetsTableUIPlugin],
    [UniverSheetsFormulaUIPlugin],
    [UniverSheetsDataValidationUIPlugin],
    [UniverSheetsConditionalFormattingUIPlugin],
    [UniverSheetsFilterUIPlugin, { useRemoteFilterValuesGenerator: false }],
    [UniverSheetsDrawingUIPlugin]
  ];
}
export {
  getLazyPlugins as default
};
