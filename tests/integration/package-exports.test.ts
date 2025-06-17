/**
 * Integration test to validate that the package exports work correctly
 * This test ensures clients can import from @belongnetwork/platform
 * in all the expected ways after building and publishing.
 */

import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('Package Exports Integration', () => {
  test('dist files are generated correctly', () => {
    const distPath = join(process.cwd(), 'dist')
    
    // Check main entry files exist
    expect(() => readFileSync(join(distPath, 'index.es.js'))).not.toThrow()
    expect(() => readFileSync(join(distPath, 'index.cjs.js'))).not.toThrow()
    expect(() => readFileSync(join(distPath, 'index.d.ts'))).not.toThrow()
    
    // Check subpath files exist
    expect(() => readFileSync(join(distPath, 'providers.es.js'))).not.toThrow()
    expect(() => readFileSync(join(distPath, 'providers.cjs.js'))).not.toThrow()
    expect(() => readFileSync(join(distPath, 'providers.d.ts'))).not.toThrow()
    
    expect(() => readFileSync(join(distPath, 'hooks.es.js'))).not.toThrow()
    expect(() => readFileSync(join(distPath, 'hooks.cjs.js'))).not.toThrow()
    expect(() => readFileSync(join(distPath, 'hooks.d.ts'))).not.toThrow()
    
    expect(() => readFileSync(join(distPath, 'types.es.js'))).not.toThrow()
    expect(() => readFileSync(join(distPath, 'types.cjs.js'))).not.toThrow()
    expect(() => readFileSync(join(distPath, 'types.d.ts'))).not.toThrow()
  })

  test('main entry point exports correct content', () => {
    const indexContent = readFileSync(join(process.cwd(), 'dist/index.es.js'), 'utf-8')
    
    // Should export from packages
    expect(indexContent).toContain('export')
    expect(indexContent).toContain('from')
    
    // Should have BelongClientProvider export
    expect(indexContent).toContain('BelongClientProvider')
    
    // Should have namespace exports
    expect(indexContent).toContain('hooks')
    expect(indexContent).toContain('types')
  })

  test('providers subpath exports correct content', () => {
    const providersContent = readFileSync(join(process.cwd(), 'dist/providers.es.js'), 'utf-8')
    
    // Should export BelongClientProvider
    expect(providersContent).toContain('export')
    expect(providersContent).toContain('BelongClientProvider')
  })

  test('hooks subpath exports correct content', () => {
    const hooksContent = readFileSync(join(process.cwd(), 'dist/hooks.es.js'), 'utf-8')
    
    // Should have export statements
    expect(hooksContent).toContain('export')
  })

  test('types subpath exports correct content', () => {
    const typesContent = readFileSync(join(process.cwd(), 'dist/types.es.js'), 'utf-8')
    
    // Should have export statements
    expect(typesContent).toContain('export')
  })

  test('package.json configuration is valid', () => {
    const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'))
    
    expect(packageJson.name).toBe('@belongnetwork/platform')
    expect(packageJson.main).toBe('./dist/index.cjs.js')
    expect(packageJson.module).toBe('./dist/index.es.js')
    expect(packageJson.types).toBe('./dist/index.d.ts')
    
    // Validate exports field
    expect(packageJson.exports).toHaveProperty('.')
    expect(packageJson.exports).toHaveProperty('./providers')
    expect(packageJson.exports).toHaveProperty('./hooks')
    expect(packageJson.exports).toHaveProperty('./types')
    
    // Validate main export paths
    const mainExport = packageJson.exports['.']
    expect(mainExport.types).toBe('./dist/index.d.ts')
    expect(mainExport.import).toBe('./dist/index.es.js')
    expect(mainExport.require).toBe('./dist/index.cjs.js')
    
    // Validate subpath exports
    const providersExport = packageJson.exports['./providers']
    expect(providersExport.types).toBe('./dist/providers.d.ts')
    expect(providersExport.import).toBe('./dist/providers.es.js')
    expect(providersExport.require).toBe('./dist/providers.cjs.js')
  })

  test('TypeScript declarations are generated', () => {
    const indexDts = readFileSync(join(process.cwd(), 'dist/index.d.ts'), 'utf-8')
    const providersDts = readFileSync(join(process.cwd(), 'dist/providers.d.ts'), 'utf-8')
    const hooksDts = readFileSync(join(process.cwd(), 'dist/hooks.d.ts'), 'utf-8')
    const typesDts = readFileSync(join(process.cwd(), 'dist/types.d.ts'), 'utf-8')
    
    // Check that type definitions contain expected exports
    expect(indexDts).toContain('export')
    expect(providersDts).toContain('BelongClientProvider')
    expect(hooksDts).toContain('export')
    expect(typesDts).toContain('export')
  })

  test('files field includes only dist directory', () => {
    const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'))
    expect(packageJson.files).toEqual(['dist'])
  })

  test('private field is not set (package can be published)', () => {
    const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'))
    expect(packageJson.private).toBeUndefined()
  })
})