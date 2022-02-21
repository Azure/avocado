import { JsonParseError } from './errors'
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import * as jsonParser from '@ts-common/json-parser'
import * as format from '@azure/swagger-validation-common'

type ErrorMessage =
  | 'The example JSON file is not referenced from the swagger file.'
  | 'The swagger JSON file is not referenced from the readme file.'
  | 'The `readme.md` is not an AutoRest markdown file.'
  | 'The JSON file is not found but it is referenced from the readme file.'
  | 'The JSON file has a circular reference.'
  | 'The file is not a valid JSON file.'
  | 'Can not find readme.md in the folder. If no readme.md file, it will block SDK generation.'
  | 'The API version of the swagger is inconsistent with its file path.'
  | 'The default tag contains multiple API versions swaggers.'
  // tslint:disable-next-line: max-line-length
  | 'The management plane swagger JSON file does not match its folder path. Make sure management plane swagger located in resource-manager folder'
  // tslint:disable-next-line: max-line-length
  | 'The default tag does not contain all APIs in this RP. Please make sure the missing API swaggers are in the default tag.'
  // tslint:disable-next-line: max-line-length
  | 'The default tag does not contains the latest API version. Please make sure the latest api version swaggers are in the default tag.'

export interface IErrorBase {
  readonly level: 'Warning' | 'Error' | 'Info'
  readonly path: string
}

export type JsonParseError = {
  readonly code: 'JSON_PARSE'
  readonly message: ErrorMessage
  readonly error: jsonParser.ParseError
} & IErrorBase

export type NotAutoRestMarkDown = {
  readonly code: 'NOT_AUTOREST_MARKDOWN'
  readonly message: ErrorMessage
  readonly readMeUrl: string
  readonly helpUrl: string
} & IErrorBase

export type MultipleApiVersion = {
  readonly code: 'MULTIPLE_API_VERSION'
  readonly message: ErrorMessage
  readonly readMeUrl: string
  readonly tag: string | undefined
} & IErrorBase

export type MissingLatestApiInDefaultTag = {
  readonly code: 'MISSING_APIS_IN_DEFAULT_TAG' | 'NOT_LATEST_API_VERSION_IN_DEFAULT_TAG'
  readonly message: ErrorMessage
  readonly readMeUrl: string
  readonly tag: string
  readonly jsonUrl: string
} & IErrorBase

export type FileError = {
  readonly code:
    | 'NO_JSON_FILE_FOUND'
    | 'UNREFERENCED_JSON_FILE'
    | 'CIRCULAR_REFERENCE'
    | 'INCONSISTENT_API_VERSION'
    | 'INVALID_FILE_LOCATION'
  readonly message: ErrorMessage
  readonly readMeUrl: string
  readonly jsonUrl: string
} & IErrorBase

export type MissingReadmeError = {
  readonly code: 'MISSING_README'
  readonly message: ErrorMessage
  readonly folderUrl: string
} & IErrorBase

export const getPathInfoFromError = (error: Error): format.JsonPath[] => {
  switch (error.code) {
    case 'JSON_PARSE':
      return [{ tag: 'json', path: JSON.stringify(error.error) }]
    case 'NOT_AUTOREST_MARKDOWN':
      return [
        { tag: 'readme', path: format.blobHref(format.getRelativeSwaggerPathToRepo(error.readMeUrl)) },
        { tag: 'helpUrl', path: error.helpUrl },
      ]
    case 'NO_JSON_FILE_FOUND':
    case 'UNREFERENCED_JSON_FILE':
    case 'CIRCULAR_REFERENCE':
    case 'INCONSISTENT_API_VERSION':
      return [
        { tag: 'readme', path: format.blobHref(format.getRelativeSwaggerPathToRepo(error.readMeUrl)) },
        { tag: 'json', path: format.blobHref(format.getRelativeSwaggerPathToRepo(error.jsonUrl)) },
      ]
    case 'MULTIPLE_API_VERSION':
      return [
        { tag: 'readme', path: format.blobHref(format.getRelativeSwaggerPathToRepo(error.readMeUrl)) },
        {
          tag: 'tag',
          path: format.blobHref(format.getRelativeSwaggerPathToRepo(`${error.readMeUrl}#tag-${error.tag}`)),
        },
      ]
    case 'MISSING_README':
      return [{ tag: 'folder', path: format.blobHref(format.getRelativeSwaggerPathToRepo(error.folderUrl)) }]

    case 'MISSING_APIS_IN_DEFAULT_TAG':
      console.log(error.message)
      return [
        { tag: 'readme', path: format.blobHref(format.getRelativeSwaggerPathToRepo(error.readMeUrl)) },
        { tag: 'json', path: format.blobHref(format.getRelativeSwaggerPathToRepo(error.jsonUrl)) },
      ]
    case 'NOT_LATEST_API_VERSION_IN_DEFAULT_TAG':
      return [
        { tag: 'readme', path: format.blobHref(format.getRelativeSwaggerPathToRepo(error.readMeUrl)) },
        { tag: 'json', path: format.blobHref(format.getRelativeSwaggerPathToRepo(error.jsonUrl)) },
      ]
    default:
      return []
  }
}

export type Error =
  | JsonParseError
  | FileError
  | NotAutoRestMarkDown
  | MissingReadmeError
  | MultipleApiVersion
  | MissingLatestApiInDefaultTag
