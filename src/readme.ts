// Copyright (c) 2022 Microsoft Corporation
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT
import * as commonmark from 'commonmark'
import { MarkDownEx, parse } from '@ts-common/commonmark-to-markdown'
import { getTagsToSettingsMapping, getCodeBlocksAndHeadings } from '@azure/openapi-markdown'
import * as fs from 'fs'
import { safeLoad } from './utils'

/**
 * walks a markdown tree until the callback provided returns true for a node
 */
export const walkToNode = (
  walker: commonmark.NodeWalker,
  cb: (node: commonmark.Node) => boolean,
): commonmark.Node | undefined => {
  let event = walker.next()

  while (event) {
    const curNode = event.node
    if (cb(curNode)) {
      return curNode
    }
    event = walker.next()
  }
  return undefined
}

export const sortByApiVersion = (versions: string[]): string[] => {
  // sort by api version. Format: YYYY-MM-DD
  const supportedRegex = [/(\d{4})-(\d{2})-(\d{2})/, /(\d{4})_(\d{2})_(\d{2})/]

  for (const regex of supportedRegex) {
    const filterVersion = versions.filter(v => regex.test(v))
    if (filterVersion.length > 0) {
      return filterVersion.sort((a, b) => {
        const aMatch = a.match(regex)!
        const bMatch = b.match(regex)!
        const aDate = new Date(+aMatch[1], +aMatch[2], +aMatch[3])
        const bDate = new Date(+bMatch[1], +bMatch[2], +bMatch[3])
        return aDate.getTime() - bDate.getTime()
      })
    }
  }
  return []
}

/**
 * @return return undefined indicates not found, otherwise return non-empty string.
 */
export const getDefaultTag = (markDown: commonmark.Node): string | undefined => {
  const startNode = markDown
  const codeBlockMap = getCodeBlocksAndHeadings(startNode)
  const latestHeader = 'Basic Information'
  const headerBlock = codeBlockMap[latestHeader]
  if (headerBlock && headerBlock.literal) {
    const latestDefinition = safeLoad(headerBlock.literal)
    if (latestDefinition && latestDefinition.tag) {
      return latestDefinition.tag
    }
  }
  for (const idx of Object.keys(codeBlockMap)) {
    const block = codeBlockMap[idx]
    if (!block || !block.info || !block.literal || !/^(yaml|json)$/.test(block.info.trim().toLowerCase())) {
      continue
    }
    const latestDefinition = safeLoad(block.literal)
    if (latestDefinition && latestDefinition.tag) {
      return latestDefinition.tag
    }
  }
  return undefined
}

export const getTagsToSwaggerFilesMapping = (readmeFilePath: string): Map<string, string[]> => {
  const ret = new Map<string, string[]>()

  const readmeContent = fs.readFileSync(readmeFilePath, 'utf8')
  const readme = parse(readmeContent)

  const mapping = getTagsToSettingsMapping(readme.markDown)

  for (const [tag, settings] of Object.entries(mapping)) {
    if (settings !== undefined) {
      const swaggerFiles = [...settings['input-file']]
      ret.set(tag, swaggerFiles)
    }
  }
  return ret
}

type ServiceReadmeTagInfo = {
  default: string
  stable: string
  preview: string
}

export const getLatestTag = (tags: string[], versionType: 'stable' | 'preview'): string => {
  let filteredTags = tags
  // tslint:disable-next-line: prefer-conditional-expression
  if (versionType === 'preview') {
    filteredTags = tags.filter(t => t.includes('preview'))
  } else {
    filteredTags = tags.filter(t => !t.includes('preview'))
  }
  const sorted = sortByApiVersion(filteredTags)
  return sorted[sorted.length - 1]
}
