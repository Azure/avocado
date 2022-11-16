// Copyright (c) 2022 Microsoft Corporation
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

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

export type GetSwaggerFiles = (rootPath: string, service: IService) => SwaggerFile[]
