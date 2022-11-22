// Copyright (c) 2022 Microsoft Corporation
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

// This file is for docs team learn platform auto refresh.
import * as path from 'path'
import * as fs from 'fs'
import { parse } from '@ts-common/commonmark-to-markdown'
import { getSwaggerFileUnderDefaultTag } from './index'
import { getTagsToSwaggerFilesMapping, getLatestTag, getDefaultTag } from './readme'

export interface IService {
  readme_files?: string[]
  swagger_files?: ISwaggerFile[]
}

export interface ISwaggerFile {
  source: string
}

export type SwaggerFile = {
  source: string
  swagger_file: ISwaggerFile
}

export const getSwaggerFiles = (rootPath: string, service: IService): SwaggerFile[] => {
  const ret: SwaggerFile[] = []

  if (service.readme_files) {
    for (const readmeFile of service.readme_files) {
      const readmeFileName = path.basename(readmeFile)
      const readmePath = path.join(rootPath, readmeFile)
      const readmeContent = fs.readFileSync(readmePath, 'utf-8')
      const readme = parse(readmeContent)

      const inputFiles = getSwaggerFileUnderDefaultTag(readme)

      ret.push(
        ...inputFiles.map(source => ({
          source: readmeFile,
          swagger_file: { source: readmeFile.replace(readmeFileName, source) },
        })),
      )
    }
  }

  for (const sourceSwagger of service.swagger_files || []) {
    for (const readmeFile of service.readme_files || []) {
      // find the matched readme file
      const dir = path.dirname(readmeFile)
      if (sourceSwagger.source.startsWith(dir)) {
        ret.push(...expandSourceSwaggerFiles(rootPath, readmeFile, sourceSwagger.source))
      }
    }
  }
  return ret
}

export const expandSourceSwaggerFiles = (rootPath: string, readmePath: string, source: string): SwaggerFile[] => {
  const readmeFullPath = path.join(rootPath, readmePath)
  const mapping = getTagsToSwaggerFilesMapping(readmeFullPath)
  const readmeFileName = path.basename(readmePath)

  const predefinedVariables = ['[version]', '[stable_version]', '[preview_version]']
  const readme = parse(fs.readFileSync(readmeFullPath, 'utf-8'))
  console.log('readme', readme)

  const allTags = Array.from(mapping.keys())

  // non-variable
  if (predefinedVariables.every(v => !source.includes(v))) {
    return [{ source, swagger_file: { source } }]
  }

  for (const version of predefinedVariables) {
    if (source.includes(version)) {
      // default tag
      if (version === '[version]') {
        const tag = getDefaultTag(readme.markDown)!
        const inputFiles = (mapping.get(tag) || []).map(f => readmePath.replace(readmeFileName, f))
        return getMatchedSwaggerFiles(inputFiles, source, version)
      }

      // stable tag
      if (version === '[stable_version]') {
        const tag = getLatestTag(allTags, 'stable')
        const inputFiles = (mapping.get(tag) || []).map(f => readmePath.replace(readmeFileName, f))
        console.log('inputFiles', inputFiles)
        return getMatchedSwaggerFiles(inputFiles, source, version)
      }

      // preview tag
      if (version === '[preview_version]') {
        const tag = getLatestTag(allTags, 'preview')
        const inputFiles = (mapping.get(tag) || []).map(f => readmePath.replace(readmeFileName, f))
        return getMatchedSwaggerFiles(inputFiles, source, version)
      }
    }
  }

  return []
}

const getMatchedSwaggerFiles = (inputFiles: string[], source: string, version: string): SwaggerFile[] => {
  const regex = new RegExp(`${source.replace(version, '(.*)')}`)
  const filteredFiles = inputFiles.filter(f => regex.test(f))
  return filteredFiles.map(f => ({ source, swagger_file: { source: f } }))
}
