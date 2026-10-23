import { useEffect, useState } from "react";
import {
  ArrowRight,
  Bell,
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

const initialTasks = [
  {
    id: 1,
    text: "Confirm venue booking",
    group: "This week",
    done: true,
    priority: "High",
    category: "Venue",
  },
  {
    id: 2,
    text: "Shortlist caterers",
    group: "This week",
    done: false,
    priority: "High",
    category: "Food",
  },
  {
    id: 3,
    text: "Send save-the-dates",
    group: "This week",
    done: false,
    priority: "Medium",
    category: "Guests",
  },
  {
    id: 4,
    text: "Finalize floral moodboard",
    group: "Next week",
    done: false,
    priority: "Low",
    category: "Design",
  },
];
const initialExpenses = [
  {
    id: 1,
    name: "Venue deposit",
    category: "Venue",
    amount: 5000,
    status: "Paid",
  },
  {
    id: 2,
    name: "Catering estimate",
    category: "Food",
    amount: 3420,
    status: "Planned",
  },
  {
    id: 3,
    name: "Florals & decor",
    category: "Design",
    amount: 2150,
    status: "Planned",
  },
  {
    id: 4,
    name: "Photography retainer",
    category: "Photo",
    amount: 1450,
    status: "Paid",
  },
];
const initialVendors = [
  {
    id: 1,
    name: "The Glasshouse",
    type: "Venue",
    status: "Booked",
    contact: "Maya · (555) 014-2222",
    color: "purple",
  },
  {
    id: 2,
    name: "Marigold Kitchen",
    type: "Catering",
    status: "Comparing",
    contact: "hello@marigold.test",
    color: "orange",
  },
  {
    id: 3,
    name: "Mira Flores",
    type: "Florals",
    status: "Contacted",
    contact: "Mira · (555) 014-9811",
    color: "pink",
  },
];
const categories = [
  "Venue",
  "Food",
  "Guests",
  "Design",
  "Photo",
  "Music",
  "Other",
];
const load = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};
const cash = (v) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);

function App() {
  const [active, setActive] = useState("Overview"),
    [event, setEvent] = useState(() =>
      load("checker-event", {
        name: "Leah & Arjun's wedding",
        date: "2025-06-14",
        type: "Wedding",
        guests: 142,
        budget: 22000,
      }),
    ),
    [tasks, setTasks] = useState(() => load("checker-tasks", initialTasks)),
    [expenses, setExpenses] = useState(() =>
      load("checker-expenses", initialExpenses),
    ),
    [vendors, setVendors] = useState(() =>
      load("checker-vendors", initialVendors),
    ),
    [notes, setNotes] = useState(
      () => localStorage.getItem("checker-notes") || "",
    ),
    [modal, setModal] = useState(""),
    [toast, setToast] = useState(""),
    [chat, setChat] = useState(false),
    [search, setSearch] = useState(false),
    [menu, setMenu] = useState(false);
  useEffect(
    () => localStorage.setItem("checker-event", JSON.stringify(event)),
    [event],
  );
  useEffect(
    () => localStorage.setItem("checker-tasks", JSON.stringify(tasks)),
    [tasks],
  );
  useEffect(
    () => localStorage.setItem("checker-expenses", JSON.stringify(expenses)),
    [expenses],
  );
  useEffect(
    () => localStorage.setItem("checker-vendors", JSON.stringify(vendors)),
    [vendors],
  );
  useEffect(() => localStorage.setItem("checker-notes", notes), [notes]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);
  const spent = expenses.reduce((s, x) => s + x.amount, 0),
    paid = expenses
      .filter((x) => x.status === "Paid")
      .reduce((s, x) => s + x.amount, 0),
    done = tasks.filter((x) => x.done).length,
    progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const toggle = (id) =>
    setTasks((xs) =>
      xs.map((x) => (x.id === id ? { ...x, done: !x.done } : x)),
    );
  const addTask = (x) => {
    setTasks((xs) => [...xs, { id: Date.now(), done: false, ...x }]);
    setToast("Task added to your plan");
  };
  const page = (x) => {
    setActive(x);
    setMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const add = (kind, data) => {
    if (kind === "event")
      setEvent({
        ...data,
        budget: Number(data.budget),
        guests: Number(data.guests),
      });
    if (kind === "task") addTask(data);
    if (kind === "expense")
      setExpenses((xs) => [
        ...xs,
        { id: Date.now(), ...data, amount: Number(data.amount) },
      ]);
    if (kind === "vendor")
      setVendors((xs) => [...xs, { id: Date.now(), color: "purple", ...data }]);
    setModal("");
  };
  const nav = [
    [LayoutDashboard, "Overview"],
    [ListChecks, "My plan"],
    [CircleDollarSign, "Budget"],
    [Users, "Vendors"],
    [Lightbulb, "Ideas"],
  ];
  return (
    <main className="app-shell">
      <aside className={menu ? "sidebar open" : "sidebar"}>
        <a className="brand" href="#top" onClick={() => page("Overview")}>
          <span className="brand-mark">
            <Check size={17} />
          </span>{" "}
          checker
        </a>
        <button className="event-switcher" onClick={() => setModal("event")}>
          <span className="event-icon">
            <Heart size={16} fill="currentColor" />
          </span>
          <div>
            <strong>{event.name}</strong>
            <span>
              {new Date(event.date + "T12:00").toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
          <ChevronDown size={16} />
        </button>
        <nav>
          {nav.map(([Icon, label]) => (
            <button
              key={label}
              className={active === label ? "nav-item active" : "nav-item"}
              onClick={() => page(label)}
            >
              <Icon size={19} />
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item" onClick={() => setModal("event")}>
            <Settings size={19} />
            Event settings
          </button>
          <div className="profile">
            <span>JS</span>
            <div>
              <strong>Joseph</strong>
              <small>Planner</small>
            </div>
            <MoreHorizontal size={18} />
          </div>
        </div>
      </aside>
      <section className="content" id="top">
        <header className="topbar">
          <button
            className="mobile-menu"
            onClick={() => setMenu(!menu)}
            aria-label="Toggle navigation"
            aria-expanded={menu}
          >
            <Menu size={22} />
          </button>
          <div className="crumb">
            <span>My events</span>
            <ChevronDown size={15} />
            <strong>{event.name}</strong>
          </div>
          <div className="header-actions">
            <button
              className="icon-button"
              onClick={() => setSearch(true)}
              aria-label="Search tasks and vendors"
            >
              <Search size={19} />
            </button>
            <button
              className="icon-button notification"
              aria-label="Show task reminders"
              onClick={() =>
                setToast(
                  `${tasks.filter((x) => !x.done).length} tasks need attention`,
                )
              }
            >
              <Bell size={19} />
              <i />
            </button>
            <button className="help" onClick={() => setChat(true)}>
              <MessageCircle size={17} />
              Need help?
            </button>
          </div>
        </header>
        <div className="page">
          {active === "Overview" ? (
            <Overview
              {...{
                event,
                tasks,
                vendors,
                expenses,
                spent,
                paid,
                progress,
                notes,
                setNotes,
                toggle,
                page,
                setModal,
              }}
            />
          ) : (
            <Workspace
              {...{
                active,
                event,
                tasks,
                setTasks,
                vendors,
                setVendors,
                expenses,
                setExpenses,
                spent,
                paid,
                toggle,
                setModal,
                setToast,
                addTask,
              }}
            />
          )}
        </div>
      </section>
      <button
        className="ai-fab"
        onClick={() => setChat(true)}
        aria-label="Open Checker planning assistant"
      >
        <Sparkles size={21} />
        <span>Ask Checker</span>
      </button>
      {toast && (
        <div className="toast">
          <CheckCircle2 size={18} />
          {toast}
        </div>
      )}
      {modal && (
        <Editor
          type={modal}
          event={event}
          close={() => setModal("")}
          save={add}
        />
      )}{" "}
      {search && (
        <SearchBox
          tasks={tasks}
          vendors={vendors}
          close={() => setSearch(false)}
          page={page}
        />
      )}{" "}
      {chat && (
        <Chat tasks={tasks} addTask={addTask} close={() => setChat(false)} />
      )}
    </main>
  );
}

function Overview({
  event,
  tasks,
  vendors,
  expenses,
  spent,
  paid,
  progress,
  notes,
  setNotes,
  toggle,
  page,
  setModal,
}) {
  const next = tasks.find((x) => !x.done);
  return (
    <>
      <div className="welcome-row">
        <div>
          <p className="eyebrow">
            {event.type.toUpperCase()} · {event.guests} GUESTS
          </p>
          <h1>
            Good morning, Joseph <span>✦</span>
          </h1>
          <p className="subhead">A calm command center for {event.name}.</p>
        </div>
        <button className="primary" onClick={() => setModal("event")}>
          <Settings size={17} />
          Edit event
        </button>
      </div>
      <section className="hero-card">
        <div className="hero-copy">
          <span className="pill">
            <Sparkles size={14} />
            {progress >= 60
              ? " Your plan is on track"
              : " A few easy wins await"}
          </span>
          <h2>Little steps, big celebration.</h2>
          <p>
            {next
              ? `Next up: ${next.text}. Keep the momentum with one meaningful task at a time.`
              : "Your checklist is complete. Take a breath—you are ready."}
          </p>
          <button className="text-button" onClick={() => page("My plan")}>
            View full plan <ArrowRight size={16} />
          </button>
        </div>
        <div className="progress-orbit">
          <svg viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" />
            <circle
              className="progress-ring"
              cx="60"
              cy="60"
              r="50"
              style={{ strokeDashoffset: 314 - (314 * progress) / 100 }}
            />
          </svg>
          <div>
            <strong>{progress}%</strong>
            <span>complete</span>
          </div>
        </div>
        <div className="hero-art">
          <div className="arch">
            <span />
            <span />
            <span />
          </div>
          <Flower2 />
          <span className="leaf leaf-one">✦</span>
        </div>
      </section>
      <section className="dashboard-grid">
        <div className="panel task-panel">
          <Head
            label="YOUR NEXT STEPS"
            title="Planning checklist"
            action="View all"
            onClick={() => page("My plan")}
          />
          <div className="task-list">
            {tasks.slice(0, 4).map((x) => (
              <Task task={x} toggle={toggle} key={x.id} />
            ))}
          </div>
          <button className="add-inline" onClick={() => setModal("task")}>
            <Plus size={16} />
            Add a task
          </button>
        </div>
        <div className="panel budget-panel">
          <Head
            label="BUDGET OVERVIEW"
            title="Your spending"
            action="Details"
            onClick={() => page("Budget")}
          />
          <div className="budget-figure">
            <div>
              <strong>{cash(spent)}</strong>
              <span>of {cash(event.budget)} planned</span>
            </div>
            <span className="remaining">{cash(event.budget - spent)} left</span>
          </div>
          <div className="bar">
            <i
              style={{
                width: `${Math.min(100, (spent / event.budget) * 100)}%`,
              }}
            />
          </div>
          <div className="budget-legend">
            <span>
              <i className="dot purple" />
              Paid <b>{cash(paid)}</b>
            </span>
            <span>
              <i className="dot orange" />
              Planned <b>{cash(spent - paid)}</b>
            </span>
          </div>
          <div className="budget-tip">
            <Sparkles size={17} />
            <p>
              <b>Planning tip:</b> Keep a small buffer for the lovely surprises
              that appear.
            </p>
          </div>
        </div>
        <div className="panel timeline-panel">
          <Head label="PLANNING PULSE" title="At a glance" />
          <div className="timeline">
            <Pulse
              n={tasks.filter((x) => !x.done).length}
              text="open tasks"
              color="orange"
            />
            <Pulse n={vendors.length} text="vendors tracked" color="purple" />
            <Pulse n={expenses.length} text="budget items" color="pink" />
          </div>
        </div>
        <div className="panel notes-panel">
          <Head label="PRIVATE NOTES" title="Keep the good ideas" />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="A song, a thought, a reminder…"
          />
          <small>Saves automatically on this device.</small>
        </div>
      </section>
    </>
  );
}
function Head({ label, title, action, onClick }) {
  return (
    <div className="panel-title">
      <div>
        <span className="section-label">{label}</span>
        <h2>{title}</h2>
      </div>
      {action && (
        <button className="quiet-button" onClick={onClick}>
          {action}
        </button>
      )}
    </div>
  );
}
function Task({ task, toggle }) {
  return (
    <label className={task.done ? "task done" : "task"}>
      <input
        type="checkbox"
        checked={task.done}
        onChange={() => toggle(task.id)}
      />
      <span className="custom-check">{task.done && <Check size={14} />}</span>
      <span className="task-text">
        {task.text}
        <small>
          {task.group} ·{" "}
          <b className={task.priority.toLowerCase()}>
            {task.priority} priority
          </b>
          {task.category && ` · ${task.category}`}
        </small>
      </span>
    </label>
  );
}
function Pulse({ n, text, color }) {
  return (
    <div className="timeline-item">
      <div className={`date ${color}`}>
        <strong>{n}</strong>
      </div>
      <div>
        <strong>{text}</strong>
        <small>Up to date and saved locally</small>
      </div>
    </div>
  );
}

function Workspace({
  active,
  event,
  tasks,
  setTasks,
  vendors,
  setVendors,
  expenses,
  setExpenses,
  spent,
  paid,
  toggle,
  setModal,
  setToast,
  addTask,
}) {
  const [filter, setFilter] = useState("All"),
    [query, setQuery] = useState("");
  const cfg = {
      "My plan": [
        "YOUR ROADMAP",
        "Your planning plan",
        "A clear path from first idea to last dance.",
        ListChecks,
      ],
      Budget: [
        "FINANCIAL CLARITY",
        "A budget with breathing room",
        "See every commitment in one place.",
        CircleDollarSign,
      ],
      Vendors: [
        "YOUR DREAM TEAM",
        "People making it happen",
        "Keep your collaborators beautifully organized.",
        Users,
      ],
      Ideas: [
        "CREATIVE DIRECTION",
        "Ideas with your name on them",
        "Small touches that make the day unforgettable.",
        Lightbulb,
      ],
    }[active],
    Icon = cfg[3],
    remove = (id, k) => {
      if (k === "task") setTasks(tasks.filter((x) => x.id !== id));
      if (k === "expense") setExpenses(expenses.filter((x) => x.id !== id));
      if (k === "vendor") setVendors(vendors.filter((x) => x.id !== id));
      setToast("Removed");
    },
    shown = tasks.filter(
      (x) =>
        (filter === "All" || filter === "Open" ? !x.done : x.done) &&
        x.text.toLowerCase().includes(query.toLowerCase()),
    );
  return (
    <>
      <section className="workspace-hero">
        <div className="workspace-icon">
          <Icon size={24} />
        </div>
        <div>
          <p className="eyebrow">{cfg[0]}</p>
          <h1>{cfg[1]}</h1>
          <p>{cfg[2]}</p>
        </div>
      </section>
      {active === "My plan" && (
        <section className="workspace-card plan-card">
          <Head
            label={`${tasks.filter((x) => !x.done).length} OPEN TASKS`}
            title="All planning tasks"
          />
          <button
            className="primary card-action"
            onClick={() => setModal("task")}
          >
            <Plus size={16} />
            New task
          </button>
          <div className="toolbar">
            <div className="filter-tabs">
              {["All", "Open", "Done"].map((x) => (
                <button
                  key={x}
                  className={filter === x ? "selected" : ""}
                  onClick={() => setFilter(x)}
                >
                  {x}
                </button>
              ))}
            </div>
            <label className="mini-search">
              <Search size={15} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter tasks"
                aria-label="Filter tasks"
              />
            </label>
          </div>
          <div className="full-task-list">
            {shown.map((x) => (
              <div
                className={x.done ? "full-task done" : "full-task"}
                key={x.id}
              >
                <Task task={x} toggle={toggle} />
                <button
                  className="delete-task"
                  onClick={() => remove(x.id, "task")}
                  aria-label={`Delete task: ${x.text}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {!shown.length && (
              <p className="empty">No tasks found. Enjoy the breathing room.</p>
            )}
          </div>
        </section>
      )}
      {active === "Budget" && (
        <section className="budget-workspace">
          <div className="workspace-card budget-summary">
            <span className="section-label">TOTAL EVENT BUDGET</span>
            <strong>{cash(event.budget)}</strong>
            <p>
              {cash(spent)} planned ·{" "}
              <b>{cash(event.budget - spent)} remaining</b>
            </p>
            <div className="big-bar">
              <i
                style={{
                  width: `${Math.min(100, (spent / event.budget) * 100)}%`,
                }}
              />
            </div>
            <button className="primary" onClick={() => setModal("expense")}>
              <Plus size={17} />
              Add expense
            </button>
          </div>
          <div className="workspace-card allocation">
            <Head label="EXPENSE LEDGER" title="Every commitment" />
            <span className="progress-copy">{cash(paid)} paid</span>
            {expenses.map((x) => (
              <div className="ledger-row" key={x.id}>
                <i className="allocation-dot purple" />
                <div>
                  <strong>{x.name}</strong>
                  <small>
                    {x.category} · {x.status}
                  </small>
                </div>
                <b>{cash(x.amount)}</b>
                <button
                  className="delete-task"
                  onClick={() => remove(x.id, "expense")}
                  aria-label={`Delete expense: ${x.name}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
      {active === "Vendors" && (
        <section className="vendor-workspace">
          <div className="workspace-card vendor-feature">
            <span className="section-label">TEAM STATUS</span>
            <h2>
              {vendors.filter((x) => x.status === "Booked").length} booked
              partner
              {vendors.filter((x) => x.status === "Booked").length === 1
                ? ""
                : "s"}
            </h2>
            <p>Keep contacts, decisions, and next steps at your fingertips.</p>
            <div>
              <span>✦</span>
              <b>{vendors.length} vendors in your directory</b>
            </div>
            <button className="primary" onClick={() => setModal("vendor")}>
              <Plus size={16} />
              Add vendor
            </button>
          </div>
          <div className="workspace-card vendor-board">
            <Head label="VENDOR DIRECTORY" title="Compare with confidence" />
            {vendors.map((x) => (
              <div className="vendor-row" key={x.id}>
                <span className={`vendor-icon ${x.color}`}>✦</span>
                <div>
                  <strong>{x.name}</strong>
                  <small>
                    {x.type} · {x.contact}
                  </small>
                </div>
                <span className={`status ${x.status.toLowerCase()}`}>
                  {x.status}
                </span>
                <button
                  className="delete-task"
                  onClick={() => remove(x.id, "vendor")}
                  aria-label={`Delete vendor: ${x.name}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
      {active === "Ideas" && <Ideas addTask={addTask} toast={setToast} />}
    </>
  );
}
function Ideas({ addTask, toast }) {
  const a = [
    [
      "A citrus welcome",
      "Greet guests with sparkling yuzu drinks and handwritten place cards.",
      "🍋",
    ],
    [
      "The story wall",
      "Turn favorite moments into a gallery guests can wander through.",
      "🖼️",
    ],
    [
      "Midnight snack bar",
      "A late-night treat that gives everyone a reason to stay a little longer.",
      "🍰",
    ],
  ];
  return (
    <section className="ideas-grid">
      {a.map(([title, copy, emoji]) => (
        <article className="idea-card" key={title}>
          <span>{emoji}</span>
          <small>CURATED IDEA</small>
          <h2>{title}</h2>
          <p>{copy}</p>
          <button
            className="text-button"
            onClick={() => {
              addTask({
                text: title,
                group: "Someday",
                priority: "Low",
                category: "Ideas",
              });
              toast("Idea added to your plan");
            }}
          >
            Add to plan <ArrowRight size={16} />
          </button>
        </article>
      ))}
      <aside className="workspace-card idea-prompt">
        <Target size={23} />
        <h2>Make it personal</h2>
        <p>Use the assistant to turn your vision into actionable tasks.</p>
      </aside>
    </section>
  );
}

function Editor({ type, event, close, save }) {
  const submit = (e) => {
    e.preventDefault();
    save(type, Object.fromEntries(new FormData(e.currentTarget)));
  };
  const title = {
    event: "Event details",
    task: "Add a task",
    vendor: "Add a vendor",
    expense: "Add an expense",
  }[type];
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={close}>
      <form
        className="modal"
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="close"
          onClick={close}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
        <span className="pill">
          <Sparkles size={14} /> Checker workspace
        </span>
        <h2 id="dialog-title">{title}</h2>
        {type === "event" ? (
          <>
            <Field n="name" l="Event name" d={event.name} />
            <Field n="date" l="Date" t="date" d={event.date} />
            <div className="form-grid">
              <Select
                n="type"
                l="Event type"
                d={event.type}
                o={[
                  "Wedding",
                  "Birthday",
                  "Corporate",
                  "Community event",
                  "Other",
                ]}
              />
              <Field n="guests" l="Guests" t="number" d={event.guests} />
            </div>
            <Field n="budget" l="Budget (USD)" t="number" d={event.budget} />
          </>
        ) : type === "task" ? (
          <>
            <Field
              n="text"
              l="What needs to happen?"
              p="e.g. Book ceremony musician"
            />
            <div className="form-grid">
              <Select
                n="group"
                l="When"
                o={["This week", "Next week", "This month", "Someday"]}
              />
              <Select
                n="priority"
                l="Priority"
                d="Medium"
                o={["High", "Medium", "Low"]}
              />
            </div>
            <Select n="category" l="Category" o={categories} />
          </>
        ) : type === "vendor" ? (
          <>
            <Field n="name" l="Vendor name" />
            <Field n="type" l="Service type" p="e.g. Photography" />
            <div className="form-grid">
              <Select
                n="status"
                l="Status"
                o={["Researching", "Contacted", "Comparing", "Booked"]}
              />
              <Field n="contact" l="Contact" p="Name, email, or phone" />
            </div>
          </>
        ) : (
          <>
            <Field n="name" l="Expense name" />
            <div className="form-grid">
              <Field n="amount" l="Amount" t="number" />
              <Select n="status" l="Status" o={["Planned", "Paid"]} />
            </div>
            <Select n="category" l="Category" o={categories} />
          </>
        )}
        <button className="primary" type="submit">
          Save changes <ArrowRight size={17} />
        </button>
      </form>
    </div>
  );
}
function Field({ n, l, t = "text", d, p }) {
  return (
    <label>
      {l}
      <input name={n} type={t} defaultValue={d} placeholder={p} required />
    </label>
  );
}
function Select({ n, l, d, o }) {
  return (
    <label>
      {l}
      <select name={n} defaultValue={d}>
        {o.map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>
    </label>
  );
}
function SearchBox({ tasks, vendors, close, page }) {
  const [q, setQ] = useState("");
  const results = [
    ...tasks.map((x) => ({ ...x, type: "Task", page: "My plan" })),
    ...vendors.map((x) => ({
      ...x,
      text: x.name,
      type: "Vendor",
      page: "Vendors",
    })),
  ].filter((x) => x.text.toLowerCase().includes(q.toLowerCase()));
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
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div>
          <Search size={19} />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tasks and vendors…"
            aria-label="Search tasks and vendors"
          />
          <button onClick={close} aria-label="Close search">
            <X size={19} />
          </button>
        </div>
        {results.slice(0, 7).map((x) => (
          <button
            key={x.type + x.id}
            onClick={() => {
              page(x.page);
              close();
            }}
          >
            <span>{x.type}</span>
            {x.text}
            <ArrowRight size={16} />
          </button>
        ))}
        {q && !results.length && (
          <p className="empty">Nothing matches that search.</p>
        )}
      </div>
    </div>
  );
}
function Chat({ tasks, addTask, close }) {
  const [msg, setMsg] = useState(""),
    [talk, setTalk] = useState([
      `Hi! You have ${tasks.filter((x) => !x.done).length} open tasks. What would make planning feel easier today?`,
    ]);
  const send = (e) => {
    e.preventDefault();
    if (!msg.trim()) return;
    const q = msg.toLowerCase(),
      answer = q.includes("budget")
        ? "Keep 8–10% of your total budget aside for late additions."
        : "Break that into one small, concrete next step and add it to your plan.";
    setTalk((x) => [...x, `You: ${msg}`, answer]);
    setMsg("");
  };
  return (
    <aside className="chat" aria-label="Checker planning assistant">
      <header>
        <div>
          <span className="chat-avatar">
            <Sparkles size={17} />
          </span>
          <div>
            <strong>Checker AI</strong>
            <small>Planning companion</small>
          </div>
        </div>
        <button
          className="icon-button"
          onClick={close}
          aria-label="Close planning assistant"
        >
          <X size={19} />
        </button>
      </header>
      <div className="chat-body">
        {talk.map((x, i) => (
          <div
            className={
              x.startsWith("You:") ? "ai-message user-message" : "ai-message"
            }
            key={i}
          >
            {x}
          </div>
        ))}
        <div className="suggestion-row">
          <button
            onClick={() =>
              addTask({
                text: "Follow up on my latest planning idea",
                group: "This week",
                priority: "Medium",
                category: "Other",
              })
            }
          >
            Add a task
          </button>
          <button onClick={() => setMsg("Give me budget advice")}>
            Budget help
          </button>
        </div>
      </div>
      <form onSubmit={send}>
        <input
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="Ask anything about your event…"
        />
        <button>
          <ArrowRight size={18} />
        </button>
      </form>
    </aside>
  );
}
export default App;
