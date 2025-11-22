import { describe, test, expect, jest, beforeEach } from '@jest/globals'
import { toast } from '@/lib/utils/toast'

const successMock = jest.fn()
const errorMock = jest.fn()
const infoMock = jest.fn()

jest.mock('sonner', () => ({
  __esModule: true,
  toast: {
    success: (...args: unknown[]) => successMock(...args),
    error: (...args: unknown[]) => errorMock(...args),
    info: (...args: unknown[]) => infoMock(...args),
  },
}))

describe('toast helper', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('success forwards message and description', () => {
    toast.success('msg', 'desc')
    expect(successMock).toHaveBeenCalledWith('msg', {
      description: 'desc',
      duration: 4000,
    })
  })

  test('mutualLike formats description with partner name', () => {
    toast.mutualLike('123 Main St', 'Alex')
    expect(successMock).toHaveBeenCalledWith("💕 It's a Match!", {
      description: 'You and Alex both liked 123 Main St!',
      duration: 8000,
    })
  })

  test('networkError uses error toast', () => {
    toast.networkError()
    expect(errorMock).toHaveBeenCalled()
  })
})
