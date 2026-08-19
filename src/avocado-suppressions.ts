// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import * as path from 'path'
import type { FileChange, PullRequestProperties } from './dev-ops.js'
import { getSuppressionsForTools } from './suppressions.js'

const avocadoSuppressionTools = ['SwaggerAvocado', 'SwaggerAll'] as const

export const isAvocadoPathSuppressed = async (targetPath: string): Promise<boolean> => {
  const suppressions = await getSuppressionsForTools(avocadoSuppressionTools, targetPath)
  return suppressions.some((suppression) => !suppression.rules?.length && !suppression.subRules?.length)
}

const getSuppressedPaths = async (workingDir: string, fileChanges: readonly FileChange[]): Promise<readonly string[]> =>
  (
    await Promise.all(
      fileChanges.map(async (item) =>
        (await isAvocadoPathSuppressed(path.resolve(workingDir, item.path))) ? item.path : undefined,
      ),
    )
  ).filter((item): item is string => item !== undefined)

export const excludeSuppressedPaths = async (
  pr: PullRequestProperties,
  fileChanges: readonly FileChange[],
): Promise<readonly string[]> => {
  await pr.checkout(pr.sourceBranch)
  const suppressedPaths = new Set(
    await getSuppressedPaths(
      pr.workingDir,
      fileChanges.filter((item) => item.kind !== 'Deleted'),
    ),
  )

  await pr.checkout(pr.targetBranch)
  for (const suppressedPath of await getSuppressedPaths(
    pr.workingDir,
    fileChanges.filter((item) => item.kind === 'Deleted'),
  )) {
    suppressedPaths.add(suppressedPath)
  }

  return fileChanges.map((item) => item.path).filter((item) => !suppressedPaths.has(item))
}
