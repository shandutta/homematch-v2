import React from 'react'
import { beforeEach, describe, expect, it, jest } from '@jest/globals'

const redirectMock = jest.fn((destination: string) => {
  throw new Error(`NEXT_REDIRECT:${destination}`)
})
const notFoundMock = jest.fn(() => {
  throw new Error('NEXT_NOT_FOUND')
})
const mockGetUser = jest.fn()
const mockGetUserProfile = jest.fn()
const mockGetUserProfileWithHousehold = jest.fn()
const mockGetUserActivitySummary = jest.fn()
const mockCreateUserProfile = jest.fn()
const mockUserServiceConstructor = jest.fn(() => ({
  getUserProfile: mockGetUserProfile,
  getUserProfileWithHousehold: mockGetUserProfileWithHousehold,
  getUserActivitySummary: mockGetUserActivitySummary,
  createUserProfile: mockCreateUserProfile,
}))
const mockLoadDashboardData = jest.fn()
const createClientMock = jest.fn()

jest.mock('next/navigation', () => ({
  __esModule: true,
  redirect: (destination: string) => redirectMock(destination),
  notFound: () => notFoundMock(),
}))

jest.mock('@/lib/supabase/server', () => ({
  __esModule: true,
  createClient: (...args: unknown[]) => createClientMock(...args),
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

jest.mock('@/components/profile/ProfilePageClient', () => ({
  __esModule: true,
  ProfilePageClient: () => React.createElement('div', null, 'profile'),
}))

jest.mock('@/components/settings/SettingsPageClient', () => ({
  __esModule: true,
  SettingsPageClient: () => React.createElement('div', null, 'settings'),
}))

jest.mock('@/components/property/PropertyDetailRouteModal', () => ({
  __esModule: true,
  PropertyDetailRouteModal: () =>
    React.createElement('div', null, 'property-detail'),
}))

jest.mock('@/app/household/create/CreateHouseholdForm', () => ({
  __esModule: true,
  CreateHouseholdForm: () => React.createElement('div', null, 'create-form'),
}))

jest.mock('@/app/household/join/JoinHouseholdForm', () => ({
  __esModule: true,
  JoinHouseholdForm: () => React.createElement('div', null, 'join-form'),
}))

import DashboardPage from '@/app/dashboard/page'
import CouplesPage from '@/app/couples/page'
import ProfilePage from '@/app/profile/page'
import SettingsPage from '@/app/settings/page'
import CreateHouseholdPage from '@/app/household/create/page'
import JoinHouseholdPage from '@/app/household/join/page'
import PropertyPage from '@/app/properties/[id]/page'

const buildAnonymousSupabaseStub = () => ({
  auth: {
    getUser: mockGetUser,
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        })),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      })),
    })),
  })),
})

describe('protected app pages auth redirects', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    redirectMock.mockImplementation((destination: string) => {
      throw new Error(`NEXT_REDIRECT:${destination}`)
    })
    notFoundMock.mockImplementation(() => {
      throw new Error('NEXT_NOT_FOUND')
    })
    mockUserServiceConstructor.mockImplementation(() => ({
      getUserProfile: mockGetUserProfile,
      getUserProfileWithHousehold: mockGetUserProfileWithHousehold,
      getUserActivitySummary: mockGetUserActivitySummary,
      createUserProfile: mockCreateUserProfile,
    }))
    createClientMock.mockResolvedValue(buildAnonymousSupabaseStub())
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    mockGetUserProfile.mockResolvedValue({ preferences: null })
    mockGetUserProfileWithHousehold.mockResolvedValue(null)
    mockGetUserActivitySummary.mockResolvedValue(null)
    mockCreateUserProfile.mockResolvedValue({ id: 'profile-1' })
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

  it('redirects anonymous profile requests to login with redirectTo preserved', async () => {
    await expect(ProfilePage()).rejects.toThrow(
      'NEXT_REDIRECT:/login?redirectTo=%2Fprofile'
    )

    expect(redirectMock).toHaveBeenCalledWith('/login?redirectTo=%2Fprofile')
    expect(mockGetUserProfileWithHousehold).not.toHaveBeenCalled()
  })

  it('redirects anonymous settings requests to login with redirectTo preserved', async () => {
    await expect(
      SettingsPage({ searchParams: Promise.resolve({}) })
    ).rejects.toThrow('NEXT_REDIRECT:/login?redirectTo=%2Fsettings')

    expect(redirectMock).toHaveBeenCalledWith('/login?redirectTo=%2Fsettings')
    expect(mockGetUserProfile).not.toHaveBeenCalled()
  })

  it('redirects anonymous settings requests with tab to login with redirectTo preserving the tab', async () => {
    await expect(
      SettingsPage({ searchParams: Promise.resolve({ tab: 'household' }) })
    ).rejects.toThrow(
      'NEXT_REDIRECT:/login?redirectTo=%2Fsettings%3Ftab%3Dhousehold'
    )

    expect(redirectMock).toHaveBeenCalledWith(
      '/login?redirectTo=%2Fsettings%3Ftab%3Dhousehold'
    )
  })

  it('redirects anonymous household/create requests to login with canonical redirectTo', async () => {
    await expect(CreateHouseholdPage()).rejects.toThrow(
      'NEXT_REDIRECT:/login?redirectTo=%2Fhousehold%2Fcreate'
    )

    expect(redirectMock).toHaveBeenCalledWith(
      '/login?redirectTo=%2Fhousehold%2Fcreate'
    )
  })

  it('redirects anonymous household/join requests to login with canonical redirectTo', async () => {
    await expect(JoinHouseholdPage()).rejects.toThrow(
      'NEXT_REDIRECT:/login?redirectTo=%2Fhousehold%2Fjoin'
    )

    expect(redirectMock).toHaveBeenCalledWith(
      '/login?redirectTo=%2Fhousehold%2Fjoin'
    )
  })

  it('redirects anonymous property detail requests to login with redirectTo preserving id and query', async () => {
    await expect(
      PropertyPage({
        params: Promise.resolve({ id: 'abc-123' }),
        searchParams: Promise.resolve({ src: 'feed' }),
      })
    ).rejects.toThrow(
      'NEXT_REDIRECT:/login?redirectTo=%2Fproperties%2Fabc-123%3Fsrc%3Dfeed'
    )

    expect(redirectMock).toHaveBeenCalledWith(
      '/login?redirectTo=%2Fproperties%2Fabc-123%3Fsrc%3Dfeed'
    )
  })

  it('does not drop redirectTo to a bare /login on any covered protected page', async () => {
    const calls: Array<() => Promise<unknown>> = [
      () => DashboardPage({ searchParams: Promise.resolve({}) }),
      () => CouplesPage({ searchParams: Promise.resolve({}) }),
      () => ProfilePage(),
      () => SettingsPage({ searchParams: Promise.resolve({}) }),
      () => CreateHouseholdPage(),
      () => JoinHouseholdPage(),
      () =>
        PropertyPage({
          params: Promise.resolve({ id: 'p1' }),
          searchParams: Promise.resolve({}),
        }),
    ]

    for (const invoke of calls) {
      redirectMock.mockClear()
      await expect(invoke()).rejects.toThrow(/NEXT_REDIRECT:/)
      const destinations = redirectMock.mock.calls.map((args) => args[0])
      expect(destinations.length).toBeGreaterThan(0)
      for (const destination of destinations) {
        expect(destination).toMatch(/^\/login\?redirectTo=/)
        expect(destination).not.toBe('/login')
      }
    }
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
