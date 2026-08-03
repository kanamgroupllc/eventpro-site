import axios, { AxiosInstance, AxiosResponseHeaders, RawAxiosResponseHeaders } from "axios";
import { CsrfBootstrapError } from "@/lib/api-errors";

export interface CsrfTokenResponse {
  headerName: string;
  parameterName: string;
  token: string;
}

export interface ResolvedCsrfToken {
  headerName: string;
  token: string;
}

interface CsrfTokenManagerOptions {
  maxBootstrapAttempts?: number;
  wait?: (milliseconds: number) => Promise<void>;
}

/**
 * Keeps the browser CSRF token in memory. The matching cookie remains HttpOnly
 * and is managed by the browser through credentialed requests.
 */
export class CsrfTokenManager {
  private readonly bootstrapClient: AxiosInstance;
  private readonly maxBootstrapAttempts: number;
  private readonly wait: (milliseconds: number) => Promise<void>;
  private current: ResolvedCsrfToken | null = null;
  private pending: Promise<ResolvedCsrfToken> | null = null;
  private generation = 0;

  constructor(baseURL: string, options: CsrfTokenManagerOptions = {}) {
    this.bootstrapClient = axios.create({ baseURL, withCredentials: true });
    this.maxBootstrapAttempts = Math.max(1, options.maxBootstrapAttempts ?? 3);
    this.wait = options.wait ?? ((milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds)));
  }

  initialize(): Promise<ResolvedCsrfToken> {
    return this.getToken();
  }

  getToken(forceRefresh = false): Promise<ResolvedCsrfToken> {
    if (forceRefresh) {
      this.generation += 1;
      this.current = null;
      this.pending = null;
    }
    if (this.current) return Promise.resolve(this.current);
    if (this.pending) return this.pending;

    const generation = this.generation;
    const request = this.bootstrap(generation)
      .finally(() => {
        if (this.pending === request) this.pending = null;
      });
    this.pending = request;

    return this.pending;
  }

  private async bootstrap(generation: number): Promise<ResolvedCsrfToken> {
    for (let attempt = 1; attempt <= this.maxBootstrapAttempts; attempt += 1) {
      try {
        const response = await this.bootstrapClient.get<CsrfTokenResponse>("/api/v1/csrf");
        const data = response.data;
        if (!data?.headerName || !data?.token) {
          throw new Error("The server returned an invalid CSRF token response");
        }
        if (generation !== this.generation) throw new CsrfBootstrapError();
        this.current = { headerName: data.headerName, token: data.token };
        return this.current;
      } catch (error) {
        const status = axios.isAxiosError(error) ? error.response?.status : undefined;
        const retryable = axios.isAxiosError(error) && (!error.response || status === 502 || status === 503 || status === 504);
        if (!retryable || attempt === this.maxBootstrapAttempts) {
          throw new CsrfBootstrapError();
        }
        await this.wait(150 * 3 ** (attempt - 1));
      }
    }

    throw new CsrfBootstrapError();
  }

  updateFromResponse(headers: AxiosResponseHeaders | RawAxiosResponseHeaders): void {
    const headerName = this.current?.headerName ?? "X-XSRF-TOKEN";
    const headersWithGet = headers as AxiosResponseHeaders;
    const value = typeof headersWithGet.get === "function"
      ? headersWithGet.get(headerName)
      : headers[headerName.toLowerCase()];
    if (typeof value === "string" && value.length > 0) {
      this.generation += 1;
      this.pending = null;
      this.current = { headerName, token: value };
    }
  }

  clear(): void {
    this.generation += 1;
    this.current = null;
    this.pending = null;
  }
}

export function isUnsafeMethod(method?: string): boolean {
  return ["post", "put", "patch", "delete"].includes((method ?? "get").toLowerCase());
}

export function isCsrfFailureCode(code: unknown): boolean {
  return code === "CSRF_TOKEN_MISSING" || code === "CSRF_TOKEN_INVALID";
}
