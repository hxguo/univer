import {
  FBaseInitialable,
  FUniver
} from "./chunk-NDFRXY75.js";
import {
  DocSelectionRenderService,
  InsertTextCommand
} from "./chunk-KACUFL2P.js";
import {
  IRenderManagerService
} from "./chunk-YTMFKFYO.js";
import {
  ICommandService,
  IResourceLoaderService,
  IUniverInstanceService,
  Inject,
  Injector,
  RedoCommand,
  UndoCommand
} from "./chunk-QIKL6BZO.js";
import {
  __decorateClass,
  __decorateParam,
  __publicField
} from "./chunk-DO7PIA5W.js";

// ../packages/docs/src/facade/f-document.ts
var FDocument = class extends FBaseInitialable {
  constructor(_documentDataModel, _injector, _univerInstanceService, _resourceLoaderService, _commandService) {
    super(_injector);
    __publicField(this, "_documentDataModel", _documentDataModel);
    __publicField(this, "_injector", _injector);
    __publicField(this, "_univerInstanceService", _univerInstanceService);
    __publicField(this, "_resourceLoaderService", _resourceLoaderService);
    __publicField(this, "_commandService", _commandService);
    __publicField(this, "id");
    this.id = this._documentDataModel.getUnitId();
  }
  /**
   * Get the document data model of the document.
   * @returns {DocumentDataModel} The document data model.
   * @example
   * ```typescript
   * const fDocument = univerAPI.getActiveDocument();
   * const documentDataModel = fDocument.getDocumentDataModel();
   * console.log(documentDataModel);
   * ```
   */
  getDocumentDataModel() {
    return this._documentDataModel;
  }
  dispose() {
    super.dispose();
  }
  /**
   * Get the document id.
   * @returns {string} The document id.
   * @example
   * ```typescript
   * const fDocument = univerAPI.getActiveDocument();
   * const unitId = fDocument.getId();
   * console.log(unitId);
   * ```
   */
  getId() {
    return this.id;
  }
  /**
   * Get the document name.
   * @returns {string} The document name.
   * @example
   * ```typescript
   * const fDocument = univerAPI.getActiveDocument();
   * const name = fDocument.getName();
   * console.log(name);
   * ```
   */
  getName() {
    return this._documentDataModel.getTitle() || "";
  }
  /**
   * Save the document snapshot data, including the document content and resource data, etc.
   * @returns {IDocumentData} The document snapshot data.
   * @example
   * ```typescript
   * const fDocument = univerAPI.getActiveDocument();
   * const snapshot = fDocument.save();
   * console.log(snapshot);
   * ```
   */
  save() {
    const snapshot = this._resourceLoaderService.saveUnit(this._documentDataModel.getUnitId());
    return snapshot;
  }
  /**
   * Undo the last operation in the document.
   * @returns {Promise<boolean>} A promise that resolves to true if the undo operation was successful, or false if it failed.
   * @example
   * ```typescript
   * const fDocument = univerAPI.getActiveDocument();
   * await fDocument.undo();
   * ```
   */
  undo() {
    this._univerInstanceService.focusUnit(this.id);
    return this._commandService.executeCommand(UndoCommand.id);
  }
  /**
   * Redo the last undone operation in the document.
   * @returns {Promise<boolean>} A promise that resolves to true if the redo operation was successful, or false if it failed.
   * @example
   * ```typescript
   * const fDocument = univerAPI.getActiveDocument();
   * await fDocument.redo();
   * ```
   */
  redo() {
    this._univerInstanceService.focusUnit(this.id);
    return this._commandService.executeCommand(RedoCommand.id);
  }
  /**
   * Adds the specified text to the end of this text region.
   * @param {string} text - The text to be added to the end of this text region.
   * @return {Promise<boolean>} A promise that resolves to true if the text was successfully appended, or false if it failed.
   * @example
   * ```typescript
   * const fDocument = univerAPI.getActiveDocument();
   * await fDocument.appendText('Hello, world!');
   * ```
   */
  appendText(text) {
    const { body } = this.save();
    if (!body) {
      throw new Error("The document body is empty");
    }
    const lastPosition = body.dataStream.length - 2;
    return this.insertText(text, {
      startOffset: lastPosition,
      endOffset: lastPosition,
      segmentId: ""
    });
  }
  /**
   * Inserts text at the provided document range. Defaults to appending before the final section break.
   * @param {string} text - The text to insert.
   * @param {IDocumentInsertTextFacadeOptions} options - Optional target range, segment id, and cursor offset.
   * @returns {Promise<boolean>} A promise that resolves to true if the text was successfully inserted, or false if it failed.
   * @example
   *
   * // Insert text at a specific range in the document body
   * ```typescript
   * const fDocument = univerAPI.getActiveDocument();
   * await fDocument.insertText('Hello, world!', {
   *   startOffset: 5,
   *   endOffset: 5,
   *   segmentId: '',
   *   cursorOffset: 13,
   * });
   * ```
   *
   * // Insert text at the beginning of a header or footer segment
   * ```typescript
   * const fDocument = univerAPI.getActiveDocument();
   * const snapshot = fDocument.save();
   * const { headers, footers } = snapshot;
   *
   * if (headers) {
   *   for (const headerId in headers) {
   *     if (headerId === 'target-header-id') {
   *       await fDocument.insertText('Hello, header!', {
   *         startOffset: 0,
   *         endOffset: 0,
   *         segmentId: headerId,
   *       });
   *     }
   *   }
   * }
   *
   * if (footers) {
   *   for (const footerId in footers) {
   *     if (footerId === 'target-footer-id') {
   *       await fDocument.insertText('Hello, footer!', {
   *         startOffset: 0,
   *         endOffset: 0,
   *         segmentId: footerId,
   *       });
   *     }
   *   }
   * }
   * ```
   */
  insertText(text, options = {}) {
    var _a, _b, _c;
    const unitId = this.id;
    const { body } = this.save();
    if (!body) {
      throw new Error("The document body is empty");
    }
    const startOffset = (_a = options.startOffset) != null ? _a : Math.max(0, body.dataStream.length - 2);
    const endOffset = (_b = options.endOffset) != null ? _b : startOffset;
    const segmentId = (_c = options.segmentId) != null ? _c : "";
    const activeRange = {
      startOffset,
      endOffset,
      collapsed: startOffset === endOffset,
      segmentId
    };
    return this._commandService.executeCommand(InsertTextCommand.id, {
      unitId,
      body: {
        dataStream: text
      },
      range: activeRange,
      segmentId,
      ...options.cursorOffset == null ? {} : { cursorOffset: options.cursorOffset }
    });
  }
  /**
   * Inserts one or more plain-text paragraphs at the provided document range.
   * @param {string} text - The paragraph text to insert. Newlines are normalized to document paragraph separators.
   * @param {IDocumentInsertTextFacadeOptions} options - Optional target range, segment id, and cursor offset.
   * @returns {Promise<boolean>} A promise that resolves to true if the paragraphs were successfully inserted, or false if it failed.
   * @example
   * ```typescript
   * const fDocument = univerAPI.getActiveDocument();
   * await fDocument.insertParagraph('Hello, world! This is a new paragraph.', {
   *   startOffset: 5,
   *   endOffset: 5,
   * });
   * ```
   */
  insertParagraph(text = "", options = {}) {
    var _a;
    const dataStream = `${text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").join("\r\n")}\r
`;
    return this.insertText(dataStream, {
      ...options,
      cursorOffset: (_a = options.cursorOffset) != null ? _a : dataStream.length
    });
  }
};
FDocument = __decorateClass([
  __decorateParam(1, Inject(Injector)),
  __decorateParam(2, IUniverInstanceService),
  __decorateParam(3, Inject(IResourceLoaderService)),
  __decorateParam(4, ICommandService)
], FDocument);

// ../packages/docs/src/facade/f-univer.ts
var FUniverDocsUIMixin = class extends FUniver {
  createDocument(data) {
    const instanceService = this._injector.get(IUniverInstanceService);
    const document = instanceService.createUnit(1 /* UNIVER_DOC */, data);
    return this._injector.createInstance(FDocument, document);
  }
  getActiveDocument() {
    const document = this._univerInstanceService.getCurrentUnitOfType(1 /* UNIVER_DOC */);
    if (!document) {
      return null;
    }
    return this._injector.createInstance(FDocument, document);
  }
  getDocument(id) {
    const document = this._univerInstanceService.getUnit(id, 1 /* UNIVER_DOC */);
    if (!document) {
      return null;
    }
    return this._injector.createInstance(FDocument, document);
  }
};
FUniver.extend(FUniverDocsUIMixin);

// ../packages/docs-ui/src/facade/f-document.ts
var FDocumentUIMixin = class extends FDocument {
  /**
   * Sets the selection to a specified text range in the document.
   * @param startOffset - The starting offset of the selection in the document.
   * @param endOffset - The ending offset of the selection in the document.
   * @example
   * ```typescript
   * const fDocument = univerAPI.getActiveDocument();
   * fDocument.setSelection(10, 20);
   * ```
   */
  setSelection(startOffset, endOffset) {
    var _a;
    const renderManagerService = this._injector.get(IRenderManagerService);
    const docSelectionRenderService = (_a = renderManagerService.getRenderUnitById(this.getId())) == null ? void 0 : _a.with(DocSelectionRenderService);
    docSelectionRenderService == null ? void 0 : docSelectionRenderService.removeAllRanges();
    docSelectionRenderService == null ? void 0 : docSelectionRenderService.addDocRanges(
      [
        {
          startOffset,
          endOffset,
          rangeType: "TEXT" /* TEXT */
        }
      ],
      true
    );
  }
};
FDocument.extend(FDocumentUIMixin);
