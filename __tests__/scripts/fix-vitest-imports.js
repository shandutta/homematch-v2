#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Find all test files that need fixing
const findFilesWithVitestUsage = () => {
  const files = [];
  const walkDir = (dir) => {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else if (item.endsWith('.test.ts') || item.endsWith('.test.tsx')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('vi.') || content.includes("from 'vitest'")) {
          files.push(fullPath);
        }
      }
    }
  };
  
  const integrationPath = path.join(process.cwd(), '../..', '__tests__/integration');
  if (fs.existsSync(integrationPath)) {
    walkDir(integrationPath);
  }
  
  return files;
};

const testFiles = findFilesWithVitestUsage();
let filesFixed = 0;
let totalFiles = testFiles.length;

console.log(`Found ${totalFiles} files that need fixing...\n`);

testFiles.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;
    
    // Fix import statement if needed 
    if (!content.includes("from '@jest/globals'") && (content.includes('vi.') || content.includes('vi }'))) {
      // Add jest import to existing import from @jest/globals if exists
      const jestImportMatch = content.match(/import\s*{\s*([^}]+)\s*}\s*from\s*['"]@jest\/globals['"]/);
      if (jestImportMatch) {
        const imports = jestImportMatch[1].split(',').map(s => s.trim());
        if (!imports.includes('jest')) {
          content = content.replace(
            jestImportMatch[0],
            `import { ${[...imports, 'jest'].join(', ')} } from '@jest/globals'`
          );
          modified = true;
        }
      }
    }
    
    // Replace all vi. with jest.
    if (content.includes('vi.')) {
      content = content.replace(/\bvi\./g, 'jest.');
      modified = true;
    }
    
    // Replace vi.mocked with jest.mocked (if it exists)
    if (content.includes('jest.mocked')) {
      // jest.mocked doesn't exist in Jest, use 'as jest.MockedFunction' pattern instead
      content = content.replace(/jest\.mocked\(([^)]+)\)/g, '$1 as jest.MockedFunction<typeof $1>');
      modified = true;
    }
    
    if (modified) {
      fs.writeFileSync(file, content, 'utf8');
      filesFixed++;
      const relativePath = path.relative(path.join(process.cwd(), '../..'), file);
      console.log(`✅ Fixed: ${relativePath}`);
    } else {
      const relativePath = path.relative(path.join(process.cwd(), '../..'), file);
      console.log(`⏭️  Skipped: ${relativePath}`);
    }
  } catch (err) {
    console.error(`❌ Error processing ${file}: ${err.message}`);
  }
});

console.log(`\n📊 Summary: Fixed ${filesFixed} out of ${totalFiles} files`);