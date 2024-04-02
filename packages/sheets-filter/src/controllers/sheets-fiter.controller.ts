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

import type { ICommandInfo, IMutationInfo, IObjectArrayPrimitiveType, Nullable } from '@univerjs/core';
import { Disposable, DisposableCollection, ICommandService, IUniverInstanceService, LifecycleStages, moveMatrixArray, OnLifecycle } from '@univerjs/core';
import type { EffectRefRangeParams, IAddWorksheetMergeMutationParams, IInsertColCommandParams, IInsertRowCommandParams, IMoveColsCommandParams, IMoveRowsCommandParams, IRemoveColMutationParams, IRemoveRowsMutationParams, ISetWorksheetActivateCommandParams, ISheetCommandSharedParams } from '@univerjs/sheets';
import { EffectRefRangId, InsertColCommand, InsertColMutation, InsertRowCommand, InsertRowMutation, INTERCEPTOR_POINT, RefRangeService, RemoveColCommand, RemoveColMutation, RemoveRowCommand, RemoveRowMutation, SetWorksheetActivateCommand, SheetInterceptorService } from '@univerjs/sheets';
import { Inject } from '@wendellhu/redi';

import { SheetsFilterService } from '../services/sheet-filter.service';
import type { IRemoveSheetsFilterMutationParams, ISetSheetsFilterCriteriaMutationParams, ISetSheetsFilterRangeMutationParams } from '../commands/sheets-filter.mutation';
import { ReCalcSheetsFilterMutation, RemoveSheetsFilterMutation, SetSheetsFilterCriteriaMutation, SetSheetsFilterRangeMutation } from '../commands/sheets-filter.mutation';
import type { FilterColumn } from '../models/filter-model';
import { mergeSetFilterCriteria } from '../util';

const mutationIdByRowCol = [InsertColMutation.id, InsertRowMutation.id, RemoveColMutation.id, RemoveRowMutation.id];

@OnLifecycle(LifecycleStages.Ready, SheetsFilterController)
export class SheetsFilterController extends Disposable {
    constructor(
        @ICommandService private readonly _commandService: ICommandService,
        @Inject(SheetInterceptorService) private readonly _sheetInterceptorService: SheetInterceptorService,
        @Inject(SheetsFilterService) private readonly _sheetsFilterService: SheetsFilterService,
        @IUniverInstanceService private readonly _univerInstanceService: IUniverInstanceService,
        @Inject(RefRangeService) private readonly _refRangeService: RefRangeService
    ) {
        super();

        this._initCommands();
        this._initRowFilteredInterceptor();
        this._initInterceptors();
        this._commandExecutedListener();
    }

    private _initCommands(): void {
        [
            SetSheetsFilterCriteriaMutation,
            SetSheetsFilterRangeMutation,
            ReCalcSheetsFilterMutation,
            RemoveSheetsFilterMutation,
        ].forEach((command) => this.disposeWithMe(this._commandService.registerCommand(command)));
    }

    private _initInterceptors(): void {
        // @yuhongz maybe we should add tests for here
        const disposableCollection = new DisposableCollection();
        const registerRefRange = (unitId: string, subUnitId: string) => {
            const workbook = this._univerInstanceService.getUniverSheetInstance(unitId);
            if (!workbook) {
                return;
            }
            const workSheet = workbook?.getSheetBySheetId(subUnitId);
            if (!workSheet) {
                return;
            }

            disposableCollection.dispose();
            const range = this._sheetsFilterService.getFilterModel(unitId, subUnitId)?.getRange();
            const handler = (config: EffectRefRangeParams) => {
                switch (config.id) {
                    case InsertRowCommand.id: {
                        const params = config.params as IInsertRowCommandParams;
                        const _unitId = params.unitId || unitId;
                        const _subUnitId = params.subUnitId || subUnitId;
                        return this._handleInsertRowCommand(params, _unitId, _subUnitId);
                    }
                    case InsertColCommand.id: {
                        const params = config.params as IInsertColCommandParams;
                        const _unitId = params.unitId || unitId;
                        const _subUnitId = params.subUnitId || subUnitId;
                        return this._handleInsertColCommand(params, _unitId, _subUnitId);
                    }
                    case RemoveColCommand.id: {
                        const params = config.params as IRemoveColMutationParams;
                        return this._handleRemoveColCommand(params, unitId, subUnitId);
                    }
                    case RemoveRowCommand.id: {
                        const params = config.params as IRemoveRowsMutationParams;
                        return this._handleRemoveRowCommand(params, unitId, subUnitId);
                    }
                    case EffectRefRangId.MoveColsCommandId: {
                        const params = config.params as IMoveColsCommandParams;
                        return this._handleMoveColsCommand(params, unitId, subUnitId);
                    }
                    case EffectRefRangId.MoveRowsCommandId: {
                        const params = config.params as IMoveRowsCommandParams;
                        return this._handleMoveRowsCommand(params, unitId, subUnitId);
                    }
                }
                return { redos: [], undos: [] };
            };

            if (range) {
                disposableCollection.add(this._refRangeService.registerRefRange(range, handler, unitId, subUnitId));
            }
        };
        this.disposeWithMe(
            this._commandService.onCommandExecuted((commandInfo) => {
                if (commandInfo.id === SetWorksheetActivateCommand.id) {
                    const params = commandInfo.params as ISetWorksheetActivateCommandParams;
                    const sheetId = params.subUnitId;
                    const unitId = params.unitId;
                    if (!sheetId || !unitId) {
                        return;
                    }
                    registerRefRange(unitId, sheetId);
                }
                if (commandInfo.id === SetSheetsFilterRangeMutation.id) {
                    const params = commandInfo.params as IAddWorksheetMergeMutationParams;
                    const sheetId = params.subUnitId;
                    const unitId = params.unitId;
                    if (!sheetId || !unitId) {
                        return;
                    }
                    registerRefRange(params.unitId, params.subUnitId);
                }
            })
        );

        const workbook = this._univerInstanceService.getCurrentUniverSheetInstance();
        const sheet = workbook.getActiveSheet();
        registerRefRange(workbook.getUnitId(), sheet.getSheetId());
    }

    private _handleInsertColCommand(config: IInsertColCommandParams, unitId: string, subUnitId: string) {
        const filterModel = this._sheetsFilterService.getFilterModel(unitId, subUnitId);
        const filterRange = filterModel?.getRange() ?? null;
        if (!filterModel || !filterRange) {
            return this._handleNull();
        }
        const { startColumn, endColumn } = filterRange;
        const { startColumn: insertStartColumn, endColumn: insertEndColumn } = config.range;
        const count = insertEndColumn - insertStartColumn + 1;

        if (insertStartColumn <= startColumn || insertEndColumn > endColumn) {
            return this._handleNull();
        }

        const redos: IMutationInfo[] = [];
        const undos: IMutationInfo[] = [];

        const anchor = insertStartColumn - startColumn;
        const setFilterRangeMutationParams: ISetSheetsFilterRangeMutationParams = {
            unitId,
            subUnitId,
            range: {
                ...filterRange,
                endColumn: endColumn + count,
            },
        };

        const undoSetFilterRangeMutationParams: ISetSheetsFilterRangeMutationParams = {
            unitId,
            subUnitId,
            range: filterRange,
        };

        redos.push({ id: SetSheetsFilterRangeMutation.id, params: setFilterRangeMutationParams });
        undos.push({ id: SetSheetsFilterRangeMutation.id, params: undoSetFilterRangeMutationParams });

        const filterColumn = filterModel.getAllFilterColumns();
        const effected = filterColumn.filter((column) => column[0] >= anchor);
        if (effected.length === 0) {
            return this._handleNull();
        }

        const { undos: moveUndos, redos: moveRedos } = this.moveCriterias(unitId, subUnitId, effected, count);
        redos.push(...moveRedos);
        undos.push(...moveUndos);

        return { redos: mergeSetFilterCriteria(redos), undos: mergeSetFilterCriteria(undos) };
    }

    private _handleInsertRowCommand(config: IInsertRowCommandParams, unitId: string, subUnitId: string) {
        const filterModel = this._sheetsFilterService.getFilterModel(unitId, subUnitId);
        const filterRange = filterModel?.getRange() ?? null;
        if (!filterModel || !filterRange) {
            return this._handleNull();
        }
        const { startRow, endRow } = filterRange;
        const { startRow: insertStartRow, endRow: insertEndRow } = config.range;
        const rowCount = insertEndRow - insertStartRow + 1;
        if (insertStartRow <= startRow || insertEndRow > endRow) {
            return this._handleNull();
        }
        const redos: IMutationInfo[] = [];
        const undos: IMutationInfo[] = [];
        const setFilterRangeParams: ISetSheetsFilterRangeMutationParams = {
            unitId,
            subUnitId,
            range: {
                ...filterRange,
                endRow: endRow + rowCount,
            },
        };
        const undoSetFilterRangeMutationParams: ISetSheetsFilterRangeMutationParams = {
            unitId,
            subUnitId,
            range: filterRange,
        };

        redos.push({ id: SetSheetsFilterRangeMutation.id, params: setFilterRangeParams });
        undos.push({ id: SetSheetsFilterRangeMutation.id, params: undoSetFilterRangeMutationParams });
        return {
            redos: mergeSetFilterCriteria(redos), undos: mergeSetFilterCriteria(undos),
        };
    }

    private _handleRemoveColCommand(config: IRemoveColMutationParams, unitId: string, subUnitId: string) {
        const filterModel = this._sheetsFilterService.getFilterModel(unitId, subUnitId);
        const filterRange = filterModel?.getRange() ?? null;
        if (!filterModel || !filterRange) {
            return this._handleNull();
        }
        const { startColumn, endColumn } = filterRange;
        const { startColumn: removeStartColumn, endColumn: removeEndColumn } = config.range;

        if (removeEndColumn < startColumn || removeStartColumn > endColumn) {
            return this._handleNull();
        }

        const redos: IMutationInfo[] = [];
        const undos: IMutationInfo[] = [];

        const count = Math.min(removeEndColumn, endColumn) - Math.max(removeStartColumn, startColumn) + 1;

        const filterColumn = filterModel.getAllFilterColumns();
        filterColumn.forEach((column) => {
            const [offset, filter] = column;
            if (offset + startColumn <= removeEndColumn && offset + startColumn >= removeStartColumn) {
                redos.push({ id: SetSheetsFilterCriteriaMutation.id, params: { unitId, subUnitId, col: offset, criteria: null } });
                undos.push({ id: SetSheetsFilterCriteriaMutation.id, params: { unitId, subUnitId, col: offset, criteria: filter.serialize() } });
            }
        });

        const shifted = filterColumn.filter((column) => {
            const [offset, _] = column;
            return offset + startColumn > removeEndColumn;
        });
        if (shifted.length > 0) {
            const { undos: moveUndos, redos: moveRedos } = this.moveCriterias(unitId, subUnitId, shifted, -count);
            redos.push(...moveRedos);
            undos.push(...moveUndos);
        }

        if (count === endColumn - startColumn + 1) {
            const removeFilterRangeMutationParams: IRemoveSheetsFilterMutationParams = {
                unitId,
                subUnitId,
            };
            redos.push({ id: RemoveSheetsFilterMutation.id, params: removeFilterRangeMutationParams });
        } else {
            if (startColumn <= removeStartColumn) {
                const setFilterRangeMutationParams: ISetSheetsFilterRangeMutationParams = {
                    unitId,
                    subUnitId,
                    range: {
                        ...filterRange,
                        endColumn: removeEndColumn - count,
                    },
                };
                redos.push({ id: SetSheetsFilterRangeMutation.id, params: setFilterRangeMutationParams });
            } else {
                const setFilterRangeMutationParams: ISetSheetsFilterRangeMutationParams = {
                    unitId,
                    subUnitId,
                    range: {
                        ...filterRange,
                        startColumn: removeStartColumn,
                        endColumn: endColumn - (removeEndColumn - removeStartColumn + 1),
                    },
                };
                redos.push({ id: SetSheetsFilterRangeMutation.id, params: setFilterRangeMutationParams });
            }
        }

        undos.push({ id: SetSheetsFilterRangeMutation.id, params: { range: filterRange, unitId, subUnitId } });
        return {
            undos: mergeSetFilterCriteria(undos),
            redos: mergeSetFilterCriteria(redos),
        };
    }

    private _handleRemoveRowCommand(config: IRemoveRowsMutationParams, unitId: string, subUnitId: string) {
        const filterModel = this._sheetsFilterService.getFilterModel(unitId, subUnitId);
        const filterRange = filterModel?.getRange() ?? null;
        if (!filterModel || !filterRange) {
            return this._handleNull();
        }
        const { startRow, endRow } = filterRange;
        const { startRow: removeStartRow, endRow: removeEndRow } = config.range;
        if (removeEndRow < startRow || removeStartRow > endRow) {
            return this._handleNull();
        }
        const redos: IMutationInfo[] = [];
        const undos: IMutationInfo[] = [];
        const filterColumn = filterModel.getAllFilterColumns();

        const count = Math.min(removeEndRow, endRow) - Math.max(removeStartRow, startRow) + 1;
        if (count === endRow - startRow + 1) {
            const removeFilterRangeMutationParams: IRemoveSheetsFilterMutationParams = {
                unitId,
                subUnitId,
            };
            redos.push({ id: RemoveSheetsFilterMutation.id, params: removeFilterRangeMutationParams });
            filterColumn.forEach((column) => {
                const [offset, filter] = column;
                const setCriteriaMutationParams: ISetSheetsFilterCriteriaMutationParams = {
                    unitId,
                    subUnitId,
                    col: offset,
                    criteria: filter.serialize(),
                };
                undos.push({ id: SetSheetsFilterCriteriaMutation.id, params: setCriteriaMutationParams });
            });
        } else {
            const afterStartRow = Math.min(startRow, removeStartRow);
            const afterEndRow = afterStartRow + (endRow - startRow) - count;
            const setFilterRangeMutationParams: ISetSheetsFilterRangeMutationParams = {
                unitId,
                subUnitId,
                range: {
                    ...filterRange,
                    startRow: afterStartRow,
                    endRow: afterEndRow,
                },
            };
            redos.push({ id: SetSheetsFilterRangeMutation.id, params: setFilterRangeMutationParams });
        }
        undos.push({ id: SetSheetsFilterRangeMutation.id, params: { range: filterRange, unitId, subUnitId } });
        return {
            undos: mergeSetFilterCriteria(undos),
            redos: mergeSetFilterCriteria(redos),
        };
    }

    private _handleMoveColsCommand(config: IMoveColsCommandParams, unitId: string, subUnitId: string) {
        const filterModel = this._sheetsFilterService.getFilterModel(unitId, subUnitId);
        const filterRange = filterModel?.getRange() ?? null;
        if (!filterModel || !filterRange) {
            return this._handleNull();
        }
        const { startColumn, endColumn } = filterRange;
        const { fromRange, toRange } = config;
        if ((fromRange.endColumn < startColumn && toRange.startColumn <= startColumn) || (
            fromRange.startColumn > endColumn && toRange.endColumn > endColumn
        )) {
            return this._handleNull();
        }
        const redos: IMutationInfo[] = [];
        const undos: IMutationInfo[] = [];
        const filterCol: IObjectArrayPrimitiveType<{ offset: number; filter: Nullable<FilterColumn> }> = {};
        for (let col = startColumn; col <= endColumn; col++) {
            filterCol[col] = {
                offset: col - startColumn,
                filter: filterModel.getFilterColumn(col - startColumn),
            };
        }
        moveMatrixArray(fromRange.startColumn, fromRange.endColumn - fromRange.startColumn + 1, toRange.startColumn, filterCol);

        const numberCols = Object.keys(filterCol).map((col) => Number(col));

        const newEnd = Math.max(...numberCols);
        const newStart = Math.min(...numberCols);

        numberCols.forEach((col) => {
            const { offset: oldOffset, filter } = filterCol[col];
            const newOffset = col - newStart;
            if (filter) {
                const setCriteriaMutationParams: ISetSheetsFilterCriteriaMutationParams = {
                    unitId,
                    subUnitId,
                    col: newOffset,
                    criteria: filter.serialize(),
                };
                redos.push({ id: SetSheetsFilterCriteriaMutation.id, params: setCriteriaMutationParams });
                undos.push({ id: RemoveSheetsFilterMutation.id, params: { unitId, subUnitId, col: newOffset, criteria: filterModel.getFilterColumn(newOffset)?.serialize() } });

                if (!filterCol[oldOffset + newStart]?.filter) {
                    const setCriteriaMutationParams: ISetSheetsFilterCriteriaMutationParams = {
                        unitId,
                        subUnitId,
                        col: oldOffset,
                        criteria: null,
                    };
                    redos.push({ id: SetSheetsFilterCriteriaMutation.id, params: setCriteriaMutationParams });
                    undos.push({ id: SetSheetsFilterCriteriaMutation.id, params: { unitId, subUnitId, col: oldOffset, criteria: filter.serialize() } });
                }
            }
        });

        if (startColumn !== newStart || endColumn !== newEnd) {
            const setFilterRangeMutationParams: ISetSheetsFilterRangeMutationParams = {
                unitId,
                subUnitId,
                range: {
                    ...filterRange,
                    startColumn: newStart,
                    endColumn: newEnd,
                },
            };
            redos.push({ id: SetSheetsFilterRangeMutation.id, params: setFilterRangeMutationParams });
            undos.push({ id: SetSheetsFilterRangeMutation.id, params: { range: filterRange, unitId, subUnitId } });
        }

        return {
            undos,
            redos,
        };
    }

    private _handleMoveRowsCommand(config: IMoveRowsCommandParams, unitId: string, subUnitId: string) {
        const filterModel = this._sheetsFilterService.getFilterModel(unitId, subUnitId);
        const filterRange = filterModel?.getRange() ?? null;
        if (!filterModel || !filterRange) {
            return this._handleNull();
        }
        const { startRow, endRow } = filterRange;
        const { fromRange, toRange } = config;
        if ((fromRange.endRow < startRow && toRange.startRow <= startRow) || (
            fromRange.startRow > endRow && toRange.endRow > endRow
        )) {
            return this._handleNull();
        }
        const redos: IMutationInfo[] = [];
        const undos: IMutationInfo[] = [];
        const filterRow: IObjectArrayPrimitiveType<{ offset: number }> = {};
        for (let row = startRow; row <= endRow; row++) {
            filterRow[row] = {
                offset: row - startRow,
            };
        }

        moveMatrixArray(fromRange.startRow, fromRange.endRow - fromRange.startRow + 1, toRange.startRow, filterRow);
        const numberRows = Object.keys(filterRow).map((row) => Number(row));

        const newEnd = Math.max(...numberRows);
        const newStart = Math.min(...numberRows);
        if (startRow !== newStart || endRow !== newEnd) {
            const setFilterRangeMutationParams: ISetSheetsFilterRangeMutationParams = {
                unitId,
                subUnitId,
                range: {
                    ...filterRange,
                    startRow: newStart,
                    endRow: newEnd,
                },
            };
            redos.push({ id: SetSheetsFilterRangeMutation.id, params: setFilterRangeMutationParams });
            undos.push({ id: SetSheetsFilterRangeMutation.id, params: { range: filterRange, unitId, subUnitId } });
        }
        return {
            redos,
            undos,
        };
    }

    private _handleNull() {
        return { redos: [], undos: [] };
    }

    private _initRowFilteredInterceptor(): void {
        // TODO@wzhudev: we should update filtered rows here?
        this.disposeWithMe(this._sheetInterceptorService.intercept(INTERCEPTOR_POINT.ROW_FILTERED, {
            handler: (filtered, rowLocation) => {
                if (filtered) return true;

                // NOTE@wzhudev: maybe we should use some cache or add some cache on the skeleton to improve performance
                const f = this._sheetsFilterService
                    .getFilterModel(rowLocation.unitId, rowLocation.subUnitId)
                    ?.isRowFiltered(rowLocation.row);
                return f ?? false;
            },
        }));
    }

    private moveCriterias(unitId: string, subUnitId: string, target: [number, FilterColumn][], step: number) {
        const defaultSetCriteriaMutationParams: ISetSheetsFilterCriteriaMutationParams = {
            unitId,
            subUnitId,
            criteria: null,
            col: -1,
        };
        const undos: IMutationInfo[] = [];
        const redos: IMutationInfo[] = [];

        target.forEach((column) => {
            const [offset, filter] = column;
            redos.push({
                id: SetSheetsFilterCriteriaMutation.id,
                params: {
                    ...defaultSetCriteriaMutationParams,
                    col: offset,
                },
            });
            undos.push({
                id: SetSheetsFilterCriteriaMutation.id,
                params: {
                    ...defaultSetCriteriaMutationParams,
                    col: offset,
                    criteria: filter.serialize(),
                },
            });
        });

        target.forEach((column) => {
            const [offset, filter] = column;
            redos.push({
                id: SetSheetsFilterCriteriaMutation.id,
                params: {
                    ...defaultSetCriteriaMutationParams,
                    col: offset + step,
                    criteria: filter.serialize(),
                },
            });
            undos.push({
                id: SetSheetsFilterCriteriaMutation.id,
                params: {
                    ...defaultSetCriteriaMutationParams,
                    col: offset + step,
                    criteria: null,
                },
            });
        });

        return {
            redos,
            undos,
        };
    }

    private _commandExecutedListener() {
        this.disposeWithMe(this._commandService.onCommandExecuted((command: ICommandInfo) => {
            const { unitId, subUnitId } = command as unknown as ISheetCommandSharedParams;

            const filterModel = this._sheetsFilterService.getFilterModel(unitId, subUnitId);
            if (!filterModel) return;

            // InsertRowsOrCols / RemoveRowsOrCols Mutations
            if (mutationIdByRowCol.includes(command.id)) {
                const params = command.params as IInsertRowCommandParams;
                if (!params) return;
                const { range } = params;

                const isRowOperation = command.id.includes('row');
                const isAddOperation = command.id.includes('insert');

                const operationStart = isRowOperation ? range.startRow : range.startColumn;
                const operationEnd = isRowOperation ? range.endRow : range.endColumn;
                const operationCount = operationEnd - operationStart + 1;

                let { startRow, endRow, startColumn, endColumn, rangeType } = filterModel.getRange();

                if (isAddOperation) {
                    if (isRowOperation) {
                        if (operationStart <= startRow) {
                            startRow += operationCount;
                            endRow += operationCount;
                        }
                    } else {
                        if (operationStart <= startColumn) {
                            startColumn += operationCount;
                            endColumn += operationCount;
                        }
                    }
                } else {
                    if (isRowOperation) {
                        if (operationEnd < startRow) {
                            startRow -= operationCount;
                            endRow -= operationCount;
                        }
                    } else {
                        if (operationEnd < startColumn) {
                            startColumn -= operationCount;
                            endColumn -= operationCount;
                        }
                    }
                }
                filterModel.setRange({ startRow, endRow, startColumn, endColumn, rangeType });
            }
        }));
    }
}
