import { fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScrollToTop } from "@/components/ScrollToTop";

const PathControls = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div>
      <div data-testid="location">{`${location.pathname}${location.search}${location.hash}`}</div>
      <button type="button" onClick={() => navigate("/next")}>
        Next page
      </button>
      <button type="button" onClick={() => navigate("/next?tab=active")}>
        Query page
      </button>
      <button type="button" onClick={() => navigate("/next#details")}>
        Hash page
      </button>
    </div>
  );
};

const renderRouter = (initialPath = "/start") =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <ScrollToTop />
      <Routes>
        <Route path="*" element={<PathControls />} />
      </Routes>
    </MemoryRouter>
  );

describe("ScrollToTop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "scrollTo", {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
  });

  it("scrolls to the top on pathname changes", async () => {
    const { findByRole } = renderRouter();
    expect(window.scrollTo).toHaveBeenCalledTimes(1);

    fireEvent.click(await findByRole("button", { name: /next page/i }));

    await waitFor(() => {
      expect(window.scrollTo).toHaveBeenCalledTimes(2);
    });
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0, left: 0, behavior: "auto" });
  });

  it("scrolls to the top on query string changes", async () => {
    const { findByRole } = renderRouter("/next");
    expect(window.scrollTo).toHaveBeenCalledTimes(1);

    fireEvent.click(await findByRole("button", { name: /query page/i }));

    await waitFor(() => {
      expect(window.scrollTo).toHaveBeenCalledTimes(2);
    });
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 0, left: 0, behavior: "auto" });
  });

  it("does not force top scroll for hash navigation", async () => {
    const { findByRole } = renderRouter("/next");
    expect(window.scrollTo).toHaveBeenCalledTimes(1);

    fireEvent.click(await findByRole("button", { name: /hash page/i }));

    await waitFor(() => {
      expect(window.scrollTo).toHaveBeenCalledTimes(1);
    });
    expect(document.querySelector("[data-testid='location']")).toHaveTextContent("/next#details");
    expect(window.scrollTo).toHaveBeenCalledTimes(1);
  });
});
