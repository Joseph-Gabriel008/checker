import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "./App.jsx";

describe("Checker event planner", () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it("renders the planner dashboard", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { name: /good morning/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/planning checklist/i)).toBeInTheDocument();
  });

  it("adds a task through the task dialog", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /add a task/i }));
    fireEvent.change(screen.getByLabelText(/what needs to happen/i), {
      target: { value: "Book the DJ" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    expect(JSON.parse(localStorage.getItem("checker-tasks"))).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ text: "Book the DJ" }),
      ]),
    );
  });
});
