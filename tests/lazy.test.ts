import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mockFetch } from './setup';

vi.mock('@floating-ui/dom', () => ({
  computePosition: vi.fn(() => Promise.resolve({ x: 0, y: 100 })),
  autoUpdate: vi.fn((_ref: Element, _floating: Element, cb: () => void) => {
    cb();
    return vi.fn();
  }),
  flip: vi.fn(() => ({ name: 'flip', fn: () => ({}) })),
  shift: vi.fn(() => ({ name: 'shift', fn: () => ({}) })),
  offset: vi.fn(() => ({ name: 'offset', fn: () => ({}) })),
  size: vi.fn(() => ({ name: 'size', fn: () => ({}) })),
}));

import { LazyLoader } from '../src/plugins/lazy';
import { FluteSelect } from '../src/core/core';
import { createAnchor, getVisibleOptions } from './helpers';

function mockJsonResponse(data: unknown, ok = true): void {
  mockFetch.mockResolvedValueOnce({
    ok,
    status: ok ? 200 : 500,
    statusText: ok ? 'OK' : 'Internal Server Error',
    json: () => Promise.resolve(data),
  } as Response);
}

describe('LazyLoader (unit)', () => {
  afterEach(() => {
    mockFetch.mockReset();
  });

  it('builds correct URL with params', async () => {
    mockJsonResponse({
      data: [{ value: '1', label: 'One' }],
      meta: { last_page: 1 },
    });

    const loader = new LazyLoader('/api/items', {
      searchParam: 'search',
      pageParam: 'p',
      pageSizeParam: 'limit',
      pageSize: 10,
    });

    await loader.load(2, 'hello');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const url = mockFetch.mock.calls[0]![0] as string;
    expect(url).toContain('/api/items?');
    expect(url).toContain('search=hello');
    expect(url).toContain('p=2');
    expect(url).toContain('limit=10');
  });

  it('uses & separator if URL already has params', async () => {
    mockJsonResponse({ data: [], meta: { last_page: 1 } });

    const loader = new LazyLoader('/api/items?type=fruit', {});
    await loader.load(1, '');

    const url = mockFetch.mock.calls[0]![0] as string;
    expect(url).toContain('/api/items?type=fruit&');
  });

  it('uses transformResponse when provided', async () => {
    mockJsonResponse({ results: [{ id: 5, name: 'Five' }] });

    const loader = new LazyLoader('/api/items', {
      transformResponse: (data: any) =>
        data.results.map((r: any) => ({ value: String(r.id), label: r.name })),
    });

    const result = await loader.load(1, '');
    expect(result.options).toHaveLength(1);
    expect(result.options[0]!.value).toBe('5');
    expect(result.options[0]!.label).toBe('Five');
  });

  it('determines hasMore from lastPagePath', async () => {
    mockJsonResponse({
      data: [{ value: '1', label: 'A' }],
      meta: { last_page: 3 },
    });

    const loader = new LazyLoader('/api', {});
    const result = await loader.load(1, '');
    expect(result.hasMore).toBe(true);

    mockJsonResponse({
      data: [{ value: '2', label: 'B' }],
      meta: { last_page: 3 },
    });
    const result2 = await loader.load(3, '');
    expect(result2.hasMore).toBe(false);
  });

  it('throws on non-ok response', async () => {
    mockJsonResponse({}, false);
    const loader = new LazyLoader('/api', {});
    await expect(loader.load(1, '')).rejects.toThrow('HTTP 500');
  });

  it('sends custom headers', async () => {
    mockJsonResponse({ data: [], meta: { last_page: 1 } });
    const loader = new LazyLoader('/api', {
      headers: { Authorization: 'Bearer token123' },
    });
    await loader.load(1, '');

    const opts = mockFetch.mock.calls[0]![1] as RequestInit;
    expect((opts.headers as Record<string, string>).Authorization).toBe('Bearer token123');
  });

  it('abort() cancels pending request', () => {
    const abortSpy = vi.spyOn(AbortController.prototype, 'abort');
    const loader = new LazyLoader('/api', {});
    mockFetch.mockReturnValueOnce(new Promise(() => {}));
    void loader.load(1, '');
    loader.abort();
    expect(abortSpy).toHaveBeenCalled();
    abortSpy.mockRestore();
  });

  it('destroy() calls abort', () => {
    const loader = new LazyLoader('/api', {});
    const abortSpy = vi.spyOn(loader, 'abort');
    loader.destroy();
    expect(abortSpy).toHaveBeenCalled();
  });

  it('debounceMs returns config value', () => {
    const loader = new LazyLoader('/api', { debounce: 500 });
    expect(loader.debounceMs).toBe(500);
  });

  it('shouldLoadOnInit returns config value', () => {
    const loader = new LazyLoader('/api', { loadOnInit: true });
    expect(loader.shouldLoadOnInit).toBe(true);
  });

  it('omits search param when query is empty', async () => {
    mockJsonResponse({ data: [], meta: { last_page: 1 } });
    const loader = new LazyLoader('/api', {});
    await loader.load(1, '');
    const url = mockFetch.mock.calls[0]![0] as string;
    expect(url).not.toContain('q=');
  });
});

describe('FluteSelect — lazy loading integration', () => {
  let anchor: HTMLDivElement;

  beforeEach(() => {
    anchor = createAnchor();
    mockFetch.mockReset();
  });
  afterEach(() => {
    FluteSelect.destroyAll();
    document.body.innerHTML = '';
  });

  it('loads data on first open when source is set', async () => {
    mockJsonResponse({
      data: [
        { value: 'a', label: 'Alpha' },
        { value: 'b', label: 'Beta' },
      ],
      meta: { last_page: 1 },
    });

    const s = FluteSelect.create(anchor, { source: '/api/test' });
    s.open();

    await vi.waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    await vi.waitFor(() => {
      const opts = getVisibleOptions();
      expect(opts.length).toBe(2);
    });

    expect(s.getOption('a')?.label).toBe('Alpha');
  });

  it('does not fetch if options are already loaded', async () => {
    mockJsonResponse({
      data: [{ value: 'x', label: 'X' }],
      meta: { last_page: 1 },
    });

    const s = FluteSelect.create(anchor, { source: '/api/test' });
    s.open();
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    s.close();
    s.open();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('emits load event after fetching', async () => {
    mockJsonResponse({
      data: [{ value: 'a', label: 'A' }],
      meta: { last_page: 1 },
    });

    const handler = vi.fn();
    const s = FluteSelect.create(anchor, { source: '/api/test' });
    s.on('load', handler);
    s.open();

    await vi.waitFor(() => {
      expect(handler).toHaveBeenCalledWith({
        options: [expect.objectContaining({ value: 'a' })],
        page: 1,
      });
    });
  });
});
