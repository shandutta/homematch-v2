import React from 'react'
import { beforeEach, describe, expect, it, jest } from '@jest/globals'

const redirectMock = jest.fn((destination: string) => {
  throw new Error(`NEXT_REDIRECT:${destination}`)
})
const mockGetUser = jest.fn()
const mockGetUserProfile = jest.fn()
const mockUserServiceConstructor = jest.fn(() => ({
  getUserProfile: mockGetUserProfile,
}))
const mockLoadDashboardData = jest.fn()

jest.mock('next/navigation', () => ({
  __esModule: true,
  redirect: (destination: string) => redirectMock(destination),
}))

jest.mock('@/lib/supabase/server', () => ({
  __esModule: true,
  createClient: jest.fn(),
}))

jest.mock('@/lib/services/users', () => ({
  __esModule: true,
  UserService: mockUserServiceConstructor,
}))

jest.mock('@/lib/data/loader', () => ({
  __esModule: true,
  DASHBOARD_PROPERTY_SELECT: 'id',
  loadDashboardData: mockLoadDashboardData,
}))

jest.mock('@/components/dashboard/EnhancedDashboardPageImpl', () => ({
  __esModule: true,
  EnhancedDashboardPageImpl: () => React.createElement('div', null, 'dashboard'),
}))

jest.mock('@/components/dashboard/DashboardErrorBoundary', () => ({
  __esModule: true,
  DashboardErrorBoundary: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}))

jest.mock('@/components/couples/CouplesPageClient', () => ({
  __esModule: true,
  CouplesPageClient: () => React.createElement('div', null, 'couples'),
}))

import { createClient } from '@/lib/supabase/server'
import DashboardPage from '@/app/dashboard/page'
import CouplesPage from '@/app/couples/page'

const mockedCreateClient = jest.mocked(createClient)

describe('protected app pages auth redirects', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    redirectMock.mockImplementation((destination: string) => {
      throw new Error(`NEXT_REDIRECT:${destination}`)
    })
    mockUserServiceConstructor.mockImplementation(() => ({
      getUserProfile: mockGetUserProfile,
    }))
    mockedCreateClient.mockResolvedValue({
      auth: {
        getUser: mockGetUser,
      },
    } as Awaited<ReturnType<typeof createClient>>)
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    mockGetUserProfile.mockResolvedValue({ preferences: null })
    mockLoadDashboardData.mockResolvedValue({ properties: [] })
  })

  it('redirects anonymous dashboard requests to login with redirectTo preserved', async () => {
    await expect(
      DashboardPage({
        searchParams: Promise.resolve({ tab: 'liked' }),
      })
    ).rejects.toThrow('NEXT_REDIRECT:/login?redirectTo=%2Fdashboard%3Ftab%3Dliked')

    expect(redirectMock).toHaveBeenCalledWith(
      '/login?redirectTo=%2Fdashboard%3Ftab%3Dliked'
    )
    expect(mockLoadDashboardData).not.toHaveBeenCalled()
  })

  it('redirects anonymous couples requests to login with redirectTo preserved', async () => {
    await expect(
      CouplesPage({
        searchParams: Promise.resolve({ tab: 'activity' }),
      })
    ).rejects.toThrow('NEXT_REDIRECT:/login?redirectTo=%2Fcouples%3Ftab%3Dactivity')

    expect(redirectMock).toHaveBeenCalledWith(
      '/login?redirectTo=%2Fcouples%3Ftab%3Dactivity'
    )
  })

  it('allows authenticated dashboard and couples pages through', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    await expect(
      DashboardPage({ searchParams: Promise.resolve({}) })
    ).resolves.toBeTruthy()
    await expect(
      CouplesPage({ searchParams: Promise.resolve({}) })
    ).resolves.toBeTruthy()

    expect(redirectMock).not.toHaveBeenCalled()
    expect(mockLoadDashboardData).toHaveBeenCalledWith(
      expect.objectContaining({ cacheKey: 'user-1' })
    )
  })
})
