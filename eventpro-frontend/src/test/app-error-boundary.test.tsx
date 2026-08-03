import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";

let shouldThrow = true;

function UnstablePage() {
  if (shouldThrow) throw new Error("render failed");
  return <div>Recovered page</div>;
}

describe("AppErrorBoundary", () => {
  beforeEach(() => {
    shouldThrow = true;
    sessionStorage.clear();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("shows a friendly recovery screen with a support ID and retries in place", () => {
    render(
      <AppErrorBoundary>
        <UnstablePage />
      </AppErrorBoundary>
    );

    expect(screen.getByText("This page couldn't finish loading")).toBeInTheDocument();
    expect(screen.getByText(/Support ID:/)).toBeInTheDocument();

    shouldThrow = false;
    fireEvent.click(screen.getByRole("button", { name: "Try Again" }));

    expect(screen.getByText("Recovered page")).toBeInTheDocument();
  });
});
