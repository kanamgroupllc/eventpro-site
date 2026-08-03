import axios from "axios";
import { describe, expect, it, vi } from "vitest";
import { CsrfBootstrapError, getUserFacingApiError, isNotFoundError } from "@/lib/api-errors";

describe("API error messages", () => {
  it("explains secure-session bootstrap failures", () => {
    expect(getUserFacingApiError(new CsrfBootstrapError())).toMatch(/secure session/i);
  });

  it("distinguishes temporary outages", () => {
    const error = { isAxiosError: true, response: { status: 503 } };
    vi.spyOn(axios, "isAxiosError").mockReturnValue(true);
    expect(getUserFacingApiError(error)).toMatch(/temporarily unavailable/i);
  });

  it("uses validation messages returned by the API", () => {
    const error = { isAxiosError: true, response: { status: 409, data: { message: "Email already exists" } } };
    vi.spyOn(axios, "isAxiosError").mockReturnValue(true);
    expect(getUserFacingApiError(error)).toBe("Email already exists");
  });

  it("recognizes only 404 responses as not found", () => {
    vi.spyOn(axios, "isAxiosError").mockReturnValue(true);
    expect(isNotFoundError({ response: { status: 404 } })).toBe(true);
    expect(isNotFoundError({ response: { status: 502 } })).toBe(false);
  });
});
