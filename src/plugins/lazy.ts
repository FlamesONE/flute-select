import type { LazyConfig, LoadResult, SelectOption } from '../types';
import { LAZY_DEFAULTS } from '../constants';
import { getByPath } from '../utils/dom';

export class LazyLoader {
  private readonly config: LazyConfig;
  private readonly url: string;
  private abortController: AbortController | null = null;

  constructor(url: string, partial: Partial<LazyConfig>) {
    this.url = url;
    this.config = { ...LAZY_DEFAULTS, ...partial };
  }

  async load(page: number, query: string): Promise<LoadResult> {
    this.abort();
    this.abortController = new AbortController();

    const params = new URLSearchParams();
    if (query) {
      params.set(this.config.searchParam, query);
    }
    params.set(this.config.pageParam, String(page));
    params.set(this.config.pageSizeParam, String(this.config.pageSize));

    const sep = this.url.includes('?') ? '&' : '?';
    const fullUrl = `${this.url}${sep}${params.toString()}`;

    const response = await fetch(fullUrl, {
      signal: this.abortController.signal,
      headers: {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...this.config.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const json: unknown = await response.json();
    const options = this.extractOptions(json);
    const hasMore = this.determineHasMore(json, page, options.length);

    return { options, hasMore };
  }

  abort(): void {
    this.abortController?.abort();
    this.abortController = null;
  }

  get debounceMs(): number {
    return this.config.debounce;
  }

  get shouldLoadOnInit(): boolean {
    return this.config.loadOnInit;
  }

  destroy(): void {
    this.abort();
  }

  private extractOptions(json: unknown): SelectOption[] {
    if (this.config.transformResponse) {
      return this.config.transformResponse(json);
    }

    const data = getByPath(json, this.config.dataPath);
    if (!Array.isArray(data)) {
      console.warn('[FluteSelect] LazyLoader: expected array at', this.config.dataPath);
      return [];
    }
    return data as SelectOption[];
  }

  private determineHasMore(json: unknown, page: number, loadedCount: number): boolean {
    const lastPage = getByPath(json, this.config.lastPagePath);
    if (lastPage !== undefined) {
      return page < Number(lastPage);
    }

    const total = getByPath(json, this.config.totalPath);
    if (total !== undefined) {
      return loadedCount >= this.config.pageSize;
    }

    return loadedCount >= this.config.pageSize;
  }
}
