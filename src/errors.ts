import * as jsonParser from '@ts-common/json-parser'

export type JsonParseError = {
  /**
   * Error code. Always 'JSON_PARSE'
   */
  readonly code: 'JSON_PARSE'
  /**
   * Error Message
   */
  readonly message: string
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
  readonly message: string
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
  readonly message: string
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
