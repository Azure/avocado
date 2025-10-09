import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Our test files currently use pattern "foo-test.js" instead of the default "foo.test.js",
    // so we replace the first "." in the default pattern with "-"
    include: ['**/*-{test,spec}.?(c|m)[jt]s?(x)'],
  },
})
