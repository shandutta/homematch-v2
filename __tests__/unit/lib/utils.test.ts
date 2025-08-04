import { cn, logger } from '@/lib/utils'

// Mock console methods
const originalConsoleLog = console.log
const originalConsoleWarn = console.warn
const originalConsoleError = console.error

describe('utils', () => {
  beforeEach(() => {
    console.log = jest.fn()
    console.warn = jest.fn()
    console.error = jest.fn()
  })

  afterEach(() => {
    console.log = originalConsoleLog
    console.warn = originalConsoleWarn
    console.error = originalConsoleError
  })

  describe('cn (classname utility)', () => {
    test('combines multiple class names', () => {
      const result = cn('class1', 'class2', 'class3')
      expect(result).toBe('class1 class2 class3')
    })

    test('handles conditional classes', () => {
      const falseCondition = false
      const trueCondition = true
      const result = cn('base', falseCondition ? 'false-class' : '', trueCondition ? 'true-class' : '')
      expect(result).toBe('base true-class')
    })

    test('merges tailwind classes correctly', () => {
      const result = cn('px-2 py-1', 'px-4')
      expect(result).toBe('py-1 px-4')
    })

    test('handles arrays of classes', () => {
      const result = cn(['class1', 'class2'], 'class3')
      expect(result).toBe('class1 class2 class3')
    })

    test('handles object notation', () => {
      const result = cn({
        'active': true,
        'disabled': false,
        'hover:bg-blue-500': true,
      })
      expect(result).toBe('active hover:bg-blue-500')
    })

    test('handles undefined and null values', () => {
      const result = cn('class1', undefined, null, 'class2')
      expect(result).toBe('class1 class2')
    })

    test('handles empty strings', () => {
      const result = cn('', 'class1', '', 'class2')
      expect(result).toBe('class1 class2')
    })

    test('merges responsive classes correctly', () => {
      const result = cn('sm:px-2 md:px-4', 'sm:px-3')
      expect(result).toBe('md:px-4 sm:px-3')
    })

    test('handles complex tailwind merging', () => {
      const result = cn(
        'bg-red-500 hover:bg-red-600',
        'bg-blue-500',
        'text-white'
      )
      expect(result).toBe('hover:bg-red-600 bg-blue-500 text-white')
    })

    test('preserves custom classes', () => {
      const result = cn('custom-class', 'px-4', 'another-custom')
      expect(result).toBe('custom-class px-4 another-custom')
    })

    test('handles no arguments', () => {
      const result = cn()
      expect(result).toBe('')
    })

    test('handles single argument', () => {
      const result = cn('single-class')
      expect(result).toBe('single-class')
    })
  })

  describe('logger', () => {
    test('info logs with [INFO] prefix', () => {
      logger.info('test message', { data: 'test' })
      
      expect(console.log).toHaveBeenCalledWith('[INFO]', 'test message', { data: 'test' })
      expect(console.log).toHaveBeenCalledTimes(1)
    })

    test('warn logs with [WARN] prefix', () => {
      logger.warn('warning message', 123)
      
      expect(console.warn).toHaveBeenCalledWith('[WARN]', 'warning message', 123)
      expect(console.warn).toHaveBeenCalledTimes(1)
    })

    test('error logs with [ERROR] prefix', () => {
      const error = new Error('test error')
      logger.error('error occurred', error)
      
      expect(console.error).toHaveBeenCalledWith('[ERROR]', 'error occurred', error)
      expect(console.error).toHaveBeenCalledTimes(1)
    })

    test('handles multiple arguments', () => {
      logger.info('arg1', 'arg2', 'arg3', { key: 'value' })
      
      expect(console.log).toHaveBeenCalledWith('[INFO]', 'arg1', 'arg2', 'arg3', { key: 'value' })
    })

    test('handles no arguments', () => {
      logger.info()
      logger.warn()
      logger.error()
      
      expect(console.log).toHaveBeenCalledWith('[INFO]')
      expect(console.warn).toHaveBeenCalledWith('[WARN]')
      expect(console.error).toHaveBeenCalledWith('[ERROR]')
    })

    test('handles various data types', () => {
      const obj = { test: 'object' }
      const arr = [1, 2, 3]
      const fn = () => 'function'
      
      logger.info('string', 123, true, obj, arr, fn, null, undefined)
      
      expect(console.log).toHaveBeenCalledWith(
        '[INFO]',
        'string',
        123,
        true,
        obj,
        arr,
        fn,
        null,
        undefined
      )
    })
  })
})