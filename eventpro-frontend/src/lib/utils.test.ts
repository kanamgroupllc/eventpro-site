import { describe, expect, it } from "vitest";
import { getEventImageUrl } from "./utils";

describe("getEventImageUrl", () => {
  it("proxies LocalStack S3 image URLs", () => {
    const url = "http://localhost:4566/eventpro-images-local/events/event-id/image.jpg";

    expect(getEventImageUrl(url)).toBe(
      `http://localhost:8080/api/v1/images/proxy?url=${encodeURIComponent(url)}`
    );
  });

  it("proxies AWS S3 event image URLs", () => {
    const url = "https://eventpro-images.s3.us-east-1.amazonaws.com/events/event-id/image.jpg";

    expect(getEventImageUrl(url)).toBe(
      `http://localhost:8080/api/v1/images/proxy?url=${encodeURIComponent(url)}`
    );
  });

  it("proxies AWS S3 profile picture URLs", () => {
    const url = "https://eventpro-images.s3.us-east-1.amazonaws.com/profile-pictures/user-id/avatar.png";

    expect(getEventImageUrl(url)).toBe(
      `http://localhost:8080/api/v1/images/proxy?url=${encodeURIComponent(url)}`
    );
  });

  it("keeps external non-S3 HTTPS URLs direct", () => {
    const url = "https://cdn.example.com/events/event-id/image.jpg";

    expect(getEventImageUrl(url)).toBe(url);
  });

  it("rejects invalid non-http URLs", () => {
    expect(getEventImageUrl("data:image/png;base64,abc")).toBeUndefined();
    expect(getEventImageUrl("chrome-extension://abc/image.png")).toBeUndefined();
    expect(getEventImageUrl("   ")).toBeUndefined();
  });
});
