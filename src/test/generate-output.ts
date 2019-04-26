// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root for license information.

import * as iterator from '@ts-common/iterator'

export const generate = () => iterator.repeat('Hello world!', 1)

export const print = () => {
  for (const v of generate()) {
    // tslint:disable-next-line:no-console
    console.log(v)
  }
}
