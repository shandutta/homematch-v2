import { InteractionService } from '@/lib/services/interactions';
import type { Interaction, InteractionSummary, PageResponse, InteractionType } from '@/types/app';

const originalFetch = global.fetch;

describe('InteractionService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch as any;
  });

  describe('recordInteraction', () => {
    test('success: returns created interaction', async () => {
      const mockInteraction: Interaction = {
        userId: 'u1',
        propertyId: 'p1',
        type: 'liked',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ interaction: mockInteraction }),
      } as any);

      const res = await InteractionService.recordInteraction('p1', 'liked');
      expect(res).toEqual(mockInteraction);
      expect(global.fetch).toHaveBeenCalledWith('/api/interactions', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }));
      const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      expect(body).toEqual({ propertyId: 'p1', type: 'liked' });
    });

    test('error: throws with status and body text', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal error',
      } as any);

      await expect(InteractionService.recordInteraction('p1', 'viewed'))
        .rejects.toThrow('Failed to record interaction (500): Internal error');
    });
  });

  describe('getInteractionSummary', () => {
    test('success: returns parsed summary', async () => {
      const mockSummary: InteractionSummary = { viewed: 10, liked: 5, passed: 2 };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockSummary,
      } as any);

      const res = await InteractionService.getInteractionSummary();
      expect(res).toEqual(mockSummary);
      expect(global.fetch).toHaveBeenCalledWith('/api/interactions?type=summary', { method: 'GET' });
    });

    test('error: throws on non-2xx', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => 'Not found',
      } as any);

      await expect(InteractionService.getInteractionSummary())
        .rejects.toThrow('Failed to fetch interaction summary (404): Not found');
    });

    test('error: throws on invalid payload shape', async () => {
      // Missing a required key or wrong type triggers zod failure
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ viewed: 1, liked: 'oops', passed: 0 }),
      } as any);

      await expect(InteractionService.getInteractionSummary())
        .rejects.toThrow('Invalid summary payload');
    });
  });

  describe('getInteractions', () => {
    test('success: builds query params and returns page response', async () => {
      const mockResponse: PageResponse<{ id: string }> = {
        items: [{ id: 'p1' }, { id: 'p2' }],
        nextCursor: 'cursor-2',
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as any);

      const res = await InteractionService.getInteractions('viewed', { cursor: 'cursor-1', limit: 25 });
      expect(res).toEqual(mockResponse);

      const urlCalled = (global.fetch as jest.Mock).mock.calls[0][0] as string;
      expect(urlCalled).toContain('/api/interactions?');
      // Verify params
      const qs = urlCalled.split('?')[1];
      const params = new URLSearchParams(qs);
      expect(params.get('type')).toBe('viewed');
      expect(params.get('cursor')).toBe('cursor-1');
      expect(params.get('limit')).toBe('25');
    });

    test('success: omits cursor when not provided, defaults limit to 12', async () => {
      const mockResponse: PageResponse<{ id: string }> = {
        items: [{ id: 'p1' }],
        nextCursor: null,
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as any);

      await InteractionService.getInteractions('liked', {});
      const urlCalled = (global.fetch as jest.Mock).mock.calls[0][0] as string;
      const qs = urlCalled.split('?')[1];
      const params = new URLSearchParams(qs);
      expect(params.get('type')).toBe('liked');
      expect(params.get('cursor')).toBeNull();
      expect(params.get('limit')).toBe('12');
    });

    test('error: throws with status and body', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Bad request',
      } as any);

      const passed: InteractionType = 'skip';
      await expect(InteractionService.getInteractions(passed, { limit: 5 }))
        .rejects.toThrow('Failed to fetch interactions (400): Bad request');
    });
  });
});
