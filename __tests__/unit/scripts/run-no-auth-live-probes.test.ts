const {
  DEFAULT_BASE_URL,
  ALLOWED_LOCAL_HOSTS,
  assertLocalBaseUrl,
  isLocalServerReady,
  runMain,
} = require('../../../scripts/run-no-auth-live-probes.js')

describe('run-no-auth-live-probes wrapper readiness', () => {
  describe('assertLocalBaseUrl', () => {
    it('exposes the documented local-only allow-list and 127.0.0.1:3000 default', () => {
      expect(DEFAULT_BASE_URL).toBe('http://127.0.0.1:3000')
      expect(ALLOWED_LOCAL_HOSTS).toEqual(['127.0.0.1', 'localhost', '::1'])
    })

    it.each([
      ['http://127.0.0.1:3000'],
      ['http://127.0.0.1:3100'],
      ['http://localhost:3000'],
      ['http://localhost:3100'],
      ['http://[::1]:3000'],
      ['http://[::1]:3100'],
    ])('accepts documented local URL %s including alternate port 3100', (url) => {
      expect(() => assertLocalBaseUrl(url)).not.toThrow()
    })

    it.each([
      ['https://example.com'],
      ['https://homematch.pro'],
      ['https://app.homematch.pro:3000'],
      ['http://10.0.0.1:3000'],
      ['http://192.168.1.10:3100'],
      ['http://prod-server:3000'],
      ['http://127.0.0.1.evil.example:3000'],
      ['http://localhost.evil.example:3000'],
    ])('refuses non-local URL %s with explicit local-only message', (url) => {
      expect(() => assertLocalBaseUrl(url)).toThrow(
        /Refusing no-auth live probes against non-local URL/
      )
    })
  })

  describe('isLocalServerReady', () => {
    it('returns false when fetch rejects (no local server up)', async () => {
      const fetchImpl = jest
        .fn()
        .mockRejectedValue(new Error('connect ECONNREFUSED'))

      const ready = await isLocalServerReady('http://127.0.0.1:3100', {
        timeoutMs: 50,
        fetchImpl,
      })

      expect(ready).toBe(false)
      expect(fetchImpl).toHaveBeenCalledTimes(1)
      const [calledUrl, init] = fetchImpl.mock.calls[0]
      expect(calledUrl).toBeInstanceOf(URL)
      expect(calledUrl.toString()).toBe('http://127.0.0.1:3100/api/health')
      expect(init.method).toBe('GET')
      expect(init.redirect).toBe('manual')
      expect(init.headers.accept).toBe('application/json')
    })

    it('returns true when local /api/health responds with a non-5xx status', async () => {
      const fetchImpl = jest.fn().mockResolvedValue({ status: 200 })

      const ready = await isLocalServerReady('http://127.0.0.1:3100', {
        timeoutMs: 50,
        fetchImpl,
      })

      expect(ready).toBe(true)
    })

    it('returns false when local /api/health responds 5xx', async () => {
      const fetchImpl = jest.fn().mockResolvedValue({ status: 503 })

      const ready = await isLocalServerReady('http://127.0.0.1:3100', {
        timeoutMs: 50,
        fetchImpl,
      })

      expect(ready).toBe(false)
    })
  })

  describe('runMain', () => {
    it('exits 1 with an explicit ERROR log when base URL is non-local; does not spawn vitest', async () => {
      const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() }
      const exit = jest.fn()
      const spawn = jest.fn()
      const readyCheck = jest.fn()

      await runMain({
        env: { NO_AUTH_LIVE_PROBES_BASE_URL: 'https://example.com' },
        logger,
        exit,
        spawn,
        readyCheck,
      })

      expect(exit).toHaveBeenCalledWith(1)
      expect(spawn).not.toHaveBeenCalled()
      expect(readyCheck).not.toHaveBeenCalled()
      const errMessage = logger.error.mock.calls.map((c) => c[0]).join('\n')
      expect(errMessage).toContain('[p0-no-auth-live-probes] ERROR')
      expect(errMessage).toContain('Refusing no-auth live probes against non-local URL')
    })

    it('exits 0 with explicit SKIP log when no local server responds; does not spawn vitest', async () => {
      const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() }
      const exit = jest.fn()
      const spawn = jest.fn()
      const readyCheck = jest.fn().mockResolvedValue(false)

      await runMain({
        env: { NO_AUTH_LIVE_PROBES_BASE_URL: 'http://127.0.0.1:3100' },
        logger,
        exit,
        spawn,
        readyCheck,
      })

      expect(exit).toHaveBeenCalledWith(0)
      expect(spawn).not.toHaveBeenCalled()
      const skipMessage = logger.log.mock.calls.map((c) => c[0]).join('\n')
      expect(skipMessage).toContain('[p0-no-auth-live-probes] SKIP')
      expect(skipMessage).toContain('http://127.0.0.1:3100')
      expect(skipMessage).toContain('start the local app before running live probes')
    })

    it('spawns vitest with NO_AUTH_LIVE_PROBES_RUN=1 only when ready and base URL is local', async () => {
      const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() }
      const exit = jest.fn()
      const spawn = jest.fn().mockReturnValue({ status: 0 })
      const readyCheck = jest.fn().mockResolvedValue(true)

      await runMain({
        env: { NO_AUTH_LIVE_PROBES_BASE_URL: 'http://127.0.0.1:3100' },
        logger,
        exit,
        spawn,
        readyCheck,
      })

      expect(spawn).toHaveBeenCalledTimes(1)
      const [cmd, args, options] = spawn.mock.calls[0]
      expect(cmd).toBe('pnpm')
      expect(args).toEqual([
        'exec',
        'vitest',
        'run',
        '__tests__/integration/routing/no-auth-live-probe.spec.ts',
        '--config',
        'vitest.config.ts',
      ])
      expect(options.env.NO_AUTH_LIVE_PROBES_RUN).toBe('1')
      expect(options.env.NO_AUTH_LIVE_PROBES_BASE_URL).toBe(
        'http://127.0.0.1:3100'
      )
      expect(exit).toHaveBeenCalledWith(0)
    })

    it('uses 127.0.0.1:3000 as the documented default base URL', async () => {
      const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() }
      const exit = jest.fn()
      const spawn = jest.fn()
      const readyCheck = jest.fn().mockResolvedValue(false)

      await runMain({ env: {}, logger, exit, spawn, readyCheck })

      expect(readyCheck).toHaveBeenCalledWith('http://127.0.0.1:3000', {
        timeoutMs: 2000,
      })
      expect(exit).toHaveBeenCalledWith(0)
    })
  })
})
