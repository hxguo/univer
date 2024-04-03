/**
 * Copyright 2023-present DreamNum Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { ICellData, IObjectMatrixPrimitiveType, IRange, Nullable } from '@univerjs/core';
import { cellToRange, Direction, isFormulaId, isFormulaString, ObjectMatrix, Tools } from '@univerjs/core';
import type { IFormulaData, IFormulaDataItem, IRangeChange } from '@univerjs/engine-formula';
import type { ISetRangeValuesMutationParams } from '@univerjs/sheets';
import { EffectRefRangId, handleDeleteRangeMoveLeft, handleDeleteRangeMoveUp, handleInsertCol, handleInsertRangeMoveDown, handleInsertRangeMoveRight, handleInsertRow, handleIRemoveCol, handleIRemoveRow, handleMoveCols, handleMoveRange, handleMoveRows, runRefRangeMutations, SetRangeValuesMutation } from '@univerjs/sheets';
import { checkFormulaDataNull } from './offset-formula-data';

export enum FormulaReferenceMoveType {
    MoveRange, // range
    MoveRows, // move rows
    MoveCols, // move columns
    InsertRow, // row
    InsertColumn, // column
    RemoveRow, // row
    RemoveColumn, // column
    DeleteMoveLeft, // range
    DeleteMoveUp, // range
    InsertMoveDown, // range
    InsertMoveRight, // range
    SetName,
    RemoveSheet,
}

export interface IFormulaReferenceMoveParam {
    type: FormulaReferenceMoveType;
    unitId: string;
    sheetId: string;
    range?: IRange;
    from?: IRange;
    to?: IRange;
    sheetName?: string;
}

export function getFormulaReferenceMoveUndoRedo(oldFormulaData: IFormulaData,
    newFormulaData: IFormulaData,
    formulaReferenceMoveParam: IFormulaReferenceMoveParam) {
    const { type, sheetId: subUnitId, unitId, range, from, to } = formulaReferenceMoveParam;

    if (type === FormulaReferenceMoveType.SetName) {
            // TODO
        return;
    } else if (type === FormulaReferenceMoveType.RemoveSheet) {
            // TODO
        return;
    }

    const { redoFormulaData, undoFormulaData } = refRangeFormula(oldFormulaData, newFormulaData, formulaReferenceMoveParam);

        // console.info('redoFormulaData==', redoFormulaData);
        // console.info('undoFormulaData==', undoFormulaData);

    const redoSetRangeValuesMutationParams: ISetRangeValuesMutationParams = {
        subUnitId,
        unitId,
        cellValue: redoFormulaData,
    };

    const redoMutation = {
        id: SetRangeValuesMutation.id,
        params: redoSetRangeValuesMutationParams,
    };

    const undoSetRangeValuesMutationParams: ISetRangeValuesMutationParams = {
        subUnitId,
        unitId,
        cellValue: undoFormulaData,
    };

    const undoMutation = {
        id: SetRangeValuesMutation.id,
        params: undoSetRangeValuesMutationParams,
    };

    return {
        undos: [undoMutation],
        redos: [redoMutation],
    };
}
/**
 * For different Command operations, it may be necessary to perform traversal in reverse or in forward order, so first determine the type of Command and then perform traversal.
 * @param oldFormulaData
 * @param newFormulaData
 * @param formulaReferenceMoveParam
 * @returns
 */
export function refRangeFormula(oldFormulaData: IFormulaData,
    newFormulaData: IFormulaData,
    formulaReferenceMoveParam: IFormulaReferenceMoveParam) {
    let redoFormulaData: IObjectMatrixPrimitiveType<Nullable<ICellData>> = {};
    let undoFormulaData: IObjectMatrixPrimitiveType<Nullable<ICellData>> = {};

    const { type, unitId, sheetId, range, from, to } = formulaReferenceMoveParam;

    if (checkFormulaDataNull(oldFormulaData, unitId, sheetId)) {
        return {
            redoFormulaData,
            undoFormulaData,
        };
    }

    const currentOldFormulaData = oldFormulaData[unitId]![sheetId];
    const currentNewFormulaData = newFormulaData[unitId]![sheetId];

    const oldFormulaMatrix = new ObjectMatrix(currentOldFormulaData);
    const newFormulaMatrix = new ObjectMatrix(currentNewFormulaData);

    // When undoing and redoing, the traversal order may be different. Record the range list of all single formula offsets, and then retrieve the traversal as needed.
    const rangeList: IRangeChange[] = [];
    let isReverse = false;

    oldFormulaMatrix.forValue((row, column, cell) => {
        const formulaString = cell?.f || '';
        const formulaId = cell?.si || '';

        const checkFormulaString = isFormulaString(formulaString);
        const checkFormulaId = isFormulaId(formulaId);

        // Offset is only needed when there is a formula
        if (!checkFormulaString && !checkFormulaId) {
            return;
        }

        const oldCell = cellToRange(row, column);
        let newCell = null;

        switch (type) {
            case FormulaReferenceMoveType.SetName:
                // TODO
                break;
            case FormulaReferenceMoveType.RemoveSheet:
                // TODO
                break;
            case FormulaReferenceMoveType.MoveRange:
                if (from == null || to == null) {
                    return;
                }
                newCell = handleRefMoveRange(from, to, oldCell);
                break;
            case FormulaReferenceMoveType.MoveRows:
                if (from == null || to == null) {
                    return;
                }
                newCell = handleRefMoveRows(from, to, oldCell);
                break;
            case FormulaReferenceMoveType.MoveCols:
                if (from == null || to == null) {
                    return;
                }
                newCell = handleRefMoveCols(from, to, oldCell);
                break;
            default:
                break;
        }

        if (Tools.isDefine(range)) {
            switch (type) {
                case FormulaReferenceMoveType.InsertRow:
                    newCell = handleRefInsertRow(range, oldCell);
                    isReverse = true;
                    break;
                case FormulaReferenceMoveType.InsertColumn:
                    newCell = handleRefInsertCol(range, oldCell);
                    isReverse = true;
                    break;
                case FormulaReferenceMoveType.RemoveRow:
                    newCell = handleRefRemoveRow(range, oldCell);
                    break;
                case FormulaReferenceMoveType.RemoveColumn:
                    newCell = handleRefMoveCol(range, oldCell);
                    break;
                case FormulaReferenceMoveType.DeleteMoveLeft:
                    newCell = handleRefDeleteMoveLeft(range, oldCell);
                    break;
                case FormulaReferenceMoveType.DeleteMoveUp:
                    newCell = handleRefDeleteMoveUp(range, oldCell);
                    break;
                case FormulaReferenceMoveType.InsertMoveDown:
                    newCell = handleRefInsertMoveDown(range, oldCell);
                    isReverse = true;
                    break;
                case FormulaReferenceMoveType.InsertMoveRight:
                    newCell = handleRefInsertMoveRight(range, oldCell);
                    isReverse = true;
                    break;
                default:
                    break;
            }
        }

        if (newCell == null) {
            return;
        }

        const { startRow: oldStartRow, startColumn: oldStartColumn } = oldCell;
        const { startRow: newStartRow, startColumn: newStartColumn } = newCell;

        if (oldStartRow === newStartRow && oldStartColumn === newStartColumn) {
            return;
        }

        if (isReverse) {
            rangeList.unshift({
                oldCell,
                newCell,
            });
        } else {
            rangeList.push({
                oldCell,
                newCell,
            });
        }
    });

    redoFormulaData = getRedoFormulaData(rangeList, oldFormulaMatrix, newFormulaMatrix);
    undoFormulaData = getUndoFormulaData(rangeList, oldFormulaMatrix, newFormulaMatrix);

    return {
        redoFormulaData,
        undoFormulaData,
    };
}

function handleRefMoveRange(from: IRange, to: IRange, oldCell: IRange) {
    const operators = handleMoveRange(
        {
            id: EffectRefRangId.MoveRangeCommandId,
            params: { toRange: to, fromRange: from },
        },
        oldCell
    );

    return runRefRangeMutations(operators, oldCell);
}

function handleRefMoveRows(from: IRange, to: IRange, oldCell: IRange) {
    const operators = handleMoveRows(
        {
            id: EffectRefRangId.MoveRowsCommandId,
            params: { toRange: to, fromRange: from },
        },
        oldCell
    );

    return runRefRangeMutations(operators, oldCell);
}

function handleRefMoveCols(from: IRange, to: IRange, oldCell: IRange) {
    const operators = handleMoveCols(
        {
            id: EffectRefRangId.MoveColsCommandId,
            params: { toRange: to, fromRange: from },
        },
        oldCell
    );

    return runRefRangeMutations(operators, oldCell);
}

function handleRefInsertRow(range: IRange, oldCell: IRange) {
    const operators = handleInsertRow(
        {
            id: EffectRefRangId.InsertRowCommandId,
            params: { range, unitId: '', subUnitId: '', direction: Direction.DOWN },
        },
        oldCell
    );

    return runRefRangeMutations(operators, oldCell);
}

function handleRefInsertCol(range: IRange, oldCell: IRange) {
    const operators = handleInsertCol(
        {
            id: EffectRefRangId.InsertColCommandId,
            params: { range, unitId: '', subUnitId: '', direction: Direction.RIGHT },
        },
        oldCell
    );

    return runRefRangeMutations(operators, oldCell);
}

function handleRefRemoveRow(range: IRange, oldCell: IRange) {
    const operators = handleIRemoveRow(
        {
            id: EffectRefRangId.RemoveRowCommandId,
            params: { range },
        },
        oldCell
    );

    return runRefRangeMutations(operators, oldCell);
}

function handleRefMoveCol(range: IRange, oldCell: IRange) {
    const operators = handleIRemoveCol(
        {
            id: EffectRefRangId.RemoveColCommandId,
            params: { range },
        },
        oldCell
    );

    return runRefRangeMutations(operators, oldCell);
}

function handleRefDeleteMoveLeft(range: IRange, oldCell: IRange) {
    const operators = handleDeleteRangeMoveLeft(
        {
            id: EffectRefRangId.DeleteRangeMoveLeftCommandId,
            params: { range },
        },
        oldCell
    );

    return runRefRangeMutations(operators, oldCell);
}

function handleRefDeleteMoveUp(range: IRange, oldCell: IRange) {
    const operators = handleDeleteRangeMoveUp(
        {
            id: EffectRefRangId.DeleteRangeMoveUpCommandId,
            params: { range },
        },
        oldCell
    );

    return runRefRangeMutations(operators, oldCell);
}

function handleRefInsertMoveDown(range: IRange, oldCell: IRange) {
    const operators = handleInsertRangeMoveDown(
        {
            id: EffectRefRangId.InsertRangeMoveDownCommandId,
            params: { range },
        },
        oldCell
    );

    return runRefRangeMutations(operators, oldCell);
}

function handleRefInsertMoveRight(range: IRange, oldCell: IRange) {
    const operators = handleInsertRangeMoveRight(
        {
            id: EffectRefRangId.InsertRangeMoveRightCommandId,
            params: { range },
        },
        oldCell
    );

    return runRefRangeMutations(operators, oldCell);
}

/**
 * Delete the old value at the old position on the match, and add the new value at the new position (the new value first checks whether the old position has offset content, if so, use the new offset content, if not, take the old value)
 * @param rangeList
 * @param oldFormulaData
 * @param newFormulaData
 */
function getRedoFormulaData(rangeList: IRangeChange[], oldFormulaMatrix: ObjectMatrix<IFormulaDataItem>, newFormulaMatrix: ObjectMatrix<IFormulaDataItem>) {
    const redoFormulaData = new ObjectMatrix<ICellData | null>({});

    rangeList.forEach((item) => {
        const { oldCell, newCell } = item;

        const { startRow: oldStartRow, startColumn: oldStartColumn } = oldCell;
        const { startRow: newStartRow, startColumn: newStartColumn } = newCell;

        const newFormula = newFormulaMatrix.getValue(oldStartRow, oldStartColumn) || oldFormulaMatrix.getValue(oldStartRow, oldStartColumn);
        const newValue = formulaDataItemToCellData(newFormula);

        redoFormulaData.setValue(newStartRow, newStartColumn, newValue);
        redoFormulaData.setValue(oldStartRow, oldStartColumn, null);
    });

    return redoFormulaData.clone();
}

/**
 * The old position on the match saves the old value, and the new position delete value（for formulaData）
 * @param rangeList
 * @param oldFormulaData
 * @param newFormulaData
 */
function getUndoFormulaData(rangeList: IRangeChange[], oldFormulaMatrix: ObjectMatrix<IFormulaDataItem>, newFormulaMatrix: ObjectMatrix<IFormulaDataItem>) {
    const undoFormulaData = new ObjectMatrix<ICellData | null>({});

    rangeList.forEach((item) => {
        const { oldCell, newCell } = item;

        const { startRow: oldStartRow, startColumn: oldStartColumn } = oldCell;
        const { startRow: newStartRow, startColumn: newStartColumn } = newCell;

        const oldFormula = oldFormulaMatrix.getValue(oldStartRow, oldStartColumn);
        const oldValue = formulaDataItemToCellData(oldFormula);

        undoFormulaData.setValue(oldStartRow, oldStartColumn, oldValue);
        undoFormulaData.setValue(newStartRow, newStartColumn, null);
    });

    return undoFormulaData.clone();
}

/**
 * Transfer the formulaDataItem to the cellData
 * ┌────────────────────────────────┬─────────────────┐
 * │        IFormulaDataItem        │     ICellData   │
 * ├──────────────────┬─────┬───┬───┼───────────┬─────┤
 * │ f                │ si  │ x │ y │ f         │ si  │
 * ├──────────────────┼─────┼───┼───┼───────────┼─────┤
 * │ =SUM(1)          │     │   │   │ =SUM(1)   │     │
 * │                  │ id1 │   │   │           │ id1 │
 * │ =SUM(1)          │ id1 │   │   │ =SUM(1)   │ id1 │
 * │ =SUM(1)          │ id1 │ 0 │ 0 │ =SUM(1)   │ id1 │
 * │ =SUM(1)          │ id1 │ 0 │ 1 │           │ id1 │
 * └──────────────────┴─────┴───┴───┴───────────┴─────┘
 */
export function formulaDataItemToCellData(formulaDataItem: IFormulaDataItem): ICellData {
    const { f, si, x = 0, y = 0 } = formulaDataItem;
    const checkFormulaString = isFormulaString(f);
    const checkFormulaId = isFormulaId(si);

    const cellData: ICellData = {};

    if (checkFormulaId) {
        cellData.si = si;
    }

    if (checkFormulaString && x === 0 && y === 0) {
        cellData.f = f;
    }

    return cellData;
}

// export function handleSetNameFormula(oldFormulaData: IFormulaData,
//     newFormulaData: IFormulaData {

//     }
