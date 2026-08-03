import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CsrfTokenManager, isCsrfFailureCode, isUnsafeMethod } from "@/lib/csrf";

vi.mock("axios", () => ({
  default: {
    create: vi.fn(),
    isAxiosError: vi.fn((error: { isAxiosError?: boolean }) => Boolean(error?.isAxiosError)),
  },
}));

describe("CsrfTokenManager", () => {
  const get = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(axios.create).mockReturnValue({ get } as never);
  });

  it("shares one bootstrap request across concurrent callers", async () => {
    get.mockResolvedValue({
      data: { headerName: "X-XSRF-TOKEN", parameterName: "_csrf", token: "token-1" },
    });
    const manager = new CsrfTokenManager("");

    const [first, second] = await Promise.all([manager.getToken(), manager.getToken()]);

    expect(get).toHaveBeenCalledTimes(1);
    expect(first).toEqual(second);
    expect(first.token).toBe("token-1");
  });

  it("force refresh replaces the in-memory token", async () => {
    get
      .mockResolvedValueOnce({
        data: { headerName: "X-XSRF-TOKEN", parameterName: "_csrf", token: "token-1" },
      })
      .mockResolvedValueOnce({
        data: { headerName: "X-XSRF-TOKEN", parameterName: "_csrf", token: "token-2" },
      });
    const manager = new CsrfTokenManager("");

    await manager.getToken();
    const refreshed = await manager.getToken(true);

    expect(get).toHaveBeenCalledTimes(2);
    expect(refreshed.token).toBe("token-2");
  });

  it("accepts the rotated token from a login response header", async () => {
    get.mockResolvedValue({
      data: { headerName: "X-XSRF-TOKEN", parameterName: "_csrf", token: "token-1" },
    });
    const manager = new CsrfTokenManager("");
    await manager.getToken();

    manager.updateFromResponse({ "x-xsrf-token": "rotated" });

    await expect(manager.getToken()).resolves.toEqual({
      headerName: "X-XSRF-TOKEN",
      token: "rotated",
    });
  });

  it("does not let an older bootstrap overwrite a rotated login token", async () => {
    let resolveBootstrap!: (value: unknown) => void;
    get.mockReturnValue(new Promise((resolve) => {
      resolveBootstrap = resolve;
    }));
    const manager = new CsrfTokenManager("");
    const originalBootstrap = manager.getToken();

    manager.updateFromResponse({ "x-xsrf-token": "rotated" });
    resolveBootstrap({
      data: { headerName: "X-XSRF-TOKEN", parameterName: "_csrf", token: "stale" },
    });

    await expect(originalBootstrap).rejects.toMatchObject({ name: "CsrfBootstrapError" });
    await expect(manager.getToken()).resolves.toEqual({
      headerName: "X-XSRF-TOKEN",
      token: "rotated",
    });
  });

  it("invalidates an in-flight bootstrap when the session is cleared", async () => {
    let resolveBootstrap!: (value: unknown) => void;
    get.mockReturnValueOnce(new Promise((resolve) => {
      resolveBootstrap = resolve;
    })).mockResolvedValueOnce({
      data: { headerName: "X-XSRF-TOKEN", parameterName: "_csrf", token: "fresh" },
    });
    const manager = new CsrfTokenManager("");
    const originalBootstrap = manager.getToken();

    manager.clear();
    resolveBootstrap({
      data: { headerName: "X-XSRF-TOKEN", parameterName: "_csrf", token: "stale" },
    });

    await expect(originalBootstrap).rejects.toMatchObject({ name: "CsrfBootstrapError" });
    await expect(manager.getToken()).resolves.toMatchObject({ token: "fresh" });
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("retries a safe bootstrap request after a temporary gateway failure", async () => {
    get
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 502 } })
      .mockResolvedValueOnce({
        data: { headerName: "X-XSRF-TOKEN", parameterName: "_csrf", token: "recovered" },
      });
    const wait = vi.fn().mockResolvedValue(undefined);
    const manager = new CsrfTokenManager("", { wait });

    await expect(manager.getToken()).resolves.toMatchObject({ token: "recovered" });
    expect(get).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledWith(150);
  });

  it("does not retry a non-transient bootstrap response", async () => {
    get.mockRejectedValue({ isAxiosError: true, response: { status: 400 } });
    const wait = vi.fn().mockResolvedValue(undefined);
    const manager = new CsrfTokenManager("", { wait });

    await expect(manager.getToken()).rejects.toMatchObject({
      name: "CsrfBootstrapError",
    });
    expect(get).toHaveBeenCalledTimes(1);
    expect(wait).not.toHaveBeenCalled();
  });

  it("bounds retry attempts when the API remains unavailable", async () => {
    get.mockRejectedValue({ isAxiosError: true });
    const wait = vi.fn().mockResolvedValue(undefined);
    const manager = new CsrfTokenManager("", { wait });

    await expect(manager.getToken()).rejects.toMatchObject({
      name: "CsrfBootstrapError",
    });
    expect(get).toHaveBeenCalledTimes(3);
    expect(wait).toHaveBeenCalledTimes(2);
  });
});

describe("CSRF request policy", () => {
  it.each(["post", "PUT", "patch", "DELETE"])("treats %s as unsafe", (method) => {
    expect(isUnsafeMethod(method)).toBe(true);
  });

  it.each(["get", "HEAD", "options", undefined])("does not block safe method %s", (method) => {
    expect(isUnsafeMethod(method)).toBe(false);
  });

  it("retries only explicit CSRF failure codes", () => {
    expect(isCsrfFailureCode("CSRF_TOKEN_MISSING")).toBe(true);
    expect(isCsrfFailureCode("CSRF_TOKEN_INVALID")).toBe(true);
    expect(isCsrfFailureCode("ACCESS_DENIED")).toBe(false);
    expect(isCsrfFailureCode(undefined)).toBe(false);
  });
});
