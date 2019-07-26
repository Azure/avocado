// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import * as jsonParser from '@ts-common/json-parser'

type ErrorMessage =
  | 'The example JSON file is not referenced from the swagger file.'
  | 'The swagger JSON file is not referenced from the readme file.'
  | 'The `readme.md` is not an AutoRest markdown file.'
  | 'The JSON file is not found but it is referenced from the readme file.'
  | 'The JSON file has a circular reference.'
  | 'The file is not a valid JSON file.'

export type JsonParseError = {
  /**
   * Error code. Always 'JSON_PARSE'
   */
  readonly code: 'JSON_PARSE'
  /**
   * Error Message
   */
  readonly message: ErrorMessage
  /**
   * JSON Error.
   */
  readonly error: jsonParser.ParseError
}

export type NotAutoRestMarkDown = {
  /**
   * Error code.
   */
  readonly code: 'NOT_AUTOREST_MARKDOWN'
  /**
   * Error message.
   */
  readonly message: ErrorMessage
  /**
   * URL of `readme.md` file.
   */
  readonly readMeUrl: string
  /**
   * Help URL.
   */
  readonly helpUrl: string
}

export type FileError = {
  /**
   * Error code.
   */
  readonly code: 'NO_JSON_FILE_FOUND' | 'UNREFERENCED_JSON_FILE' | 'CIRCULAR_REFERENCE'
  /**
   * Error message.
   */
  readonly message: ErrorMessage
  /**
   * URL of `readme.md` file.
   */
  readonly readMeUrl: string
  /**
   * URL of JSON file.
   */
  readonly jsonUrl: string
}

export type Error = JsonParseError | FileError | NotAutoRestMarkDown
