import {
  jest,
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
} from '@jest/globals'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useCurrentUserAvatar } from '@/hooks/useCurrentUserAvatar'

// Mock supabase client
const mockGetUser = jest.fn()
const mockSelect = jest.fn()
const mockEq = jest.fn()
const mockSingle = jest.fn()
const mockOnAuthStateChange = jest.fn()
const mockUnsubscribe = jest.fn()

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
      onAuthStateChange: mockOnAuthStateChange,
    },
    from: () => ({
      select: mockSelect,
    }),
  }),
}))

describe('useCurrentUserAvatar', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Setup chain for profile query
    mockSelect.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ single: mockSingle })

    // Default auth state change subscription
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    })
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('Loading State', () => {
    test('returns isLoading=true initially', () => {
      // Setup getUser to return a pending promise
      mockGetUser.mockReturnValue(new Promise(() => {}))

      const { result } = renderHook(() => useCurrentUserAvatar())

      expect(result.current.isLoading).toBe(true)
    })
  })

  describe('Fetching User Data', () => {
    test('fetches user and profile on mount', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      }

      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
      })

      mockSingle.mockResolvedValue({
        data: {
          preferences: {
            display_name: 'John Doe',
            avatar: { type: 'preset', value: 'fox' },
          },
        },
      })

      const { result } = renderHook(() => useCurrentUserAvatar())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(mockGetUser).toHaveBeenCalled()
      expect(mockSelect).toHaveBeenCalledWith('preferences')
      expect(mockEq).toHaveBeenCalledWith('id', 'user-123')
    })

    test('returns avatar data when profile has avatar', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      }

      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
      })

      mockSingle.mockResolvedValue({
        data: {
          preferences: {
            display_name: 'John Doe',
            avatar: { type: 'preset', value: 'fox' },
          },
        },
      })

      const { result } = renderHook(() => useCurrentUserAvatar())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.avatar).toEqual({ type: 'preset', value: 'fox' })
    })

    test('returns null avatar when profile has no avatar', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      }

      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
      })

      mockSingle.mockResolvedValue({
        data: {
          preferences: {
            display_name: 'John Doe',
          },
        },
      })

      const { result } = renderHook(() => useCurrentUserAvatar())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.avatar).toBeNull()
    })

    test('returns displayName from preferences', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: {},
      }

      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
      })

      mockSingle.mockResolvedValue({
        data: {
          preferences: {
            display_name: 'Custom Name',
          },
        },
      })

      const { result } = renderHook(() => useCurrentUserAvatar())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.displayName).toBe('Custom Name')
    })

    test('falls back to user metadata full_name when no display_name', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { full_name: 'Metadata Name' },
      }

      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
      })

      mockSingle.mockResolvedValue({
        data: {
          preferences: {},
        },
      })

      const { result } = renderHook(() => useCurrentUserAvatar())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.displayName).toBe('Metadata Name')
    })

    test('falls back to email for displayName', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      }

      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
      })

      mockSingle.mockResolvedValue({
        data: {
          preferences: {},
        },
      })

      const { result } = renderHook(() => useCurrentUserAvatar())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.displayName).toBe('test')
    })

    test('returns email', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      }

      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
      })

      mockSingle.mockResolvedValue({
        data: {
          preferences: {},
        },
      })

      const { result } = renderHook(() => useCurrentUserAvatar())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.email).toBe('test@example.com')
    })
  })

  describe('No User', () => {
    test('returns null values when no user is authenticated', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
      })

      const { result } = renderHook(() => useCurrentUserAvatar())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.displayName).toBeNull()
      expect(result.current.email).toBeNull()
      expect(result.current.avatar).toBeNull()
    })
  })

  describe('Auth State Changes', () => {
    test('subscribes to auth state changes', () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
      })

      renderHook(() => useCurrentUserAvatar())

      expect(mockOnAuthStateChange).toHaveBeenCalled()
    })

    test('unsubscribes on unmount', () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
      })

      const { unmount } = renderHook(() => useCurrentUserAvatar())

      unmount()

      expect(mockUnsubscribe).toHaveBeenCalled()
    })

    test('refetches data on auth state change', async () => {
      let authCallback: () => void

      mockOnAuthStateChange.mockImplementation((callback) => {
        authCallback = callback
        return {
          data: { subscription: { unsubscribe: mockUnsubscribe } },
        }
      })

      mockGetUser.mockResolvedValue({
        data: { user: null },
      })

      const { result } = renderHook(() => useCurrentUserAvatar())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Reset mock to track new calls
      mockGetUser.mockClear()
      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: 'new-user',
            email: 'new@example.com',
          },
        },
      })

      mockSingle.mockResolvedValue({
        data: { preferences: {} },
      })

      // Trigger auth state change
      act(() => {
        authCallback()
      })

      await waitFor(() => {
        expect(mockGetUser).toHaveBeenCalled()
      })
    })
  })

  describe('Error Handling', () => {
    test('handles fetch errors gracefully', async () => {
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      mockGetUser.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useCurrentUserAvatar())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should not throw, just log error and set isLoading to false
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    test('handles profile fetch errors gracefully', async () => {
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      mockGetUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
          },
        },
      })

      mockSingle.mockRejectedValue(new Error('Database error'))

      const { result } = renderHook(() => useCurrentUserAvatar())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('Custom Avatar Types', () => {
    test('handles custom avatar URLs', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      }

      const customUrl =
        'https://storage.example.com/avatars/user-123/avatar.png'

      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
      })

      mockSingle.mockResolvedValue({
        data: {
          preferences: {
            display_name: 'John',
            avatar: { type: 'custom', value: customUrl },
          },
        },
      })

      const { result } = renderHook(() => useCurrentUserAvatar())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.avatar).toEqual({
        type: 'custom',
        value: customUrl,
      })
    })
  })
})
