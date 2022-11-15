// Copyright (c) 2022 Microsoft Corporation
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

export interface IService {
  toc_title: string
  url_group: string
  readme_files?: string[]
  swagger_files?: ISwaggerFile[]
  excluded_files?: string[]
}

export interface ISwaggerFile {
  source: string
}

// How to mapping returned swagger files with correct sub_group_toc_title.

export type SwaggerFiles = {
  version: VersionVariable // version of the swagger files or version of tag
  swaggerFiles: ISwaggerFile[]
}

export type VersionVariable = 'version' | 'preview_version' | 'stable_version'

export type GetSwaggerFiles = (specRootFilePath: string, service: IService) => ISwaggerFile[]
