import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createGeminiChat } from "./gemini.js";
import {
  ArrowRight,
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Flower2,
  Heart,
  LayoutDashboard,
  Lightbulb,
  ListChecks,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Sparkles,
  Target,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  calcProgress,
  daysUntil,
  formatCurrency,
  formatDate,
  generateAIResponse,
  loadFromStorage,
  sanitizeText,
  truncate,
  validateEventData,
  validateExpenseData,
  validateTaskData,
} from "./utils.js";

// ---------------------------------------------------------------------------
// Initial seed data
// ---------------------------------------------------------------------------
const INITIAL_TASKS = [
  { id: 1, text: "Confirm venue booking", group: "This week", done: true, priority: "High", category: "Venue" },
  { id: 2, text: "Shortlist caterers", group: "This week", done: false, priority: "High", category: "Food" },
  { id: 3, text: "Send save-the-dates", group: "This week", done: false, priority: "Medium", category: "Guests" },
  { id: 4, text: "Finalize floral moodboard", group: "Next week", done: false, priority: "Low", category: "Design" },
];

const INITIAL_EXPENSES = [
  { id: 1, name: "Venue deposit", category: "Venue", amount: 5000, status: "Paid" },
  { id: 2, name: "Catering estimate", category: "Food", amount: 3420, status: "Planned" },
  { id: 3, name: "Florals & decor", category: "Design", amount: 2150, status: "Planned" },
  { id: 4, name: "Photography retainer", category: "Photo", amount: 1450, status: "Paid" },
];

const INITIAL_VENDORS = [
  { id: 1, name: "The Glasshouse", type: "Venue", status: "Booked", contact: "Maya · (555) 014-2222", color: "purple" },
  { id: 2, name: "Marigold Kitchen", type: "Catering", status: "Comparing", contact: "hello@marigold.test", color: "orange" },
  { id: 3, name: "Mira Flores", type: "Florals", status: "Contacted", contact: "Mira · (555) 014-9811", color: "pink" },
];

const INITIAL_EVENT = {
  name: "Leah & Arjun's wedding",
  date: "2025-06-14",
  type: "Wedding",
  guests: 142,
  budget: 22000,
};

const EXPENSE_CATEGORIES = ["Venue", "Food", "Guests", "Design", "Photo", "Music", "Other"];

// ---------------------------------------------------------------------------
// Timeline milestone templates per event type
// ---------------------------------------------------------------------------
const TIMELINE_TEMPLATES = {
  Wedding: [
    { label: "12+ months out", items: ["Book venue & officiant", "Set budget", "Create guest list"] },
    { label: "9 months out", items: ["Book caterer & photographer", "Choose wedding party"] },
    { label: "6 months out", items: ["Book florist & DJ/band", "Order attire", "Plan honeymoon"] },
    { label: "3 months out", items: ["Send invitations", "Arrange accommodations", "Cake tasting"] },
    { label: "1 month out", items: ["Final fittings", "Confirm all vendors", "Create seating chart"] },
    { label: "1 week out", items: ["Final headcount to caterer", "Rehearsal dinner", "Pack essentials"] },
  ],
  Birthday: [
    { label: "6 weeks out", items: ["Choose theme & venue", "Set budget", "Start guest list"] },
    { label: "4 weeks out", items: ["Send invitations", "Book entertainment", "Order decorations"] },
    { label: "2 weeks out", items: ["Confirm RSVPs", "Order cake", "Plan activities/games"] },
    { label: "1 week out", items: ["Confirm headcount to caterer", "Prepare party favors", "Create playlist"] },
    { label: "Day before", items: ["Decorate venue", "Prepare food & drinks", "Charge camera"] },
  ],
  "Community event": [
    { label: "3+ months out", items: ["Define goal & budget", "Secure venue & permits", "Form planning committee"] },
    { label: "2 months out", items: ["Book speakers/performers", "Launch marketing & ticketing", "Confirm sponsors"] },
    { label: "1 month out", items: ["Finalize program agenda", "Arrange volunteers", "Send press releases"] },
    { label: "2 weeks out", items: ["Confirm vendor deliveries", "Prepare signage & materials", "Brief volunteers"] },
    { label: "Day of", items: ["Set up venue early", "Briefing session for all staff", "Document the event"] },
  ],
  Corporate: [
    { label: "3 months out", items: ["Define objectives & budget", "Book venue", "Plan agenda"] },
    { label: "6 weeks out", items: ["Confirm speakers & AV", "Send invitations", "Arrange travel/hotel"] },
    { label: "2 weeks out", items: ["Final headcount", "Prepare materials", "Confirm catering"] },
    { label: "1 week out", items: ["Run tech rehearsal", "Prepare backup plans", "Brief all presenters"] },
  ],
};

// ---------------------------------------------------------------------------
// Root App component
// ---------------------------------------------------------------------------
function App() {
  const [activePage, setActivePage] = useState("Overview");
  const [event, setEvent] = useState(() => loadFromStorage("checker-event", INITIAL_EVENT));
  const [tasks, setTasks] = useState(() => loadFromStorage("checker-tasks", INITIAL_TASKS));
  const [expenses, setExpenses] = useState(() => loadFromStorage("checker-expenses", INITIAL_EXPENSES));
  const [vendors, setVendors] = useState(() => loadFromStorage("checker-vendors", INITIAL_VENDORS));
  const [notes, setNotes] = useState(() => localStorage.getItem("checker-notes") || "");
  const [modalType, setModalType] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Persist to localStorage
  useEffect(() => { localStorage.setItem("checker-event", JSON.stringify(event)); }, [event]);
  useEffect(() => { localStorage.setItem("checker-tasks", JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem("checker-expenses", JSON.stringify(expenses)); }, [expenses]);
  useEffect(() => { localStorage.setItem("checker-vendors", JSON.stringify(vendors)); }, [vendors]);
  useEffect(() => { localStorage.setItem("checker-notes", notes); }, [notes]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(""), 2600);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Derived stats (memoized for efficiency)
  const totalSpent = useMemo(
    () => expenses.reduce((sum, item) => sum + item.amount, 0),
    [expenses]
  );
  const totalPaid = useMemo(
    () => expenses.filter((item) => item.status === "Paid").reduce((sum, item) => sum + item.amount, 0),
    [expenses]
  );
  const planProgress = useMemo(() => calcProgress(tasks), [tasks]);
  const daysLeft = useMemo(() => daysUntil(event.date), [event.date]);

  // Task handlers (memoized)
  const toggleTask = useCallback((taskId) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)));
  }, []);

  const addTask = useCallback((taskData) => {
    const error = validateTaskData(taskData);
    if (error) { setToastMessage(error); return; }
    setTasks((prev) => [
      ...prev,
      { id: Date.now(), done: false, ...taskData, text: sanitizeText(taskData.text) },
    ]);
    setToastMessage("Task added to your plan ✓");
  }, []);

  const navigateTo = useCallback((pageName) => {
    setActivePage(pageName);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleFormSave = useCallback((formType, formData) => {
    if (formType === "event") {
      const error = validateEventData(formData);
      if (error) { setToastMessage(error); return; }
      setEvent({
        ...formData,
        name: sanitizeText(formData.name),
        budget: Number(formData.budget),
        guests: Number(formData.guests),
      });
      setToastMessage("Event updated ✓");
    }
    if (formType === "task") {
      addTask(formData);
    }
    if (formType === "expense") {
      const error = validateExpenseData(formData);
      if (error) { setToastMessage(error); return; }
      setExpenses((prev) => [
        ...prev,
        { id: Date.now(), ...formData, name: sanitizeText(formData.name), amount: Number(formData.amount) },
      ]);
      setToastMessage("Expense added ✓");
    }
    if (formType === "vendor") {
      if (!formData.name || !formData.name.trim()) { setToastMessage("Vendor name is required."); return; }
      setVendors((prev) => [
        ...prev,
        { id: Date.now(), color: "purple", ...formData, name: sanitizeText(formData.name) },
      ]);
      setToastMessage("Vendor added ✓");
    }
    setModalType("");
  }, [addTask]);

  const navItems = [
    [LayoutDashboard, "Overview"],
    [ListChecks, "My plan"],
    [CircleDollarSign, "Budget"],
    [Users, "Vendors"],
    [Lightbulb, "Ideas"],
    [Calendar, "Timeline"],
  ];

  const openTaskCount = tasks.filter((t) => !t.done).length;

  return (
    <main className="app-shell">
      {/* Sidebar navigation */}
      <aside
        className={isMobileMenuOpen ? "sidebar open" : "sidebar"}
        role="navigation"
        aria-label="Main navigation"
      >
        <a className="brand" href="#top" onClick={() => navigateTo("Overview")}>
          <span className="brand-mark" aria-hidden="true"><Check size={17} /></span>
          {" "}checker
        </a>

        <button
          className="event-switcher"
          onClick={() => setModalType("event")}
          aria-label={`Edit event: ${event.name}`}
        >
          <span className="event-icon" aria-hidden="true"><Heart size={16} fill="currentColor" /></span>
          <div>
            <strong>{truncate(event.name, 26)}</strong>
            <span>{formatDate(event.date)}</span>
          </div>
          <ChevronDown size={16} aria-hidden="true" />
        </button>

        <nav aria-label="Page navigation">
          {navItems.map(([Icon, label]) => (
            <button
              key={label}
              id={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
              className={activePage === label ? "nav-item active" : "nav-item"}
              onClick={() => navigateTo(label)}
              aria-current={activePage === label ? "page" : undefined}
            >
              <Icon size={19} aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button className="nav-item" onClick={() => setModalType("event")}>
            <Settings size={19} aria-hidden="true" />
            Event settings
          </button>
          <div className="profile" role="img" aria-label="User profile: Joseph, Planner">
            <span>JS</span>
            <div>
              <strong>Joseph</strong>
              <small>Planner</small>
            </div>
            <MoreHorizontal size={18} aria-hidden="true" />
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <section className="content" id="top">
        <header className="topbar" role="banner">
          <button
            className="mobile-menu"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileMenuOpen}
            aria-controls="sidebar"
          >
            <Menu size={22} aria-hidden="true" />
          </button>
          <div className="crumb" aria-label="Breadcrumb">
            <span>My events</span>
            <ChevronDown size={15} aria-hidden="true" />
            <strong>{truncate(event.name, 28)}</strong>
          </div>
          <div className="header-actions">
            <button
              className="icon-button"
              onClick={() => setIsSearchOpen(true)}
              aria-label="Search tasks and vendors"
            >
              <Search size={19} aria-hidden="true" />
            </button>
            <button
              className="icon-button notification"
              aria-label={`${openTaskCount} tasks need attention — show reminders`}
              onClick={() => setToastMessage(`${openTaskCount} task${openTaskCount !== 1 ? "s" : ""} still need attention`)}
            >
              <Bell size={19} aria-hidden="true" />
              <i aria-hidden="true" />
            </button>
            <button className="help" onClick={() => setIsChatOpen(true)} aria-label="Open AI planning assistant">
              <MessageCircle size={17} aria-hidden="true" />
              Ask AI
            </button>
          </div>
        </header>

        {/* Page content */}
        <div className="page" role="main" aria-label={`${activePage} page`}>
          {activePage === "Overview" ? (
            <Overview
              event={event}
              tasks={tasks}
              vendors={vendors}
              expenses={expenses}
              totalSpent={totalSpent}
              totalPaid={totalPaid}
              planProgress={planProgress}
              daysLeft={daysLeft}
              notes={notes}
              setNotes={setNotes}
              toggleTask={toggleTask}
              navigateTo={navigateTo}
              setModalType={setModalType}
            />
          ) : activePage === "Timeline" ? (
            <TimelinePage event={event} tasks={tasks} />
          ) : (
            <Workspace
              activePage={activePage}
              event={event}
              tasks={tasks}
              setTasks={setTasks}
              vendors={vendors}
              setVendors={setVendors}
              expenses={expenses}
              setExpenses={setExpenses}
              totalSpent={totalSpent}
              totalPaid={totalPaid}
              toggleTask={toggleTask}
              setModalType={setModalType}
              setToastMessage={setToastMessage}
              addTask={addTask}
            />
          )}
        </div>
      </section>

      {/* Floating AI button */}
      <button
        className="ai-fab"
        onClick={() => setIsChatOpen(true)}
        aria-label="Open Checker AI planning assistant"
      >
        <Sparkles size={21} aria-hidden="true" />
        <span>Ask AI</span>
      </button>

      {/* Toast notification */}
      {toastMessage && (
        <div
          className="toast"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <CheckCircle2 size={18} aria-hidden="true" />
          {toastMessage}
        </div>
      )}

      {/* Modal editor */}
      {modalType && (
        <Editor
          type={modalType}
          event={event}
          close={() => setModalType("")}
          save={handleFormSave}
        />
      )}

      {/* Search overlay */}
      {isSearchOpen && (
        <SearchBox
          tasks={tasks}
          vendors={vendors}
          close={() => setIsSearchOpen(false)}
          navigateTo={navigateTo}
        />
      )}

      {/* AI Chat panel */}
      {isChatOpen && (
        <Chat
          tasks={tasks}
          expenses={expenses}
          vendors={vendors}
          event={event}
          addTask={addTask}
          close={() => setIsChatOpen(false)}
        />
      )}
    </main>
  );
}

// ---------------------------------------------------------------------------
// Overview page
// ---------------------------------------------------------------------------
function Overview({
  event, tasks, vendors, expenses, totalSpent, totalPaid,
  planProgress, daysLeft, notes, setNotes, toggleTask, navigateTo, setModalType,
}) {
  const nextTask = tasks.find((t) => !t.done);
  const daysLabel = daysLeft > 0
    ? `${daysLeft} day${daysLeft !== 1 ? "s" : ""} to go`
    : daysLeft === 0
    ? "Today is the day! 🎉"
    : `${Math.abs(daysLeft)} day${Math.abs(daysLeft) !== 1 ? "s" : ""} ago`;

  return (
    <>
      <div className="welcome-row">
        <div>
          <p className="eyebrow">{event.type.toUpperCase()} · {event.guests} GUESTS · {daysLabel.toUpperCase()}</p>
          <h1>Good morning, Joseph <span aria-hidden="true">✦</span></h1>
          <p className="subhead">A calm command center for {event.name}.</p>
        </div>
        <button className="primary" onClick={() => setModalType("event")} aria-label="Edit event settings">
          <Settings size={17} aria-hidden="true" />
          Edit event
        </button>
      </div>

      <section className="hero-card" aria-label="Planning progress summary">
        <div className="hero-copy">
          <span className="pill">
            <Sparkles size={14} aria-hidden="true" />
            {planProgress >= 60 ? " Your plan is on track" : " A few easy wins await"}
          </span>
          <h2>Little steps, big celebration.</h2>
          <p>
            {nextTask
              ? `Next up: ${nextTask.text}. Keep the momentum with one meaningful task at a time.`
              : "Your checklist is complete. Take a breath—you are ready."}
          </p>
          <button className="text-button" onClick={() => navigateTo("My plan")}>
            View full plan <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="progress-orbit" role="img" aria-label={`${planProgress}% of tasks complete`}>
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r="50" />
            <circle
              className="progress-ring"
              cx="60" cy="60" r="50"
              style={{ strokeDashoffset: 314 - (314 * planProgress) / 100 }}
            />
          </svg>
          <div aria-hidden="true">
            <strong>{planProgress}%</strong>
            <span>complete</span>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="arch"><span /><span /><span /></div>
          <Flower2 />
          <span className="leaf leaf-one">✦</span>
        </div>
      </section>

      <section className="dashboard-grid">
        {/* Task panel */}
        <div className="panel task-panel">
          <PanelHead
            label="YOUR NEXT STEPS"
            title="Planning checklist"
            action="View all"
            onActionClick={() => navigateTo("My plan")}
          />
          <div className="task-list" role="list" aria-label="Recent planning tasks">
            {tasks.slice(0, 4).map((task) => (
              <TaskItem task={task} onToggle={toggleTask} key={task.id} />
            ))}
          </div>
          <button className="add-inline" onClick={() => setModalType("task")} aria-label="Add a new task">
            <Plus size={16} aria-hidden="true" />
            Add a task
          </button>
        </div>

        {/* Budget panel */}
        <div className="panel budget-panel">
          <PanelHead
            label="BUDGET OVERVIEW"
            title="Your spending"
            action="Details"
            onActionClick={() => navigateTo("Budget")}
          />
          <div className="budget-figure">
            <div>
              <strong>{formatCurrency(totalSpent)}</strong>
              <span>of {formatCurrency(event.budget)} planned</span>
            </div>
            <span className="remaining">{formatCurrency(event.budget - totalSpent)} left</span>
          </div>
          <div
            className="bar"
            role="progressbar"
            aria-valuenow={Math.min(100, Math.round((totalSpent / event.budget) * 100))}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${Math.min(100, Math.round((totalSpent / event.budget) * 100))}% of budget used`}
          >
            <i style={{ width: `${Math.min(100, (totalSpent / event.budget) * 100)}%` }} aria-hidden="true" />
          </div>
          <div className="budget-legend" aria-label="Budget breakdown">
            <span><i className="dot purple" aria-hidden="true" /> Paid <b>{formatCurrency(totalPaid)}</b></span>
            <span><i className="dot orange" aria-hidden="true" /> Planned <b>{formatCurrency(totalSpent - totalPaid)}</b></span>
          </div>
          <div className="budget-tip" role="note" aria-label="Planning tip">
            <Sparkles size={17} aria-hidden="true" />
            <p><b>Planning tip:</b> Keep a small buffer for the lovely surprises that appear.</p>
          </div>
        </div>

        {/* At-a-glance panel */}
        <div className="panel timeline-panel">
          <PanelHead label="PLANNING PULSE" title="At a glance" />
          <div className="timeline">
            <PulseItem n={tasks.filter((t) => !t.done).length} text="open tasks" color="orange" />
            <PulseItem n={vendors.length} text="vendors tracked" color="purple" />
            <PulseItem n={expenses.length} text="budget items" color="pink" />
            <PulseItem n={Math.abs(daysLeft)} text={daysLeft >= 0 ? "days to event" : "days since event"} color="teal" />
          </div>
        </div>

        {/* Notes panel */}
        <div className="panel notes-panel">
          <PanelHead label="PRIVATE NOTES" title="Keep the good ideas" />
          <textarea
            id="private-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="A song, a thought, a reminder…"
            aria-label="Private planning notes — saves automatically"
          />
          <small>Saves automatically on this device.</small>
        </div>
      </section>
    </>
  );
}

// ---------------------------------------------------------------------------
// Timeline page (new – addresses Problem Statement Alignment)
// ---------------------------------------------------------------------------
function TimelinePage({ event, tasks }) {
  const template = TIMELINE_TEMPLATES[event.type] || TIMELINE_TEMPLATES["Wedding"];
  const daysLeft = daysUntil(event.date);

  return (
    <>
      <section className="workspace-hero" aria-label="Timeline header">
        <div className="workspace-icon" aria-hidden="true"><Calendar size={24} /></div>
        <div>
          <p className="eyebrow">PLANNING ROADMAP</p>
          <h1>Your event timeline</h1>
          <p>A milestone-by-milestone guide for your {event.type.toLowerCase()}.</p>
        </div>
      </section>

      <section className="workspace-card timeline-page-card">
        <div className="timeline-page-header">
          <div className="timeline-event-badge" aria-label={`${event.name} — ${Math.abs(daysLeft)} days ${daysLeft >= 0 ? "to go" : "ago"}`}>
            <Heart size={18} fill="currentColor" aria-hidden="true" />
            <div>
              <strong>{event.name}</strong>
              <span>{formatDate(event.date)} · {Math.abs(daysLeft)} days {daysLeft >= 0 ? "to go" : "ago"}</span>
            </div>
          </div>
          <div className="timeline-progress-badge" aria-label={`${calcProgress(tasks)}% complete`}>
            <CheckCircle2 size={16} aria-hidden="true" />
            <span>{calcProgress(tasks)}% complete</span>
          </div>
        </div>

        <ol className="milestone-list" aria-label="Planning milestones">
          {template.map((milestone, idx) => (
            <li className="milestone-item" key={idx}>
              <div className="milestone-marker" aria-hidden="true">
                <span className="milestone-dot">{idx + 1}</span>
                {idx < template.length - 1 && <span className="milestone-line" />}
              </div>
              <div className="milestone-content">
                <h3 className="milestone-label">{milestone.label}</h3>
                <ul className="milestone-tasks" aria-label={`Tasks for ${milestone.label}`}>
                  {milestone.items.map((item) => {
                    const matchedTask = tasks.find(
                      (t) => t.text.toLowerCase().includes(item.toLowerCase().slice(0, 10))
                    );
                    return (
                      <li key={item} className={`milestone-task-item ${matchedTask?.done ? "completed" : ""}`}>
                        <span className="milestone-check" aria-hidden="true">
                          {matchedTask?.done ? <Check size={13} /> : <span className="empty-check" />}
                        </span>
                        {item}
                        {matchedTask?.done && (
                          <span className="sr-only"> — completed</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

// ---------------------------------------------------------------------------
// Workspace (My plan / Budget / Vendors / Ideas)
// ---------------------------------------------------------------------------
function Workspace({
  activePage, event, tasks, setTasks, vendors, setVendors,
  expenses, setExpenses, totalSpent, totalPaid, toggleTask,
  setModalType, setToastMessage, addTask,
}) {
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const pageConfig = {
    "My plan": ["YOUR ROADMAP", "Your planning plan", "A clear path from first idea to last dance.", ListChecks],
    Budget: ["FINANCIAL CLARITY", "A budget with breathing room", "See every commitment in one place.", CircleDollarSign],
    Vendors: ["YOUR DREAM TEAM", "People making it happen", "Keep your collaborators beautifully organized.", Users],
    Ideas: ["CREATIVE DIRECTION", "Ideas with your name on them", "Small touches that make the day unforgettable.", Lightbulb],
  }[activePage];

  const PageIcon = pageConfig[3];

  const removeItem = useCallback((itemId, itemKind) => {
    if (itemKind === "task") setTasks((prev) => prev.filter((t) => t.id !== itemId));
    if (itemKind === "expense") setExpenses((prev) => prev.filter((e) => e.id !== itemId));
    if (itemKind === "vendor") setVendors((prev) => prev.filter((v) => v.id !== itemId));
    setToastMessage("Item removed");
  }, [setTasks, setExpenses, setVendors, setToastMessage]);

  const filteredTasks = useMemo(() => tasks.filter((t) => {
    const matchesStatus = filterStatus === "All" || (filterStatus === "Open" ? !t.done : t.done);
    const matchesQuery = t.text.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesQuery;
  }), [tasks, filterStatus, searchQuery]);

  return (
    <>
      <section className="workspace-hero" aria-label={`${activePage} page header`}>
        <div className="workspace-icon" aria-hidden="true"><PageIcon size={24} /></div>
        <div>
          <p className="eyebrow">{pageConfig[0]}</p>
          <h1>{pageConfig[1]}</h1>
          <p>{pageConfig[2]}</p>
        </div>
      </section>

      {activePage === "My plan" && (
        <section className="workspace-card plan-card" aria-label="All planning tasks">
          <PanelHead
            label={`${tasks.filter((t) => !t.done).length} OPEN TASKS`}
            title="All planning tasks"
          />
          <button
            id="new-task-btn"
            className="primary card-action"
            onClick={() => setModalType("task")}
            aria-label="Add a new planning task"
          >
            <Plus size={16} aria-hidden="true" />
            New task
          </button>
          <div className="toolbar" role="toolbar" aria-label="Task filters">
            <div className="filter-tabs" role="group" aria-label="Filter by status">
              {["All", "Open", "Done"].map((status) => (
                <button
                  key={status}
                  id={`filter-${status.toLowerCase()}`}
                  className={filterStatus === status ? "selected" : ""}
                  onClick={() => setFilterStatus(status)}
                  aria-pressed={filterStatus === status}
                >
                  {status}
                </button>
              ))}
            </div>
            <label className="mini-search" htmlFor="task-search">
              <Search size={15} aria-hidden="true" />
              <input
                id="task-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter tasks…"
                aria-label="Filter tasks by name"
                type="search"
              />
            </label>
          </div>
          <div className="full-task-list" role="list" aria-label="Filtered tasks" aria-live="polite">
            {filteredTasks.map((task) => (
              <div className={task.done ? "full-task done" : "full-task"} key={task.id} role="listitem">
                <TaskItem task={task} onToggle={toggleTask} />
                <button
                  className="delete-task"
                  onClick={() => removeItem(task.id, "task")}
                  aria-label={`Delete task: ${task.text}`}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            ))}
            {!filteredTasks.length && (
              <p className="empty" role="status">No tasks match that filter. Enjoy the breathing room.</p>
            )}
          </div>
        </section>
      )}

      {activePage === "Budget" && (
        <section className="budget-workspace" aria-label="Budget workspace">
          <div className="workspace-card budget-summary">
            <span className="section-label">TOTAL EVENT BUDGET</span>
            <strong>{formatCurrency(event.budget)}</strong>
            <p>
              {formatCurrency(totalSpent)} planned ·{" "}
              <b>{formatCurrency(event.budget - totalSpent)} remaining</b>
            </p>
            <div
              className="big-bar"
              role="progressbar"
              aria-valuenow={Math.min(100, Math.round((totalSpent / event.budget) * 100))}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Budget usage progress bar"
            >
              <i style={{ width: `${Math.min(100, (totalSpent / event.budget) * 100)}%` }} aria-hidden="true" />
            </div>
            {event.budget - totalSpent < 0 && (
              <p className="budget-warning" role="alert" aria-live="assertive">
                ⚠️ You are {formatCurrency(Math.abs(event.budget - totalSpent))} over budget!
              </p>
            )}
            <button
              id="add-expense-btn"
              className="primary"
              onClick={() => setModalType("expense")}
              aria-label="Add a new expense"
            >
              <Plus size={17} aria-hidden="true" />
              Add expense
            </button>
          </div>
          <div className="workspace-card allocation">
            <PanelHead label="EXPENSE LEDGER" title="Every commitment" />
            <span className="progress-copy">{formatCurrency(totalPaid)} paid</span>
            <ul className="ledger-list" aria-label="Expense items">
              {expenses.map((expense) => (
                <li className="ledger-row" key={expense.id}>
                  <i className="allocation-dot purple" aria-hidden="true" />
                  <div>
                    <strong>{expense.name}</strong>
                    <small>{expense.category} · {expense.status}</small>
                  </div>
                  <b>{formatCurrency(expense.amount)}</b>
                  <button
                    className="delete-task"
                    onClick={() => removeItem(expense.id, "expense")}
                    aria-label={`Delete expense: ${expense.name}`}
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {activePage === "Vendors" && (
        <section className="vendor-workspace" aria-label="Vendor workspace">
          <div className="workspace-card vendor-feature">
            <span className="section-label">TEAM STATUS</span>
            <h2>
              {vendors.filter((v) => v.status === "Booked").length} booked partner
              {vendors.filter((v) => v.status === "Booked").length === 1 ? "" : "s"}
            </h2>
            <p>Keep contacts, decisions, and next steps at your fingertips.</p>
            <div>
              <span aria-hidden="true">✦</span>
              <b>{vendors.length} vendors in your directory</b>
            </div>
            <button
              id="add-vendor-btn"
              className="primary"
              onClick={() => setModalType("vendor")}
              aria-label="Add a new vendor"
            >
              <Plus size={16} aria-hidden="true" />
              Add vendor
            </button>
          </div>
          <div className="workspace-card vendor-board">
            <PanelHead label="VENDOR DIRECTORY" title="Compare with confidence" />
            <ul className="vendor-list" aria-label="Vendor directory">
              {vendors.map((vendor) => (
                <li className="vendor-row" key={vendor.id}>
                  <span className={`vendor-icon ${vendor.color}`} aria-hidden="true">✦</span>
                  <div>
                    <strong>{vendor.name}</strong>
                    <small>{vendor.type} · {vendor.contact}</small>
                  </div>
                  <span className={`status ${vendor.status.toLowerCase()}`} aria-label={`Status: ${vendor.status}`}>
                    {vendor.status}
                  </span>
                  <button
                    className="delete-task"
                    onClick={() => removeItem(vendor.id, "vendor")}
                    aria-label={`Delete vendor: ${vendor.name}`}
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {activePage === "Ideas" && (
        <IdeasSection addTask={addTask} setToastMessage={setToastMessage} eventType={event.type} />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Ideas section (expanded with event-type-specific ideas)
// ---------------------------------------------------------------------------
function IdeasSection({ addTask, setToastMessage, eventType }) {
  const IDEAS_BY_TYPE = {
    Wedding: [
      { title: "A citrus welcome", copy: "Greet guests with sparkling yuzu drinks and handwritten place cards.", emoji: "🍋", category: "Guests" },
      { title: "The story wall", copy: "Turn favourite moments into a photo gallery guests can wander through.", emoji: "🖼️", category: "Design" },
      { title: "Midnight snack bar", copy: "A late-night treat that gives everyone a reason to stay a little longer.", emoji: "🍰", category: "Food" },
      { title: "Personalized vow booklets", copy: "Print ceremony programs as keepsake booklets with your love story.", emoji: "📖", category: "Design" },
      { title: "Garden ceremony arch", copy: "A floral arch framing your vows with lush blooms and trailing greenery.", emoji: "🌸", category: "Venue" },
      { title: "Live cocktail calligrapher", copy: "An artist writing guest names on cocktail glasses as personalized keepsakes.", emoji: "✍️", category: "Guests" },
    ],
    Birthday: [
      { title: "Decade photo timeline", copy: "Display photos from each year of their life in a chronological gallery.", emoji: "📸", category: "Design" },
      { title: "Signature cocktail bar", copy: "Create a birthday-themed drink named after the guest of honor.", emoji: "🍹", category: "Food" },
      { title: "Message-in-a-bottle station", copy: "Guests write birthday wishes to be opened at a future milestone.", emoji: "🍾", category: "Guests" },
      { title: "Surprise performance", copy: "Book their favourite tribute band or performer for an unforgettable moment.", emoji: "🎤", category: "Music" },
    ],
    "Community event": [
      { title: "Live donation tracker", copy: "A real-time display board showing fundraising progress towards the goal.", emoji: "📊", category: "Design" },
      { title: "Interactive activity booths", copy: "Engage attendees with hands-on community activities and local art.", emoji: "🎨", category: "Guests" },
      { title: "Local vendor showcase", copy: "Feature community businesses with curated market stalls at the event.", emoji: "🏪", category: "Venue" },
      { title: "Community memory wall", copy: "A shared space where attendees contribute messages and memories.", emoji: "💬", category: "Design" },
    ],
    Corporate: [
      { title: "Brand storytelling wall", copy: "Visual timeline of company milestones that doubles as a conversation piece.", emoji: "🏆", category: "Design" },
      { title: "Expert panel session", copy: "Invite industry thought leaders for an interactive Q&A discussion.", emoji: "💼", category: "Guests" },
      { title: "Team photo mosaic", copy: "Compile individual headshots into a single large team portrait artwork.", emoji: "🖼️", category: "Design" },
    ],
  };

  const ideas = IDEAS_BY_TYPE[eventType] || IDEAS_BY_TYPE["Wedding"];

  return (
    <section className="ideas-grid" aria-label="Event ideas and inspiration">
      {ideas.map(({ title, copy, emoji, category }) => (
        <article className="idea-card" key={title}>
          <span aria-hidden="true" role="presentation">{emoji}</span>
          <small>CURATED IDEA</small>
          <h2>{title}</h2>
          <p>{copy}</p>
          <button
            className="text-button"
            onClick={() => {
              addTask({ text: title, group: "Someday", priority: "Low", category });
              setToastMessage("Idea added to your plan ✓");
            }}
            aria-label={`Add idea "${title}" to your plan`}
          >
            Add to plan <ArrowRight size={16} aria-hidden="true" />
          </button>
        </article>
      ))}
      <aside className="workspace-card idea-prompt" aria-label="AI inspiration prompt">
        <Target size={23} aria-hidden="true" />
        <h2>Make it personal</h2>
        <p>Use the AI assistant to turn your vision into actionable tasks. Ask about themes, décor, or any aspect of your {eventType?.toLowerCase() ?? "event"}.</p>
      </aside>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------
function PanelHead({ label, title, action, onActionClick }) {
  return (
    <div className="panel-title">
      <div>
        <span className="section-label">{label}</span>
        <h2>{title}</h2>
      </div>
      {action && (
        <button className="quiet-button" onClick={onActionClick} aria-label={`${action}: ${title}`}>
          {action}
        </button>
      )}
    </div>
  );
}

function TaskItem({ task, onToggle }) {
  const checkboxId = `task-check-${task.id}`;
  return (
    <div className={task.done ? "task done" : "task"} role="listitem">
      <input
        id={checkboxId}
        type="checkbox"
        checked={task.done}
        onChange={() => onToggle(task.id)}
        aria-label={`${task.done ? "Mark incomplete" : "Mark complete"}: ${task.text}`}
      />
      <label htmlFor={checkboxId} className="task-label-wrapper">
        <span className="custom-check" aria-hidden="true">{task.done && <Check size={14} />}</span>
        <span className="task-text">
          {task.text}
          <small>
            {task.group} ·{" "}
            <b className={task.priority.toLowerCase()}>{task.priority} priority</b>
            {task.category && ` · ${task.category}`}
          </small>
        </span>
      </label>
    </div>
  );
}

function PulseItem({ n, text, color }) {
  return (
    <div className="timeline-item">
      <div className={`date ${color}`} aria-hidden="true"><strong>{n}</strong></div>
      <div>
        <strong>{n} {text}</strong>
        <small>Up to date and saved locally</small>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editor modal (form dialogs)
// ---------------------------------------------------------------------------
function Editor({ type, event, close, save }) {
  const firstFieldRef = useRef(null);
  const [formError, setFormError] = useState("");

  // Focus first field on open and restore focus on close
  useEffect(() => {
    const previousFocus = document.activeElement;
    setTimeout(() => firstFieldRef.current?.focus(), 50);
    return () => previousFocus?.focus();
  }, []);

  // Keyboard trap: close on Escape
  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [close]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    setFormError("");
    save(type, data);
  };

  const TITLES = { event: "Event details", task: "Add a task", vendor: "Add a vendor", expense: "Add an expense" };

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={close}
      aria-hidden="false"
    >
      <form
        className="modal"
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        onMouseDown={(e) => e.stopPropagation()}
        noValidate
      >
        <button type="button" className="close" onClick={close} aria-label="Close dialog">
          <X size={20} aria-hidden="true" />
        </button>
        <span className="pill">
          <Sparkles size={14} aria-hidden="true" /> Checker workspace
        </span>
        <h2 id="dialog-title">{TITLES[type]}</h2>

        {formError && (
          <p className="form-error" role="alert" aria-live="assertive">{formError}</p>
        )}

        {type === "event" && (
          <>
            <FormField ref={firstFieldRef} name="name" label="Event name" defaultValue={event.name} />
            <FormField name="date" label="Date" type="date" defaultValue={event.date} />
            <div className="form-grid">
              <FormSelect name="type" label="Event type" defaultValue={event.type}
                options={["Wedding", "Birthday", "Corporate", "Community event", "Other"]} />
              <FormField name="guests" label="Guests" type="number" defaultValue={event.guests} min="1" />
            </div>
            <FormField name="budget" label="Budget (USD)" type="number" defaultValue={event.budget} min="0" />
          </>
        )}

        {type === "task" && (
          <>
            <FormField ref={firstFieldRef} name="text" label="What needs to happen?" placeholder="e.g. Book ceremony musician" maxLength="200" />
            <div className="form-grid">
              <FormSelect name="group" label="When" options={["This week", "Next week", "This month", "Someday"]} />
              <FormSelect name="priority" label="Priority" defaultValue="Medium" options={["High", "Medium", "Low"]} />
            </div>
            <FormSelect name="category" label="Category" options={EXPENSE_CATEGORIES} />
          </>
        )}

        {type === "vendor" && (
          <>
            <FormField ref={firstFieldRef} name="name" label="Vendor name" />
            <FormField name="type" label="Service type" placeholder="e.g. Photography" />
            <div className="form-grid">
              <FormSelect name="status" label="Status" options={["Researching", "Contacted", "Comparing", "Booked"]} />
              <FormField name="contact" label="Contact" placeholder="Name, email, or phone" />
            </div>
          </>
        )}

        {type === "expense" && (
          <>
            <FormField ref={firstFieldRef} name="name" label="Expense name" />
            <div className="form-grid">
              <FormField name="amount" label="Amount" type="number" min="0" placeholder="0" />
              <FormSelect name="status" label="Status" options={["Planned", "Paid"]} />
            </div>
            <FormSelect name="category" label="Category" options={EXPENSE_CATEGORIES} />
          </>
        )}

        <button className="primary" type="submit" id="dialog-save-btn">
          Save changes <ArrowRight size={17} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Form primitive components
// ---------------------------------------------------------------------------
import { forwardRef } from "react";

const FormField = forwardRef(function FormField({ name, label, type = "text", defaultValue, placeholder, min, max, maxLength }, ref) {
  const inputId = `field-${name}`;
  return (
    <div className="form-field">
      <label htmlFor={inputId}>{label}</label>
      <input
        ref={ref}
        id={inputId}
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        min={min}
        max={max}
        maxLength={maxLength}
        required
        aria-required="true"
      />
    </div>
  );
});

function FormSelect({ name, label, defaultValue, options }) {
  const selectId = `select-${name}`;
  return (
    <div className="form-field">
      <label htmlFor={selectId}>{label}</label>
      <select id={selectId} name={name} defaultValue={defaultValue} aria-required="true">
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Search overlay
// ---------------------------------------------------------------------------
function SearchBox({ tasks, vendors, close, navigateTo }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handleKeyDown = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [close]);

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    return [
      ...tasks.map((t) => ({ ...t, resultType: "Task", targetPage: "My plan" })),
      ...vendors.map((v) => ({ ...v, text: v.name, resultType: "Vendor", targetPage: "Vendors" })),
    ].filter((item) => item.text.toLowerCase().includes(query.toLowerCase()));
  }, [tasks, vendors, query]);

  return (
    <div
      className="modal-backdrop search-backdrop"
      role="presentation"
      onMouseDown={close}
    >
      <div
        className="search-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Search tasks and vendors"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="search-input-row">
          <Search size={19} aria-hidden="true" />
          <input
            ref={inputRef}
            id="global-search-input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks and vendors…"
            aria-label="Search tasks and vendors"
          />
          <button onClick={close} aria-label="Close search"><X size={19} aria-hidden="true" /></button>
        </div>
        <ul aria-label="Search results" aria-live="polite">
          {searchResults.slice(0, 7).map((result) => (
            <li key={result.resultType + result.id}>
              <button
                onClick={() => { navigateTo(result.targetPage); close(); }}
                aria-label={`Go to ${result.resultType}: ${result.text}`}
              >
                <span className="result-type">{result.resultType}</span>
                {result.text}
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
        {query.trim() && !searchResults.length && (
          <p className="empty" role="status">Nothing matches that search.</p>
        )}
        {!query.trim() && (
          <p className="search-hint" role="status">Start typing to search tasks and vendors…</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AI Chat panel — powered by Gemini 1.5 Flash with local fallback
// ---------------------------------------------------------------------------
function Chat({ tasks, expenses, vendors, event, addTask, close }) {
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [conversation, setConversation] = useState([
    {
      role: "assistant",
      text: `Hi! I'm your Gemini AI planning assistant for ${event.name}. You have ${tasks.filter((t) => !t.done).length} open tasks. What would make planning feel easier today?`,
    },
  ]);
  const chatBodyRef = useRef(null);
  const inputRef = useRef(null);

  // Create one persistent Gemini chat session for the whole conversation.
  // useRef so it isn't recreated on every render.
  const geminiChat = useRef(null);
  useEffect(() => {
    geminiChat.current = createGeminiChat({ tasks, expenses, vendors, event });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally created once at mount

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [conversation, isTyping]);

  // Focus input on open; close on Escape
  useEffect(() => {
    inputRef.current?.focus();
    const handleKeyDown = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [close]);

  const sendMessage = useCallback(async (messageText) => {
    const text = (messageText ?? inputMessage).trim();
    if (!text || isTyping) return;

    setConversation((prev) => [...prev, { role: "user", text }]);
    setInputMessage("");
    setIsTyping(true);

    try {
      const aiResponse = await geminiChat.current.sendMessage(text);
      setConversation((prev) => [...prev, { role: "assistant", text: aiResponse }]);
    } catch {
      setConversation((prev) => [
        ...prev,
        { role: "assistant", text: "Sorry, I had trouble connecting. Please try again!" },
      ]);
    } finally {
      setIsTyping(false);
    }
  }, [inputMessage, isTyping]);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    sendMessage();
  };

  const QUICK_ACTIONS = [
    { label: "💰 Budget", message: "Give me budget advice" },
    { label: "📋 Next task", message: "What should I do next?" },
    { label: "🏢 Vendors", message: "How are my vendors looking?" },
    { label: "✨ Ideas", message: "Give me creative ideas for my event" },
    { label: "📅 Timeline", message: "What are the key milestones I should hit?" },
  ];

  const isGeminiReal = geminiChat.current?.isReal;

  return (
    <aside className="chat" aria-label="Checker AI planning assistant" role="complementary">
      <header>
        <div>
          <span className="chat-avatar" aria-hidden="true"><Sparkles size={17} /></span>
          <div>
            <strong>Checker AI</strong>
            <small>
              {isGeminiReal ? (
                <span className="gemini-badge" aria-label="Powered by Gemini AI">
                  ✦ Powered by Gemini
                </span>
              ) : (
                "Planning companion"
              )}
            </small>
          </div>
        </div>
        <button className="icon-button" onClick={close} aria-label="Close planning assistant">
          <X size={19} aria-hidden="true" />
        </button>
      </header>

      <div
        className="chat-body"
        ref={chatBodyRef}
        role="log"
        aria-label="Conversation with AI assistant"
        aria-live="polite"
        aria-atomic="false"
      >
        {conversation.map((msg, index) => (
          <div
            key={index}
            className={msg.role === "user" ? "ai-message user-message" : "ai-message"}
            aria-label={msg.role === "user" ? "You said" : "AI assistant replied"}
          >
            {msg.text}
          </div>
        ))}
        {isTyping && (
          <div className="ai-message typing" aria-label="AI is typing a response">
            <span className="typing-dot" aria-hidden="true" />
            <span className="typing-dot" aria-hidden="true" />
            <span className="typing-dot" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="suggestion-row" role="group" aria-label="Quick action suggestions">
        {QUICK_ACTIONS.map(({ label, message }) => (
          <button
            key={label}
            onClick={() => sendMessage(message)}
            aria-label={`Quick action: ${label}`}
            disabled={isTyping}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleFormSubmit} aria-label="Message input">
        <input
          ref={inputRef}
          id="chat-input"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Ask anything about your event…"
          aria-label="Type a message to the AI assistant"
          maxLength={500}
          disabled={isTyping}
        />
        <button
          type="submit"
          aria-label="Send message"
          disabled={!inputMessage.trim() || isTyping}
        >
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </form>
    </aside>
  );
}

export default App;
