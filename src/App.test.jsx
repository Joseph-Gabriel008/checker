import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App.jsx";
import {
  calcProgress,
  daysUntil,
  formatCurrency,
  generateAIResponse,
  loadFromStorage,
  sanitizeText,
  truncate,
  validateEventData,
  validateExpenseData,
  validateTaskData,
} from "./utils.js";

// ── Mock Gemini so tests don't make real API calls ──────────────────────────
vi.mock("./gemini.js", () => ({
  createGeminiChat: () => ({
    isReal: false,
    sendMessage: async (text) =>
      generateAIResponse(text, {
        tasks: [],
        expenses: [],
        vendors: [],
        event: { name: "Test Event", type: "Wedding", guests: 50, budget: 10000, date: "2026-01-01" },
      }),
  }),
}));

// ═══════════════════════════════════════════════════════════════════════════
// Utility function unit tests
// ═══════════════════════════════════════════════════════════════════════════
describe("formatCurrency", () => {
  it("formats a positive integer as USD", () => {
    expect(formatCurrency(5000)).toBe("$5,000");
  });
  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0");
  });
  it("rounds decimals", () => {
    expect(formatCurrency(1234.99)).toBe("$1,235");
  });
});

describe("sanitizeText", () => {
  it("strips HTML angle brackets", () => {
    expect(sanitizeText("<script>alert('xss')</script>")).toBe(
      "&lt;script&gt;alert('xss')&lt;/script&gt;"
    );
  });
  it("trims whitespace", () => {
    expect(sanitizeText("  hello  ")).toBe("hello");
  });
  it("returns empty string for non-string input", () => {
    expect(sanitizeText(null)).toBe("");
    expect(sanitizeText(42)).toBe("");
  });
});

describe("calcProgress", () => {
  it("returns 0 for an empty list", () => {
    expect(calcProgress([])).toBe(0);
  });
  it("returns 100 when all tasks are done", () => {
    expect(calcProgress([{ done: true }, { done: true }])).toBe(100);
  });
  it("calculates partial completion correctly", () => {
    expect(calcProgress([{ done: true }, { done: false }, { done: false }, { done: false }])).toBe(25);
  });
  it("handles null/undefined gracefully", () => {
    expect(calcProgress(null)).toBe(0);
  });
});

describe("loadFromStorage", () => {
  beforeEach(() => localStorage.clear());

  it("returns fallback when key is missing", () => {
    expect(loadFromStorage("non-existent", "default")).toBe("default");
  });
  it("parses a valid JSON value", () => {
    localStorage.setItem("test-key", JSON.stringify({ a: 1 }));
    expect(loadFromStorage("test-key", null)).toEqual({ a: 1 });
  });
  it("returns fallback on malformed JSON", () => {
    localStorage.setItem("bad-key", "{{{");
    expect(loadFromStorage("bad-key", "fallback")).toBe("fallback");
  });
});

describe("truncate", () => {
  it("truncates strings longer than maxLen", () => {
    const result = truncate("Hello World This Is A Long String", 10);
    expect(result).toBe("Hello Worl\u2026");
    expect(result.length).toBe(11);
  });
  it("returns the original string if within limit", () => {
    expect(truncate("Short", 10)).toBe("Short");
  });
  it("handles non-string input gracefully", () => {
    expect(truncate(null)).toBe("");
  });
});

describe("daysUntil", () => {
  it("returns a number", () => {
    expect(typeof daysUntil("2030-01-01")).toBe("number");
  });
  it("returns a positive number for a future date", () => {
    expect(daysUntil("2099-12-31")).toBeGreaterThan(0);
  });
  it("returns a negative number for a past date", () => {
    expect(daysUntil("2000-01-01")).toBeLessThan(0);
  });
});

describe("validateEventData", () => {
  const valid = { name: "My Event", date: "2026-01-01", budget: 5000, guests: 100 };
  it("returns null for valid data", () => {
    expect(validateEventData(valid)).toBeNull();
  });
  it("requires event name", () => {
    expect(validateEventData({ ...valid, name: "" })).toMatch(/name/i);
  });
  it("requires date", () => {
    expect(validateEventData({ ...valid, date: "" })).toMatch(/date/i);
  });
  it("rejects negative budget", () => {
    expect(validateEventData({ ...valid, budget: -100 })).toMatch(/budget/i);
  });
  it("requires at least 1 guest", () => {
    expect(validateEventData({ ...valid, guests: 0 })).toMatch(/guest/i);
  });
});

describe("validateTaskData", () => {
  it("returns null for valid data", () => {
    expect(validateTaskData({ text: "Book the DJ" })).toBeNull();
  });
  it("requires task text", () => {
    expect(validateTaskData({ text: "" })).toBeTruthy();
  });
  it("rejects text over 200 characters", () => {
    expect(validateTaskData({ text: "a".repeat(201) })).toMatch(/200/);
  });
});

describe("validateExpenseData", () => {
  it("returns null for valid data", () => {
    expect(validateExpenseData({ name: "Venue", amount: 3000 })).toBeNull();
  });
  it("requires expense name", () => {
    expect(validateExpenseData({ name: "", amount: 100 })).toBeTruthy();
  });
  it("rejects negative amount", () => {
    expect(validateExpenseData({ name: "Flowers", amount: -50 })).toMatch(/amount/i);
  });
});

describe("generateAIResponse", () => {
  const ctx = {
    tasks: [{ done: false, text: "Book venue", priority: "High" }],
    expenses: [{ amount: 5000, status: "Paid" }],
    vendors: [{ name: "Marigold", status: "Booked" }],
    event: { name: "Leah's Wedding", type: "Wedding", budget: 20000, guests: 100, date: "2026-06-01" },
  };

  it("responds to budget queries", () => {
    const response = generateAIResponse("What is my budget situation?", ctx);
    expect(response).toMatch(/budget|remaining|allocated/i);
  });

  it("responds to vendor queries", () => {
    const response = generateAIResponse("How are my vendors?", ctx);
    expect(response).toMatch(/vendor|booked|confirmed/i);
  });

  it("responds to timeline queries", () => {
    const response = generateAIResponse("What tasks do I have?", ctx);
    expect(response).toMatch(/task|next step|open/i);
  });

  it("responds to wedding-specific queries", () => {
    const response = generateAIResponse("Tell me about wedding planning", ctx);
    expect(response).toMatch(/wedding|ceremony|venue/i);
  });

  it("handles empty query gracefully", () => {
    const response = generateAIResponse("", ctx);
    expect(typeof response).toBe("string");
    expect(response.length).toBeGreaterThan(0);
  });

  it("returns a fallback for unrecognised queries", () => {
    const response = generateAIResponse("xyzzy plugh twisty passage", ctx);
    expect(typeof response).toBe("string");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Integration / component tests
// ═══════════════════════════════════════════════════════════════════════════
describe("Checker event planner – App integration", () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it("renders the dashboard heading", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { name: /good morning/i })
    ).toBeInTheDocument();
  });

  it("renders the planning checklist panel", () => {
    render(<App />);
    expect(screen.getByText(/planning checklist/i)).toBeInTheDocument();
  });

  it("renders sidebar navigation items", () => {
    render(<App />);
    // Use exact text matching within the nav element
    const nav = screen.getByRole("navigation", { name: /page navigation/i });
    expect(nav).toBeInTheDocument();
    expect(nav.textContent).toMatch(/overview/i);
    expect(nav.textContent).toMatch(/my plan/i);
    expect(nav.textContent).toMatch(/budget/i);
    expect(nav.textContent).toMatch(/vendors/i);
    expect(nav.textContent).toMatch(/ideas/i);
    expect(nav.textContent).toMatch(/timeline/i);
  });

  it("navigates to My plan page", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /my plan/i }));
    expect(screen.getByText(/all planning tasks/i)).toBeInTheDocument();
  });

  it("navigates to Budget page", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /budget/i }));
    expect(screen.getByText(/total event budget/i)).toBeInTheDocument();
  });

  it("navigates to Vendors page", () => {
    render(<App />);
    // Use the nav button by its unique id to avoid matching the search button
    fireEvent.click(document.getElementById("nav-vendors"));
    expect(screen.getByText(/vendor directory/i)).toBeInTheDocument();
  });

  it("navigates to Ideas page", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /ideas/i }));
    // The ideas section renders multiple "CURATED IDEA" small elements
    expect(screen.getAllByText(/curated idea/i).length).toBeGreaterThan(0);
  });

  it("navigates to Timeline page", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /timeline/i }));
    expect(screen.getByRole("heading", { name: /your event timeline/i })).toBeInTheDocument();
  });

  it("adds a task through the task dialog", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /add a new task/i }));
    fireEvent.change(screen.getByLabelText(/what needs to happen/i), {
      target: { value: "Book the DJ" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    expect(JSON.parse(localStorage.getItem("checker-tasks"))).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ text: "Book the DJ" }),
      ])
    );
  });

  it("closes the dialog on Escape key", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /add a new task/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows a toast when bell is clicked", () => {
    render(<App />);
    // Bell button has aria-label containing "tasks need attention"
    const bellBtn = screen.getByRole("button", { name: /tasks need attention/i });
    fireEvent.click(bellBtn);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("opens the search dialog", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /search tasks and vendors/i }));
    expect(screen.getByRole("dialog", { name: /search/i })).toBeInTheDocument();
  });

  it("opens the AI chat panel", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /open checker ai/i }));
    expect(
      screen.getByRole("complementary", { name: /planning assistant/i })
    ).toBeInTheDocument();
  });

  it("sends a chat message and receives a response", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /open checker ai/i }));
    fireEvent.change(screen.getByLabelText(/type a message/i), {
      target: { value: "What is my budget?" },
    });
    fireEvent.submit(screen.getByRole("form", { name: /message input/i }));
    await waitFor(() => {
      const log = screen.getByRole("log");
      expect(log.textContent).toMatch(/budget|remaining|allocated/i);
    }, { timeout: 2000 });
  });

  it("filters tasks by Open status", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /my plan/i }));
    // The filter button has id filter-open and text "Open"
    fireEvent.click(screen.getByRole("button", { name: /^open$/i }));
    // At least some non-done tasks should be visible
    const allTasks = document.querySelectorAll(".full-task");
    expect(allTasks.length).toBeGreaterThan(0);
  });

  it("persists event update to localStorage", () => {
    render(<App />);
    // Use the Overview page's "Edit event" primary button (exact label)
    fireEvent.click(screen.getByRole("button", { name: /^edit event settings$/i }));
    const nameInput = screen.getByLabelText(/event name/i);
    fireEvent.change(nameInput, { target: { value: "New Test Event" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    const stored = JSON.parse(localStorage.getItem("checker-event"));
    expect(stored?.name).toBe("New Test Event");
  });
});
