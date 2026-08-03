import axios from "axios";

export class CsrfBootstrapError extends Error {
  constructor(message = "We could not start a secure session. Please try again.") {
    super(message);
    this.name = "CsrfBootstrapError";
  }
}

export function isNotFoundError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 404;
}

export function getUserFacingApiError(
  error: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  if (error instanceof CsrfBootstrapError) {
    return error.message;
  }

  if (!axios.isAxiosError(error)) {
    return error instanceof Error && error.message ? error.message : fallback;
  }

  const responseCode = error.response?.data?.code;
  if (responseCode === "CSRF_TOKEN_MISSING" || responseCode === "CSRF_TOKEN_INVALID") {
    return "Your secure session expired. Refresh the page and try again.";
  }

  const status = error.response?.status;
  if (!error.response || status === 502 || status === 503 || status === 504) {
    return "The service is temporarily unavailable. Your information is still here—please try again shortly.";
  }

  const responseMessage = error.response?.data?.message;
  return typeof responseMessage === "string" && responseMessage.trim().length > 0
    ? responseMessage
    : fallback;
}
