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

import { describe, expect, it } from 'vitest';

import type { IFormulaDataItem } from '@univerjs/engine-formula';
import { formulaDataItemToCellData } from '../ref-range-formula';

describe('Ref range formula test', () => {
    describe('Util function', () => {
        it('Function formulaDataItemToCellData', () => {
            let formulaDataItem: IFormulaDataItem = {
                f: '=SUM(1)',
            };

            let result = formulaDataItemToCellData(formulaDataItem);

            expect(result).toStrictEqual({
                f: '=SUM(1)',
            });

            formulaDataItem = {
                f: '',
                si: 'id1',
            };

            result = formulaDataItemToCellData(formulaDataItem);

            expect(result).toStrictEqual({
                si: 'id1',
            });

            formulaDataItem = {
                f: '=SUM(1)',
                si: 'id1',
            };

            result = formulaDataItemToCellData(formulaDataItem);

            expect(result).toStrictEqual({
                f: '=SUM(1)',
                si: 'id1',
            });

            formulaDataItem = {
                f: '=SUM(1)',
                si: 'id1',
                x: 0,
                y: 0,
            };

            result = formulaDataItemToCellData(formulaDataItem);

            expect(result).toStrictEqual({
                f: '=SUM(1)',
                si: 'id1',
            });

            formulaDataItem = {
                f: '=SUM(1)',
                si: 'id1',
                x: 0,
                y: 1,
            };

            result = formulaDataItemToCellData(formulaDataItem);

            expect(result).toStrictEqual({
                si: 'id1',
            });
        });
    });
});
