/**
 * Logger fixture for HomeMatch V2 E2E tests
 * Provides debugging and logging functionality
 */

import { TestLogger } from '../types/fixtures'
import fs from 'fs'
import path from 'path'

interface LogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  category: string
  message: string
  data?: any
}

class E2ETestLogger implements TestLogger {
  private logs: LogEntry[] = []
  private logFile?: string

  constructor(
    private testTitle: string,
    private options: {
      enabled?: boolean
      logToFile?: boolean
      logDir?: string
    } = {}
  ) {
    this.options.enabled = this.options.enabled ?? process.env.DEBUG === 'true'
    this.options.logToFile = this.options.logToFile ?? false
    this.options.logDir =
      this.options.logDir ?? path.join(process.cwd(), 'logs', 'e2e')

    if (this.options.logToFile) {
      this.initLogFile()
    }
  }

  private initLogFile() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const testName = this.testTitle.replace(/[^a-zA-Z0-9]/g, '-')
    const fileName = `${timestamp}-${testName}.log`

    // Ensure log directory exists
    fs.mkdirSync(this.options.logDir!, { recursive: true })

    this.logFile = path.join(this.options.logDir!, fileName)
  }

  private log(
    level: LogEntry['level'],
    category: string,
    message: string,
    data?: any
  ) {
    if (!this.options.enabled) return

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
    }

    this.logs.push(entry)

    // Console output
    const prefix = `[${entry.timestamp}] [${level.toUpperCase()}] [${category}]`
    const color = {
      info: '\x1b[36m', // Cyan
      warn: '\x1b[33m', // Yellow
      error: '\x1b[31m', // Red
      debug: '\x1b[90m', // Gray
    }[level]

    console.log(`${color}${prefix}\x1b[0m ${message}`)
    if (data) {
      console.log(`${color}  Data:\x1b[0m`, data)
    }

    // File output
    if (this.options.logToFile && this.logFile) {
      const logLine = JSON.stringify(entry) + '\n'
      fs.appendFileSync(this.logFile, logLine)
    }
  }

  step(description: string, data?: any) {
    this.log('info', 'STEP', description, data)
  }

  info(category: string, message: string, data?: any) {
    this.log('info', category, message, data)
  }

  warn(category: string, message: string, data?: any) {
    this.log('warn', category, message, data)
  }

  error(category: string, message: string, data?: any) {
    this.log('error', category, message, data)
  }

  navigation(url: string, status: 'start' | 'complete' | 'error', data?: any) {
    this.log('info', 'NAVIGATION', `${status}: ${url}`, data)
  }

  auth(action: string, status: 'start' | 'success' | 'failure', data?: any) {
    const level = status === 'failure' ? 'error' : 'info'
    this.log(level, 'AUTH', `${action} - ${status}`, data)
  }

  getSummary(): string {
    const summary = {
      total: this.logs.length,
      byLevel: {
        info: this.logs.filter((l) => l.level === 'info').length,
        warn: this.logs.filter((l) => l.level === 'warn').length,
        error: this.logs.filter((l) => l.level === 'error').length,
        debug: this.logs.filter((l) => l.level === 'debug').length,
      },
      byCategory: {} as Record<string, number>,
    }

    this.logs.forEach((log) => {
      summary.byCategory[log.category] =
        (summary.byCategory[log.category] || 0) + 1
    })

    return JSON.stringify(summary, null, 2)
  }

  saveToFile(filePath?: string) {
    const file = filePath || this.logFile
    if (!file) return

    const content = this.logs.map((log) => JSON.stringify(log)).join('\n')
    fs.writeFileSync(file, content)
  }
}

// Export just the fixtures object, not a test object
export const loggerFixtures = {
  logger: async ({ page }, use, testInfo) => {
    const logger = new E2ETestLogger(testInfo.title, {
      enabled: true,
      logToFile: false,
    })

    // Attach page event listeners for automatic logging
    page.on('console', (msg) => {
      const type = msg.type()
      if (type === 'error') {
        logger.error('CONSOLE', msg.text(), { location: msg.location() })
      } else if (type === 'warning') {
        logger.warn('CONSOLE', msg.text(), { location: msg.location() })
      }
    })

    page.on('pageerror', (error) => {
      logger.error('PAGE_ERROR', error.message, { stack: error.stack })
    })

    page.on('crash', () => {
      logger.error('CRASH', 'Page crashed')
    })

    logger.step('Starting test: ' + testInfo.title)

    await use(logger)

    // Log test completion
    const status = testInfo.status || 'unknown'
    logger.info('TEST_COMPLETE', `Test ${status}: ${testInfo.title}`, {
      duration: testInfo.duration,
      status,
      errors: testInfo.errors?.length || 0,
    })

    // Save logs if test failed
    if (status === 'failed') {
      logger.saveToFile()
      console.log('📊 Test failure logs saved')
      console.log(logger.getSummary())
    }
  },
}

// expect is exported from index.ts
