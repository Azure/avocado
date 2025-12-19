import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // By default, vitest@4 only excludes tests from "node_modules" and ".git" folders (not "dist").
    // Recommended fix is to *include* only the folders you want (more performant than excluding).
    dir: './src/test',

    // Our test files currently use pattern "foo-test.js" instead of the default "foo.test.js",
    // so we replace the first "." in the default pattern with "-"
    include: ['**/*-{test,spec}.?(c|m)[jt]s?(x)'],

    // git-test.ts can be slow on Windows
    testTimeout: 100000,
  },
})
