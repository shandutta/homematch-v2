import { describe, it, expect, afterEach, jest } from '@jest/globals'
import {
  CouplesMessages,
  getEmptyStateText,
  getMilestoneMessage,
  getPropertyActionText,
  getRandomEncouragement,
  getStreakMessage,
} from '@/lib/utils/couples-messaging'

describe('couples messaging utilities', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('returns a random encouragement from the requested category', () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0)

    expect(getRandomEncouragement('progress')).toBe(
      CouplesMessages.encouragement.progress[0]
    )
    expect(getRandomEncouragement()).toBe(
      CouplesMessages.encouragement.swiping[0]
    )

    randomSpy.mockRestore()
  })

  it('returns milestone messaging based on counts', () => {
    expect(getMilestoneMessage(1)).toBe(CouplesMessages.success.firstMatch)
    expect(getMilestoneMessage(5)).toBe(CouplesMessages.success.milestone[5])
    expect(getMilestoneMessage(10)).toBe(CouplesMessages.success.milestone[10])
    expect(getMilestoneMessage(25)).toBe(CouplesMessages.success.milestone[25])
    expect(getMilestoneMessage(2)).toBe(CouplesMessages.success.mutualLike)
  })

  it('returns streak messaging based on days', () => {
    expect(getStreakMessage(14)).toBe(CouplesMessages.success.streak[14])
    expect(getStreakMessage(7)).toBe(CouplesMessages.success.streak[7])
    expect(getStreakMessage(3)).toBe(CouplesMessages.success.streak[3])
    expect(getStreakMessage(2)).toBe('2 days of searching together!')
  })

  it('returns property action text based on state', () => {
    expect(getPropertyActionText(true, true)).toBe('Everyone liked this!')
    expect(getPropertyActionText(true, false)).toBe(
      'A household member might like this too'
    )
    expect(getPropertyActionText(false)).toBe(
      'Save this for when someone else joins'
    )
  })

  it('returns empty state text by state', () => {
    expect(getEmptyStateText('loading', 'activity')).toBe(
      CouplesMessages.loading.activity
    )
    expect(getEmptyStateText('loading', 'unknown')).toBe(
      CouplesMessages.loading.general
    )
    expect(getEmptyStateText('empty')).toBe(CouplesMessages.empty.noLikes)
    expect(getEmptyStateText('error')).toBe(CouplesMessages.error.general)
  })
})
