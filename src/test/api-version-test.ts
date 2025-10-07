// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import * as assert from 'assert'
import { compareApiVersion } from '../api-version'

describe('api-version', () => {
  it.each([
    // date-based versions
    ['2025-01-01', '2025-01-01', 0],
    ['2025-01-01', '2025-01-02', -1],
    ['2025-01-03', '2025-01-02', 1],
    // non-date-based versions
    ['7.0', '7.0', 0],
    ['7.0', '7.1', -1],
    ['7.2', '7.1', 1],
    // mixed versions, date-based should always sort later
    ['7.0', '2025-01-01', -1],
    ['2025-01-01', '7.0', 1],
  ])('compares API version strings(%s, %s, %d)', (a: string, b: string, result: number) => {
    // Compare both ways, ensure results are inverted
    assert.equal(compareApiVersion(a, b), result)
    assert.equal(compareApiVersion(b, a), result * -1)
  })
})
