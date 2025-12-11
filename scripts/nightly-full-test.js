/**
 * Nightly Full Test Runner
 * Runs Unit, Integration, and E2E tests and generates a report.
 * Intended to be run via Cron.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', '.logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const REPORT_FILE = path.join(LOG_DIR, 'nightly-test-report.txt');
const TIMESTAMP = new Date().toISOString();

function appendLog(message) {
  // Write exactly what is received to file to preserve partial lines/progress bars
  fs.appendFileSync(REPORT_FILE, message);
  // Also echo to console for manual run visibility
  process.stdout.write(message);
}

function runCommand(name, command, args) {
  return new Promise((resolve) => {
    appendLog(`\n--- Running ${name} ---\n`);
    const startTime = Date.now();
    
    const child = spawn(command, args, {
      cwd: path.join(__dirname, '..'),
      shell: true,
      env: {
        ...process.env,
        CI: 'true', // Force CI mode for headless E2E etc.
        FORCE_COLOR: '0', // Disable color for log file readability
      }
    });

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');

    child.stdout.on('data', (data) => {
      appendLog(data);
    });

    child.stderr.on('data', (data) => {
      appendLog(data);
    });

    child.on('close', (code) => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      if (code === 0) {
        appendLog(`\n✅ ${name} PASSED in ${duration}s\n`);
        resolve(true);
      } else {
        appendLog(`\n❌ ${name} FAILED in ${duration}s (Exit Code: ${code})\n`);
        resolve(false);
      }
    });

    child.on('error', (err) => {
      appendLog(`\n❌ ${name} FAILED to start: ${err.message}\n`);
      resolve(false);
    });
  });
}

(async () => {
  // Initialize Report
  fs.writeFileSync(REPORT_FILE, `Nightly Test Report - ${TIMESTAMP}\n========================================\n`);

  let success = true;

  // 1. Unit Tests
  if (!await runCommand('Unit Tests', 'pnpm', ['test:unit'])) {
    success = false;
  }

  // 2. Integration Tests
  if (!await runCommand('Integration Tests', 'pnpm', ['test:integration'])) {
    success = false;
  }

  // 3. E2E Tests (using headless mode explicitly if needed, but CI=true usually suffices)
  // We use the direct playwright wrapper via pnpm script
  if (!await runCommand('E2E Tests', 'pnpm', ['test:e2e'])) {
    success = false;
  }

  appendLog(`\n========================================\n`);
  appendLog(`Final Status: ${success ? 'ALL PASSED' : 'FAILURES DETECTED'}\n`);

  // Exit with 0 so cron doesn't think the script itself crashed, 
  // unless you want cron to send an email on failure (which is default behavior).
  // If we return non-zero, cron usually emails the output.
  process.exit(success ? 0 : 1);
})();