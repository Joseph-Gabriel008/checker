/**
 * Safely load a JSON value from localStorage.
 * @param {string} key
 * @param {*} fallback
 */
export function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Format a number as a USD currency string (no cents).
 * @param {number} value
 * @returns {string}
 */
export function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Sanitize a plain-text string for safe display.
 * Strips HTML-injectable characters to prevent XSS when rendering user input.
 * @param {string} str
 * @returns {string}
 */
export function sanitizeText(str) {
  if (typeof str !== "string") return "";
  return str.replace(/</g, "&lt;").replace(/>/g, "&gt;").trim();
}

/**
 * Calculate the percentage of completed tasks (0-100).
 * @param {Array<{done: boolean}>} tasks
 * @returns {number}
 */
export function calcProgress(tasks) {
  if (!tasks || !tasks.length) return 0;
  return Math.round((tasks.filter((t) => t.done).length / tasks.length) * 100);
}

/**
 * Return the number of days remaining until an ISO date string.
 * Returns negative if the date has passed.
 * @param {string} isoDate
 * @returns {number}
 */
export function daysUntil(isoDate) {
  const target = new Date(isoDate + "T12:00:00");
  const now = new Date();
  const diff = target - now;
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

/**
 * Format an ISO date string to a human-readable locale string.
 * @param {string} isoDate
 * @returns {string}
 */
export function formatDate(isoDate) {
  return new Date(isoDate + "T12:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Truncate text to a maximum character count, appending ellipsis.
 * @param {string} text
 * @param {number} maxLen
 * @returns {string}
 */
export function truncate(text, maxLen = 80) {
  if (typeof text !== "string") return "";
  return text.length > maxLen ? text.slice(0, maxLen) + "\u2026" : text;
}

/**
 * Validate event form data. Returns an error string or null if valid.
 * @param {{name:string, date:string, budget:string|number, guests:string|number}} data
 * @returns {string|null}
 */
export function validateEventData(data) {
  if (!data.name || !data.name.trim()) return "Event name is required.";
  if (!data.date) return "Event date is required.";
  const budget = Number(data.budget);
  if (isNaN(budget) || budget < 0) return "Budget must be a non-negative number.";
  const guests = Number(data.guests);
  if (isNaN(guests) || guests < 1) return "Guest count must be at least 1.";
  return null;
}

/**
 * Validate task form data. Returns an error string or null if valid.
 * @param {{text:string}} data
 * @returns {string|null}
 */
export function validateTaskData(data) {
  if (!data.text || !data.text.trim()) return "Task description is required.";
  if (data.text.trim().length > 200) return "Task description must be under 200 characters.";
  return null;
}

/**
 * Validate expense form data. Returns an error string or null if valid.
 * @param {{name:string, amount:string|number}} data
 * @returns {string|null}
 */
export function validateExpenseData(data) {
  if (!data.name || !data.name.trim()) return "Expense name is required.";
  const amount = Number(data.amount);
  if (isNaN(amount) || amount < 0) return "Amount must be a non-negative number.";
  return null;
}

/**
 * Generate a contextual AI planning response based on user input.
 * Uses rule-based keyword matching to simulate a GenAI assistant
 * providing event-specific planning guidance.
 *
 * @param {string} query - The user's question or message
 * @param {object} context - Planning context object
 * @param {Array} context.tasks - Current task list
 * @param {Array} context.expenses - Current expense list
 * @param {Array} context.vendors - Current vendor list
 * @param {object} context.event - Event details
 * @returns {string} AI assistant response
 */
export function generateAIResponse(query, context = {}) {
  const q = (query || "").toLowerCase().trim();
  const { tasks = [], expenses = [], vendors = [], event = {} } = context;
  const budget = event.budget ?? 0;
  const spent = expenses.reduce((s, x) => s + (x.amount ?? 0), 0);
  const remaining = budget - spent;
  const openTasks = tasks.filter((t) => !t.done);

  // Budget queries
  if (q.includes("budget") || q.includes("money") || q.includes("cost") || q.includes("spend") || q.includes("afford")) {
    if (remaining < 0) {
      return `\u26a0\ufe0f You're currently ${formatCurrency(Math.abs(remaining))} over budget. Consider reviewing planned expenses or adjusting your budget ceiling. Prioritize paid commitments first to protect deposits.`;
    }
    const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
    return `\ud83d\udcb0 You've allocated ${formatCurrency(spent)} (${pct}%) of your ${formatCurrency(budget)} budget, leaving ${formatCurrency(remaining)} available. Pro tip: reserve 8\u201310% as a contingency buffer for last-minute surprises like overtime fees or weather changes.`;
  }

  // Vendor queries
  if (q.includes("vendor") || q.includes("supplier") || q.includes("caterer") || q.includes("photographer") || q.includes("florist") || q.includes("dj") || q.includes("musician")) {
    const booked = vendors.filter((v) => v.status === "Booked").length;
    const total = vendors.length;
    if (total === 0) {
      return "\ud83d\udccb You haven't added any vendors yet. Start with your top 3 priorities: venue, catering, and photography. Add them in the Vendors tab!";
    }
    const notBooked = vendors.filter((v) => v.status !== "Booked").map((v) => v.name).join(", ");
    return `\ud83d\udccb You have ${booked} of ${total} vendors confirmed. ${booked < total ? `Still in progress: ${notBooked}.` : "Your vendor team is complete!"} Always get contracts in writing and confirm availability 2 weeks before the event.`;
  }

  // Timeline / checklist queries
  if (q.includes("timeline") || q.includes("checklist") || q.includes("schedule") || q.includes("task") || q.includes("todo") || q.includes("next")) {
    if (openTasks.length === 0) {
      return "\u2705 Amazing \u2014 all your tasks are complete! You're fully prepared. Enjoy the celebration!";
    }
    const next = openTasks[0];
    const highPriority = openTasks.filter((t) => t.priority === "High");
    return `\ud83d\udcc5 You have ${openTasks.length} open task${openTasks.length > 1 ? "s" : ""}. ${highPriority.length > 0 ? `${highPriority.length} are high priority. ` : ""}Your next step: \u201c${next.text}\u201d. Tackle high-priority items first to keep momentum going!`;
  }

  // Guest queries
  if (q.includes("guest") || q.includes("invite") || q.includes("rsvp") || q.includes("attendance") || q.includes("headcount")) {
    const guests = event.guests ?? 0;
    return `\ud83d\udc65 You're planning for ${guests} guests. Send save-the-dates at least 8 weeks out, and formal invitations 6 weeks before. For catering, add a 5\u201310% buffer for last-minute confirmations.`;
  }

  // Venue queries
  if (q.includes("venue") || q.includes("location") || q.includes("hall") || q.includes("place") || q.includes("site")) {
    return "\ud83c\udfd1 When choosing a venue, confirm: capacity for your guest count, parking & accessibility, catering restrictions, noise ordinances, and an indoor backup plan. Popular venues book out 12+ months in advance!";
  }

  // Wedding-specific
  if (q.includes("wedding") || q.includes("ceremony") || q.includes("vow") || q.includes("reception") || q.includes("bride") || q.includes("groom")) {
    return "\ud83d\udc8d Key wedding milestones: Book venue & officiant first (12+ months out), then catering & photographer. Flowers & d\u00e9cor at 6 months, attire at 6 months, cake tasting at 4 months, seating chart at 3 weeks. Want me to add any of these to your checklist?";
  }

  // Birthday specific
  if (q.includes("birthday") || q.includes("party") || q.includes("surprise") || q.includes("cake")) {
    return "\ud83c\udf82 For a great birthday party: choose a theme first, then book the venue and send invites 4\u20136 weeks out. Don\u2019t forget entertainment (games, DJ, activities), a signature cake, and a photo moment guests will love!";
  }

  // Community event specific
  if (q.includes("community") || q.includes("fundrais") || q.includes("gala") || q.includes("corporate") || q.includes("charity")) {
    return "\ud83c\udf1f For community events: define your goal (fundraising target, attendance) early. Secure sponsors and permits first, then logistics. Use RSVP tracking to forecast attendance and arrange accessible seating.";
  }

  // Ideas queries
  if (q.includes("idea") || q.includes("theme") || q.includes("decor") || q.includes("creative") || q.includes("inspiration") || q.includes("unique")) {
    const themes = [
      "Garden picnic with hanging lanterns and wildflower centerpieces",
      "Black-tie gala with mirrored tables and warm candlelight",
      "Rustic barn celebration with mason jars and fairy string lights",
      "Tropical paradise with bold botanicals and fresh fruit displays",
      "Vintage Great Gatsby with art deco details and jazz music",
    ];
    const pick = themes[Math.floor(Math.random() * themes.length)];
    return `\u2728 Here's a fresh idea for your ${event.type ?? "event"}: ${pick}. Check the Ideas tab for more curated inspiration you can add directly to your plan!`;
  }

  // Stress / overwhelm
  if (q.includes("stress") || q.includes("overwhelm") || q.includes("difficult") || q.includes("hard") || q.includes("worried") || q.includes("anxious")) {
    return `\ud83d\ude0a Take a breath \u2014 you're doing great! Focus on just one task today. You have ${openTasks.length} open tasks, but only \u201c${openTasks[0]?.text ?? "your next step"}\u201d needs attention right now. Planning is a journey, not a sprint.`;
  }

  // Help queries
  if (q.includes("help") || q.includes("what can you") || q.includes("how do") || q.includes("tips")) {
    return "\ud83e\udd16 I'm your AI planning assistant! Ask me about: \ud83d\udcb0 budget advice, \ud83d\udccb task priorities, \ud83d\udccb vendor management, \ud83d\udc65 guest planning, \ud83c\udfd1 venue tips, \u2728 creative ideas, or anything else about your event. What's on your mind?";
  }

  // Default fallback with context-awareness
  const suggestions = openTasks.slice(0, 2).map((t) => `\u201c${t.text}\u201d`).join(" and ");
  return `\ud83c\udf89 Great question about your ${event.type ?? "event"}! Quick wins to consider: ${suggestions || "review your vendor checklist"}. Try asking about "budget", "vendors", "timeline", or "ideas" for specific advice!`;
}
