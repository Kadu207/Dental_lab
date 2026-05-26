# Plan: Testes e CI

## Approach

1. vitest + @vitest/coverage-v8 devDeps in @dental/api
2. rbac.test.ts unit tests
3. packages/labels labels.test.ts for code format
4. Root package.json `"test": "npm run test -w @dental/api && npm run test -w @dental/labels"`

## Acceptance

All tests green via npm test.
