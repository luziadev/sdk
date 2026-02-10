#!/usr/bin/env bun
/**
 * Generate TypeScript types from the Luzia OpenAPI specification.
 *
 * Usage: bun run generate
 */

/* biome-ignore-all lint/suspicious/noConsole: This is a CLI script */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import openapiTS, { astToString } from 'openapi-typescript'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const API_ROOT = join(ROOT, '..', '..', 'apps', 'api')

const OPENAPI_PATH = join(API_ROOT, 'src', 'openapi.yaml')
const OUTPUT_PATH = join(ROOT, 'src', 'types', 'generated.ts')

async function main() {
  console.log('Generating types from OpenAPI specification...')
  console.log(`  Input: ${OPENAPI_PATH}`)
  console.log(`  Output: ${OUTPUT_PATH}`)

  // Read the OpenAPI spec
  const spec = readFileSync(OPENAPI_PATH, 'utf-8')

  // Generate TypeScript types
  const ast = await openapiTS(spec, {
    exportType: true,
    alphabetize: true,
    pathParamsAsTypes: true,
  })

  const contents = astToString(ast)

  // Add header comment
  const header = `/**
 * Auto-generated TypeScript types from the Luzia OpenAPI specification.
 * DO NOT EDIT MANUALLY - regenerate with: bun run generate
 *
 * Generated at: ${new Date().toISOString()}
 */

`

  // Ensure output directory exists
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true })

  // Write the output file
  writeFileSync(OUTPUT_PATH, header + contents)

  console.log('Types generated successfully!')
}

main().catch((error) => {
  console.error('Failed to generate types:', error)
  process.exit(1)
})
