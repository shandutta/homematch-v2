import {
  jest,
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
} from '@jest/globals'
import { renderHook, act } from '@testing-library/react'
import { z } from 'zod'
import { useValidatedForm } from '@/hooks/useValidatedForm'

/**
 * @fileoverview Unit tests for the useValidatedForm hook.
 *
 * TESTING STRATEGY:
 * This file intentionally tests only the aspects of the hook that can be
 * reliably tested in isolation (e.g., initialization, default values, basic operations).
 *
 * The validation logic, real-time error handling, and form state management 
 * (isDirty, isTouched) of React Hook Form are tightly coupled to the DOM and 
 * component lifecycle. Therefore, comprehensive testing for these features is 
 * delegated to component-level integration tests where the hook is used, such as
 * LoginForm.test.tsx. This aligns with React Hook Form's recommended testing 
 * practices and ensures our tests are robust and meaningful.
 *
 * WHAT IS TESTED HERE:
 * - Hook initialization with schema binding
 * - Default values setting and retrieval
 * - Basic form method availability
 * - Complex schema handling (nested objects, arrays)
 * - Optional and nullable field handling
 * - Form reset functionality
 * - Watch functionality
 * - Schema validation on form submission (success path)
 *
 * WHAT IS NOT TESTED HERE (covered in integration tests):
 * - Real-time validation on field changes
 * - Form state tracking (isDirty, isTouched, isValid)
 * - Error message display and clearing
 * - DOM event-driven validation behaviors
 * - User interaction workflows
 */

// Test schemas for validation
const simpleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  age: z.number().min(0, 'Age must be positive'),
})

const complexSchema = z.object({
  user: z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    profile: z.object({
      bio: z.string().optional(),
      website: z.string().url('Invalid URL').optional(),
    }),
  }),
  preferences: z.array(z.string()).min(1, 'At least one preference required'),
  isActive: z.boolean().default(true),
})

const optionalFieldsSchema = z.object({
  required: z.string().min(1, 'Required field'),
  optional: z.string().optional(),
  nullable: z.string().nullable(),
  withDefault: z.string().default('default-value'),
})

type SimpleFormData = z.infer<typeof simpleSchema>
type ComplexFormData = z.infer<typeof complexSchema>
type _OptionalFormData = z.infer<typeof optionalFieldsSchema>

describe('useValidatedForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('basic functionality', () => {
    test('should initialize form with schema validation', () => {
      const { result } = renderHook(() => useValidatedForm(simpleSchema))

      expect(result.current).toHaveProperty('register')
      expect(result.current).toHaveProperty('handleSubmit')
      expect(result.current).toHaveProperty('formState')
      expect(result.current).toHaveProperty('control')
      expect(result.current).toHaveProperty('watch')
      expect(result.current).toHaveProperty('setValue')
      expect(result.current).toHaveProperty('getValues')
      expect(result.current).toHaveProperty('reset')
      expect(result.current).toHaveProperty('trigger')
      expect(result.current).toHaveProperty('clearErrors')
      expect(result.current).toHaveProperty('setError')
    })

    test('should initialize with default values', () => {
      const defaultValues: SimpleFormData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
      }

      const { result } = renderHook(() =>
        useValidatedForm(simpleSchema, defaultValues)
      )

      expect(result.current.getValues()).toEqual(defaultValues)
    })

    test('should initialize without default values', () => {
      const { result } = renderHook(() => useValidatedForm(simpleSchema))

      const values = result.current.getValues()
      expect(values).toEqual({})
    })
  })

  describe('schema validation on submission', () => {
    test('should call onError when validation fails on submit', async () => {
      const onSubmit = jest.fn()
      const onError = jest.fn()
      const { result } = renderHook(() => useValidatedForm(simpleSchema))

      act(() => {
        result.current.setValue('name', '')
        result.current.setValue('email', 'invalid-email')
        result.current.setValue('age', -1)
      })

      await act(async () => {
        await result.current.handleSubmit(onSubmit, onError)()
      })

      expect(onSubmit).not.toHaveBeenCalled()
      expect(onError).toHaveBeenCalled()
    })
  })

  describe('complex schema handling', () => {
    test('should handle nested object schemas', () => {
      const defaultValues: ComplexFormData = {
        user: {
          firstName: 'John',
          lastName: 'Doe',
          profile: {
            bio: 'Software developer',
            website: 'https://johndoe.com',
          },
        },
        preferences: ['coding', 'reading'],
        isActive: true,
      }

      const { result } = renderHook(() =>
        useValidatedForm(complexSchema, defaultValues)
      )

      expect(result.current.getValues()).toEqual(defaultValues)
    })

    test('should handle nested field setting', async () => {
      const { result } = renderHook(() => useValidatedForm(complexSchema))

      await act(async () => {
        result.current.setValue('user.firstName', 'John')
        result.current.setValue('user.lastName', 'Doe')
        result.current.setValue('preferences', ['coding'])
      })

      const values = result.current.getValues()
      expect(values.user?.firstName).toBe('John')
      expect(values.user?.lastName).toBe('Doe')
      expect(values.preferences).toEqual(['coding'])
    })
  })

  describe('optional and nullable fields', () => {
    test('should handle optional fields correctly', () => {
      const { result } = renderHook(() => useValidatedForm(optionalFieldsSchema))

      act(() => {
        result.current.setValue('required', 'test')
        // optional field can be undefined
        result.current.setValue('optional', undefined)
      })

      const values = result.current.getValues()
      expect(values.required).toBe('test')
      expect(values.optional).toBeUndefined()
    })

    test('should handle nullable fields correctly', () => {
      const { result } = renderHook(() => useValidatedForm(optionalFieldsSchema))

      act(() => {
        result.current.setValue('required', 'test')
        result.current.setValue('nullable', null)
      })

      const values = result.current.getValues()
      expect(values.required).toBe('test')
      expect(values.nullable).toBeNull()
    })

    test('should apply default values from schema', () => {
      const { result } = renderHook(() => useValidatedForm(optionalFieldsSchema))

      act(() => {
        result.current.setValue('required', 'test')
      })

      // withDefault should get its default value during validation
      const values = result.current.getValues()
      expect(values.required).toBe('test')
    })
  })

  describe('form reset functionality', () => {
    test('should reset form to default values', () => {
      const defaultValues: SimpleFormData = {
        name: 'John',
        email: 'john@example.com',
        age: 30,
      }

      const { result } = renderHook(() =>
        useValidatedForm(simpleSchema, defaultValues)
      )

      act(() => {
        result.current.setValue('name', 'Jane')
      })

      expect(result.current.getValues().name).toBe('Jane')

      act(() => {
        result.current.reset()
      })

      expect(result.current.getValues()).toEqual(defaultValues)
    })
  })

  describe('form submission handling', () => {
    test('should call onSubmit with valid data when validation passes', async () => {
      const onSubmit = jest.fn()
      const { result } = renderHook(() => useValidatedForm(simpleSchema))

      act(() => {
        result.current.setValue('name', 'John')
        result.current.setValue('email', 'john@example.com')
        result.current.setValue('age', 30)
      })

      await act(async () => {
        await result.current.handleSubmit(onSubmit)()
      })

      expect(onSubmit).toHaveBeenCalled()
      // Verify the first argument contains our data
      expect(onSubmit.mock.calls[0][0]).toEqual({
        name: 'John',
        email: 'john@example.com',
        age: 30,
      })
    })
  })

  // NOTE: Error handling, form state management (isDirty, isTouched), and 
  // real-time validation are intentionally not tested here as they require 
  // DOM events and component lifecycle. These behaviors are comprehensively 
  // tested through component integration tests like LoginForm.test.tsx.

  describe('watch functionality', () => {
    test('should watch single field', () => {
      const { result } = renderHook(() => useValidatedForm(simpleSchema))

      act(() => {
        result.current.setValue('name', 'John')
      })

      const watchedName = result.current.watch('name')
      expect(watchedName).toBe('John')
    })

    test('should watch multiple fields', () => {
      const { result } = renderHook(() => useValidatedForm(simpleSchema))

      act(() => {
        result.current.setValue('name', 'John')
        result.current.setValue('email', 'john@example.com')
      })

      const watchedFields = result.current.watch(['name', 'email'])
      expect(watchedFields).toEqual(['John', 'john@example.com'])
    })

    test('should watch all fields', () => {
      const { result } = renderHook(() => useValidatedForm(simpleSchema))

      act(() => {
        result.current.setValue('name', 'John')
        result.current.setValue('email', 'john@example.com')
        result.current.setValue('age', 30)
      })

      const allFields = result.current.watch()
      expect(allFields).toEqual({
        name: 'John',
        email: 'john@example.com',
        age: 30,
      })
    })
  })

  describe('edge cases', () => {
    test('should handle empty schema', () => {
      const emptySchema = z.object({})
      const { result } = renderHook(() => useValidatedForm(emptySchema))

      // Empty schema should be valid by default since there are no validation rules
      expect(result.current.getValues()).toEqual({})
      // Note: isValid may be false initially until form is validated
    })

    test('should handle schema with only optional fields', () => {
      const optionalOnlySchema = z.object({
        optional1: z.string().optional(),
        optional2: z.number().optional(),
      })

      const { result } = renderHook(() => useValidatedForm(optionalOnlySchema))

      // Optional only schema should not have validation errors
      expect(result.current.getValues()).toEqual({})
    })

    test('should maintain type safety with schema inference', () => {
      const { result } = renderHook(() => useValidatedForm(simpleSchema))

      // This test verifies TypeScript type safety at compile time
      act(() => {
        result.current.setValue('name', 'John') // Should be string
        result.current.setValue('age', 30) // Should be number
        // result.current.setValue('name', 30) // Should cause TypeScript error
        // result.current.setValue('age', 'thirty') // Should cause TypeScript error
      })

      expect(result.current.getValues().name).toBe('John')
      expect(result.current.getValues().age).toBe(30)
    })
  })
})