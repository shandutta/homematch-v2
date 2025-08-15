#!/usr/bin/env node

/**
 * Design Token Migration Script
 *
 * Automatically migrates hardcoded colors to design tokens throughout the codebase.
 * Supports dry-run mode, rollback capability, and targeted migration paths.
 *
 * Usage:
 *   node scripts/migrate-design-tokens.js [options]
 *
 * Options:
 *   --dry-run      Show what would be changed without modifying files
 *   --target       Target specific directories (e.g., --target src/components/settings)
 *   --rollback     Revert the last migration using saved backup
 *   --verbose      Show detailed migration information
 */

const fs = require('fs').promises
const path = require('path')
const { glob } = require('glob')

// Color to design token mappings
const COLOR_MAPPINGS = {
  // Background colors
  'bg-white': 'bg-background',
  'bg-black': 'bg-foreground',
  'bg-gray-50': 'bg-muted',
  'bg-gray-100': 'bg-muted',
  'bg-gray-200': 'bg-border',
  'bg-gray-900': 'bg-foreground',
  'bg-slate-900': 'bg-foreground',
  'bg-zinc-900': 'bg-foreground',

  // Purple/Primary colors
  'bg-purple-500': 'bg-primary',
  'bg-purple-600': 'bg-primary',
  'bg-purple-700': 'bg-primary',
  'bg-purple-800': 'bg-primary',
  'bg-purple-900': 'bg-primary',
  'bg-purple-400': 'bg-primary/80',
  'bg-purple-300': 'bg-primary/60',

  // Text colors
  'text-white': 'text-primary-foreground',
  'text-black': 'text-foreground',
  'text-gray-900': 'text-foreground',
  'text-gray-800': 'text-foreground',
  'text-gray-700': 'text-foreground/90',
  'text-gray-600': 'text-muted-foreground',
  'text-gray-500': 'text-muted-foreground',
  'text-gray-400': 'text-muted-foreground/80',
  'text-gray-300': 'text-muted-foreground/60',
  'text-slate-900': 'text-foreground',
  'text-zinc-900': 'text-foreground',
  'text-zinc-800': 'text-foreground/90',
  'text-zinc-700': 'text-foreground/80',
  'text-zinc-600': 'text-muted-foreground',
  'text-zinc-500': 'text-muted-foreground',
  'text-zinc-400': 'text-muted-foreground/80',
  'text-zinc-300': 'text-muted-foreground/60',
  'text-zinc-200': 'text-muted-foreground/40',
  'text-zinc-100': 'text-muted-foreground/20',

  // Purple text colors
  'text-purple-50': 'text-primary/10',
  'text-purple-100': 'text-primary/20',
  'text-purple-200': 'text-primary/40',
  'text-purple-300': 'text-primary/60',
  'text-purple-400': 'text-primary/80',
  'text-purple-500': 'text-primary',
  'text-purple-600': 'text-primary',
  'text-purple-700': 'text-primary',
  'text-purple-800': 'text-primary',
  'text-purple-900': 'text-primary',

  // Border colors
  'border-gray-200': 'border-border',
  'border-gray-300': 'border-border',
  'border-purple-500': 'border-primary',
  'border-purple-600': 'border-primary',
  'border-white': 'border-background',
  'border-zinc-300': 'border-border',
  'border-zinc-200': 'border-border',

  // Special colors
  'bg-red-500': 'bg-destructive',
  'bg-red-600': 'bg-destructive',
  'text-red-500': 'text-destructive',
  'text-red-600': 'text-destructive',
  'border-red-500': 'border-destructive',

  'bg-green-500': 'bg-success',
  'bg-green-600': 'bg-success',
  'text-green-500': 'text-success',
  'text-green-600': 'text-success',
  'border-green-500': 'border-success',

  'bg-blue-500': 'bg-info',
  'bg-blue-600': 'bg-info',
  'text-blue-500': 'text-info',
  'text-blue-600': 'text-info',
  'border-blue-500': 'border-info',

  'bg-yellow-500': 'bg-warning',
  'bg-yellow-600': 'bg-warning',
  'text-yellow-500': 'text-warning',
  'text-yellow-600': 'text-warning',
  'border-yellow-500': 'border-warning',
}

// RGBA to CSS variable mappings (for complex glass-morphism effects)
const RGBA_MAPPINGS = [
  // White with various opacities
  {
    pattern: /rgba\(255,\s*255,\s*255,\s*0\.95\)/g,
    replacement: 'rgb(var(--background) / 0.95)',
  },
  {
    pattern: /rgba\(255,\s*255,\s*255,\s*0\.9\)/g,
    replacement: 'rgb(var(--background) / 0.9)',
  },
  {
    pattern: /rgba\(255,\s*255,\s*255,\s*0\.8\)/g,
    replacement: 'rgb(var(--background) / 0.8)',
  },
  {
    pattern: /rgba\(255,\s*255,\s*255,\s*0\.7\)/g,
    replacement: 'rgb(var(--background) / 0.7)',
  },
  {
    pattern: /rgba\(255,\s*255,\s*255,\s*0\.6\)/g,
    replacement: 'rgb(var(--background) / 0.6)',
  },
  {
    pattern: /rgba\(255,\s*255,\s*255,\s*0\.5\)/g,
    replacement: 'rgb(var(--background) / 0.5)',
  },
  {
    pattern: /rgba\(255,\s*255,\s*255,\s*0\.4\)/g,
    replacement: 'rgb(var(--background) / 0.4)',
  },
  {
    pattern: /rgba\(255,\s*255,\s*255,\s*0\.3\)/g,
    replacement: 'rgb(var(--background) / 0.3)',
  },
  {
    pattern: /rgba\(255,\s*255,\s*255,\s*0\.2\)/g,
    replacement: 'rgb(var(--background) / 0.2)',
  },
  {
    pattern: /rgba\(255,\s*255,\s*255,\s*0\.1\)/g,
    replacement: 'rgb(var(--background) / 0.1)',
  },

  // Black with various opacities
  {
    pattern: /rgba\(0,\s*0,\s*0,\s*0\.9\)/g,
    replacement: 'rgb(var(--foreground) / 0.9)',
  },
  {
    pattern: /rgba\(0,\s*0,\s*0,\s*0\.8\)/g,
    replacement: 'rgb(var(--foreground) / 0.8)',
  },
  {
    pattern: /rgba\(0,\s*0,\s*0,\s*0\.7\)/g,
    replacement: 'rgb(var(--foreground) / 0.7)',
  },
  {
    pattern: /rgba\(0,\s*0,\s*0,\s*0\.6\)/g,
    replacement: 'rgb(var(--foreground) / 0.6)',
  },
  {
    pattern: /rgba\(0,\s*0,\s*0,\s*0\.5\)/g,
    replacement: 'rgb(var(--foreground) / 0.5)',
  },
  {
    pattern: /rgba\(0,\s*0,\s*0,\s*0\.4\)/g,
    replacement: 'rgb(var(--foreground) / 0.4)',
  },
  {
    pattern: /rgba\(0,\s*0,\s*0,\s*0\.3\)/g,
    replacement: 'rgb(var(--foreground) / 0.3)',
  },
  {
    pattern: /rgba\(0,\s*0,\s*0,\s*0\.2\)/g,
    replacement: 'rgb(var(--foreground) / 0.2)',
  },
  {
    pattern: /rgba\(0,\s*0,\s*0,\s*0\.1\)/g,
    replacement: 'rgb(var(--foreground) / 0.1)',
  },

  // Purple/Primary colors with opacity
  {
    pattern: /rgba\(147,\s*51,\s*234,\s*[0-9.]+\)/g,
    replacement: 'rgb(var(--primary) / $1)',
  },
  {
    pattern: /rgba\(168,\s*85,\s*247,\s*[0-9.]+\)/g,
    replacement: 'rgb(var(--primary) / $1)',
  },
  {
    pattern: /rgba\(139,\s*92,\s*246,\s*[0-9.]+\)/g,
    replacement: 'rgb(var(--primary) / $1)',
  },
]

// Shadow mappings (reserved for future use)
// const SHADOW_MAPPINGS = {
//   'shadow-sm': 'shadow-sm',
//   'shadow': 'shadow',
//   'shadow-md': 'shadow-md',
//   'shadow-lg': 'shadow-lg',
//   'shadow-xl': 'shadow-xl',
//   'shadow-2xl': 'shadow-2xl',
//   'shadow-none': 'shadow-none',
// }

class DesignTokenMigrator {
  constructor(options = {}) {
    this.dryRun = options.dryRun || false
    this.target = options.target || 'src'
    this.verbose = options.verbose || false
    this.rollback = options.rollback || false
    this.backupDir = path.join(process.cwd(), '.design-token-backup')
    this.stats = {
      filesProcessed: 0,
      filesModified: 0,
      tokensReplaced: 0,
      errors: [],
    }
  }

  async run() {
    console.log('🎨 Design Token Migration Script')
    console.log('================================')
    console.log(`Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE'}`)
    console.log(`Target: ${this.target}`)
    console.log('')

    if (this.rollback) {
      return await this.performRollback()
    }

    // Find all TypeScript/TSX files in target directory
    const pattern = `${this.target}/**/*.{ts,tsx}`.replace(/\\/g, '/')
    const files = await glob(pattern, {
      ignore: ['**/node_modules/**', '**/dist/**', '**/.next/**'],
    })

    console.log(`Found ${files.length} files to process\n`)

    // Process each file
    for (const file of files) {
      await this.processFile(file)
    }

    // Print summary
    this.printSummary()
  }

  async processFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      let modified = content
      let changeCount = 0

      // Skip design token definition files
      if (filePath.includes('design-tokens')) {
        return
      }

      // Apply Tailwind class mappings
      for (const [oldClass, newClass] of Object.entries(COLOR_MAPPINGS)) {
        const regex = new RegExp(`\\b${oldClass}\\b`, 'g')
        const matches = modified.match(regex)
        if (matches) {
          modified = modified.replace(regex, newClass)
          changeCount += matches.length
        }
      }

      // Apply RGBA mappings
      for (const { pattern, replacement } of RGBA_MAPPINGS) {
        const matches = modified.match(pattern)
        if (matches) {
          modified = modified.replace(pattern, replacement)
          changeCount += matches.length
        }
      }

      // Check if file was modified
      if (modified !== content) {
        this.stats.filesModified++
        this.stats.tokensReplaced += changeCount

        if (this.verbose) {
          console.log(
            `✅ ${path.relative(process.cwd(), filePath)} (${changeCount} replacements)`
          )
        }

        if (!this.dryRun) {
          // Create backup
          await this.createBackup(filePath, content)

          // Write modified content
          await fs.writeFile(filePath, modified, 'utf-8')
        }
      }

      this.stats.filesProcessed++
    } catch (error) {
      this.stats.errors.push({ file: filePath, error: error.message })
      console.error(`❌ Error processing ${filePath}: ${error.message}`)
    }
  }

  async createBackup(filePath, content) {
    const backupPath = path.join(
      this.backupDir,
      path.relative(process.cwd(), filePath)
    )

    await fs.mkdir(path.dirname(backupPath), { recursive: true })
    await fs.writeFile(backupPath, content, 'utf-8')
  }

  async performRollback() {
    console.log('🔄 Rolling back design token migration...\n')

    try {
      const backupFiles = await glob(path.join(this.backupDir, '**/*'), {
        nodir: true,
      })

      for (const backupFile of backupFiles) {
        const originalPath = path.join(
          process.cwd(),
          path.relative(this.backupDir, backupFile)
        )

        const backupContent = await fs.readFile(backupFile, 'utf-8')
        await fs.writeFile(originalPath, backupContent, 'utf-8')

        if (this.verbose) {
          console.log(
            `✅ Restored ${path.relative(process.cwd(), originalPath)}`
          )
        }
      }

      // Clean up backup directory
      await fs.rm(this.backupDir, { recursive: true, force: true })

      console.log('\n✅ Rollback completed successfully!')
    } catch (error) {
      console.error(`❌ Rollback failed: ${error.message}`)
      process.exit(1)
    }
  }

  printSummary() {
    console.log('\n📊 Migration Summary')
    console.log('===================')
    console.log(`Files processed: ${this.stats.filesProcessed}`)
    console.log(`Files modified: ${this.stats.filesModified}`)
    console.log(`Tokens replaced: ${this.stats.tokensReplaced}`)

    if (this.stats.errors.length > 0) {
      console.log(`\n⚠️  Errors: ${this.stats.errors.length}`)
      this.stats.errors.forEach(({ file, error }) => {
        console.log(`  - ${file}: ${error}`)
      })
    }

    if (this.dryRun) {
      console.log('\n💡 This was a dry run. No files were modified.')
      console.log('   Run without --dry-run to apply changes.')
    } else {
      console.log('\n✅ Migration completed successfully!')
      console.log('   Run with --rollback to revert changes.')
    }
  }
}

// Parse command line arguments
const args = process.argv.slice(2)
const options = {
  dryRun: args.includes('--dry-run'),
  verbose: args.includes('--verbose'),
  rollback: args.includes('--rollback'),
  target: 'src',
}

// Handle --target argument
const targetIndex = args.indexOf('--target')
if (targetIndex !== -1 && args[targetIndex + 1]) {
  options.target = args[targetIndex + 1]
}

// Run the migrator
const migrator = new DesignTokenMigrator(options)
migrator.run().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
