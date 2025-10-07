// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

// apiVersion may be date-based ("2025-07-01") or non-date-based ("7.0", "v7.0", etc).  All recent versions should be
// date-based, so sort all date-based versions later than all non-date-based versions.
export const compareApiVersion = (a: string, b: string): number => {
  const dateA = containsDate(a)
  const dateB = containsDate(b)
  if (dateA && !dateB) {
    return 1
  } else if (!dateA && dateB) {
    return -1
  } else {
    // Both "a" and "b" are either date-based or non-date-based, so perform an invariant string comparison
    return invariantCompare(a, b)
  }
}

// Returns true if a string contains a substring that looks like a date "YYYY-MM-DD"
const containsDate = (s: string): boolean => {
  const dateRegex = /\d{4}-\d{2}-\d{2}/
  return dateRegex.test(s)
}

const invariantCompare = (a: string, b: string): number => {
  // JS doesn't provide a built-in invariantCompare(), and recommends this
  return a.localeCompare(b, /* locales */ 'und', { sensitivity: 'variant' })
}
