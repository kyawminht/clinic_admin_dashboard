import { useState, useCallback, useEffect, useRef } from "react";

// ─────────────────────────────────────────────
// i18n strings  (English / Burmese)
// ─────────────────────────────────────────────
const STRINGS = {
  en: {
    appTitle: "Peaceful Care Clinic Admin",
    username: "Username",
    password: "Password",
    signIn: "Sign In",
    signingIn: "Logging in…",
    usernamePlaceholder: "admin",
    passwordPlaceholder: "••••••••",
    loginError: "Invalid credentials. Try admin / admin123",
    headerTitle: "Peaceful Care Clinic Dashboard",
    synced: "Synced",
    welcome: "Welcome, Admin",
    subtitle: "Call next patient. Manage queue. Mark completed.",
    queueList: "Queue List",
    patients: "patients",
    callNext: "+ Call Next Patient",
    markCompleted: "Mark Completed",
    serving: "Serving",
    waiting: "Waiting",
    completed: "Completed",
    addWalkin: "Add Walk-in",
    patientName: "Patient Name",
    phoneNumber: "Phone Number",
    addToQueue: "+ Add to Queue",
    doctor: "Doctor",
    status: "Status",
    actions: "Actions",
    phone: "Phone",
    hash: "#",
    home: "Home",
    queue: "Queue",
    reports: "Reports",
    loading: "Loading queue…",
    noQueue: "No patients in queue.",
  },
  my: {
    appTitle: "Peaceful Care Clinic အက်ဒမင်",
    username: "အသုံးပြုသူအမည်",
    password: "စကားဝှက်",
    signIn: "ဝင်ရောက်မည်",
    signingIn: "ဝင်နေသည်…",
    usernamePlaceholder: "admin",
    passwordPlaceholder: "••••••••",
    loginError: "မှားယွင်းနေသည်။ admin / admin123 ဖြင့် ကြိုးစားပါ",
    headerTitle: "Peaceful Care Clinic ဒက်ရှ်ဘုတ်",
    synced: "ထပ်တူညီ",
    welcome: "ကြိုဆိုပါသည်၊ Admin",
    subtitle: "လူနာကို ခေါ်ပါ။ စီမံပါ။ ပြီးစီးမှတ်ပါ။",
    queueList: "တန်းစာရင်း",
    patients: "ဦး",
    callNext: "+ နောက်လူနာ ခေါ်မည်",
    markCompleted: "ပြီးစီး",
    serving: "ဆောင်ရွက်နေ",
    waiting: "စောင့်နေ",
    completed: "ပြီးစီး",
    addWalkin: "လမ်းလျောက်လာသူ ထည့်မည်",
    patientName: "လူနာအမည်",
    phoneNumber: "ဖုန်းနံပါတ်",
    addToQueue: "+ တန်းထဲ ထည့်မည်",
    doctor: "ဆရာဝန်",
    status: "အခြေအနေ",
    actions: "လုပ်ဆောင်ချက်",
    phone: "ဖုန်း",
    hash: "#",
    home: "ပင်မ",
    queue: "တန်း",
    reports: "အစီရင်ခံ",
    loading: "တန်းစာရင်း ရယူနေသည်…",
    noQueue: "တန်းထဲ လူနာ မရှိပါ။",
  },
};

// ─────────────────────────────────────────────
// Mock data helpers
// ─────────────────────────────────────────────
const DOCTORS = ["Dr. Khin Thida", "Dr. Aung Kyaw", "Dr. Su Su Lwin"];

const generateMockQueue = () =>
  [
    { id: 1, name: "U Kyaw Zeya", phone: "09 111 222 333", doctor: DOCTORS[0], status: "serving" },
    { id: 2, name: "Daw Mya Aye", phone: "09 222 333 444", doctor: DOCTORS[0], status: "waiting" },
    { id: 3, name: "Ko Zin Min", phone: "09 333 444 555", doctor: DOCTORS[1], status: "waiting" },
    { id: 4, name: "Ma Ei Ei Phyu", phone: "09 444 555 666", doctor: DOCTORS[2], status: "waiting" },
    { id: 5, name: "U Than Win", phone: "09 555 666 777", doctor: DOCTORS[0], status: "waiting" },
    { id: 6, name: "Daw Khin Khin", phone: "09 666 777 888", doctor: DOCTORS[1], status: "waiting" },
  ];

const fakeApi = {
  login: (username, password) =>
    new Promise((res, rej) =>
      setTimeout(() => {
        if (username === "admin" && password === "admin123") res({ token: "mock-token-xyz" });
        else rej(new Error("Invalid credentials"));
      }, 1200)
    ),
  fetchQueue: () =>
    new Promise((res) => setTimeout(() => res(generateMockQueue()), 900)),
};

// ─────────────────────────────────────────────
// Custom Hooks
// ─────────────────────────────────────────────

/** useAuth — login / logout simulation */
function useAuth() {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useCallback(async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const { token } = await fakeApi.login(username, password);
      setToken(token);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => setToken(null), []);

  return { token, isAuthenticated: !!token, loading, error, login, logout };
}

/** useQueueData — TanStack-Query-style with staleTime, cache & mutations */
function useQueueData() {
  const cacheRef = useRef({ data: null, fetchedAt: null });
  const STALE_MS = 5 * 60 * 1000; // 5 minutes

  const [queue, setQueue] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  const fetchQueue = useCallback(async (force = false) => {
    const cache = cacheRef.current;
    const isStale = !cache.fetchedAt || Date.now() - cache.fetchedAt > STALE_MS;
    if (!force && !isStale && cache.data) {
      setQueue(cache.data);
      setIsLoading(false);
      return;
    }
    setIsFetching(true);
    const data = await fakeApi.fetchQueue();
    cacheRef.current = { data, fetchedAt: Date.now() };
    setQueue(data);
    setIsLoading(false);
    setIsFetching(false);
  }, []);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  /** Mutation: call the next waiting patient */
  const callNext = useCallback(() => {
    setQueue((prev) => {
      const idx = prev.findIndex((p) => p.status === "waiting");
      if (idx === -1) return prev;
      const updated = prev.map((p, i) =>
        i === idx ? { ...p, status: "serving" } : p.status === "serving" ? { ...p, status: "waiting" } : p
      );
      cacheRef.current.data = updated;
      return updated;
    });
  }, []);

  /** Mutation: mark a patient completed */
  const markCompleted = useCallback((id) => {
    setQueue((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      cacheRef.current.data = updated;
      return updated;
    });
  }, []);

  /** Mutation: add walk-in patient */
  const addWalkin = useCallback((name, phone) => {
    setQueue((prev) => {
      const newPatient = {
        id: Date.now(),
        name,
        phone,
        doctor: DOCTORS[Math.floor(Math.random() * DOCTORS.length)],
        status: "waiting",
      };
      const updated = [...prev, newPatient];
      cacheRef.current.data = updated;
      return updated;
    });
  }, []);

  return { queue, isLoading, isFetching, callNext, markCompleted, addWalkin, refetch: () => fetchQueue(true) };
}

// ─────────────────────────────────────────────
// Presentational Components
// ─────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-sky-100 animate-pulse">
      <div className="w-6 h-4 bg-sky-200 rounded" />
      <div className="flex-1 h-4 bg-sky-200 rounded" />
      <div className="w-24 h-4 bg-sky-200 rounded" />
      <div className="w-20 h-4 bg-sky-200 rounded" />
      <div className="w-16 h-6 bg-sky-200 rounded-full" />
      <div className="w-24 h-8 bg-sky-200 rounded-lg" />
    </div>
  );
}

function StatusBadge({ status, t }) {
  const map = {
    serving: "bg-sky-600 text-white",
    waiting: "bg-gray-200 text-gray-600",
    completed: "bg-green-100 text-green-700",
  };
  return (
    <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full whitespace-nowrap ${map[status] || map.waiting}`}>
      {t[status] || status}
    </span>
  );
}

function PatientRow({ patient, onMarkCompleted, t, index }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-sky-50 hover:bg-sky-50 transition-colors">
      <span className="text-sm font-semibold text-gray-400 w-5 shrink-0">{index}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{patient.name}</p>
        <p className="text-xs text-gray-500">{patient.phone}</p>
      </div>
      <p className="hidden sm:block text-xs text-gray-500 w-24 truncate">{patient.doctor}</p>
      <StatusBadge status={patient.status} t={t} />
      <button
        onClick={() => onMarkCompleted(patient.id)}
        className="shrink-0 text-xs font-bold text-sky-600 border-2 border-sky-500 rounded-lg px-3 py-1.5 hover:bg-sky-600 hover:text-white transition-all whitespace-nowrap"
      >
        {t.markCompleted}
      </button>
    </div>
  );
}

function QueueTable({ queue, isLoading, onMarkCompleted, t }) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
      </div>
    );
  }
  if (!queue.length) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400 text-base">{t.noQueue}</div>
    );
  }
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Table header — hidden on mobile */}
      <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-sky-50 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-sky-100">
        <span className="w-5">{t.hash}</span>
        <span className="flex-1">{t.patientName}</span>
        <span className="w-24">{t.doctor}</span>
        <span className="w-20">{t.status}</span>
        <span className="w-24">{t.actions}</span>
      </div>
      {queue.map((p, i) => (
        <PatientRow key={p.id} patient={p} index={i + 1} onMarkCompleted={onMarkCompleted} t={t} />
      ))}
    </div>
  );
}

function WalkinForm({ onAdd, t }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  const handleAdd = async () => {
    if (!name.trim() || !phone.trim()) return;
    setBusy(true);
    await new Promise((r) => setTimeout(r, 600)); // simulate async
    onAdd(name.trim(), phone.trim());
    setName("");
    setPhone("");
    setBusy(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 mt-4">
      <h2 className="text-xl font-bold text-gray-900 mb-4">{t.addWalkin}</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-base text-gray-600 mb-1">{t.patientName}</label>
          {/* Burmese placeholder: လူနာအမည် */}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.patientName}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 transition"
          />
        </div>
        <div>
          <label className="block text-base text-gray-600 mb-1">{t.phoneNumber}</label>
          {/* Burmese placeholder: ဖုန်းနံပါတ် */}
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t.phoneNumber}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 transition"
          />
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleAdd}
            disabled={busy || !name.trim() || !phone.trim()}
            className="bg-sky-600 text-white font-bold text-sm px-6 py-2.5 rounded-xl hover:bg-sky-700 disabled:opacity-50 transition-all"
          >
            {busy ? "…" : t.addToQueue}
          </button>
        </div>
      </div>
    </div>
  );
}

function Sidebar({ t, active, setActive }) {
  const items = [
    { key: "home", label: t.home, icon: "🏠" },
    { key: "queue", label: t.queue, icon: "☰" },
    { key: "reports", label: t.reports, icon: "📊" },
  ];
  return (
    <aside className="hidden md:flex flex-col w-20 bg-white border-r border-sky-100 pt-6 items-center gap-6 shrink-0">
      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => setActive(item.key)}
          className={`flex flex-col items-center gap-1 text-xs font-semibold px-2 py-2 rounded-xl transition-all ${
            active === item.key ? "bg-sky-100 text-sky-600" : "text-gray-400 hover:text-sky-500"
          }`}
        >
          <span className="text-xl">{item.icon}</span>
          {item.label}
        </button>
      ))}
    </aside>
  );
}

// ─────────────────────────────────────────────
// Login Screen
// ─────────────────────────────────────────────

function LoginScreen({ onLogin, loading, error, lang, setLang, t }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");

  return (
    <div className="min-h-screen bg-sky-50 flex flex-col items-center justify-center px-4">
      {/* Language toggle */}
      <div className="mb-6 flex gap-1 bg-white rounded-full p-1 shadow-sm border border-sky-100">
        {["en", "my"].map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
              lang === l ? "bg-sky-600 text-white" : "text-gray-500 hover:text-sky-600"
            }`}
          >
            {l === "en" ? "English" : "Myanmar"}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-10 shadow-lg w-full max-w-sm space-y-6">
        {/* Logo area */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-sky-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
            <span className="text-3xl">🏥</span>
          </div>
          {/* Burmese: Peaceful Care Clinic အက်ဒမင် */}
          <h1 className="text-2xl font-bold text-gray-900">{t.appTitle}</h1>
        </div>

        <div className="space-y-4">
          <div>
            {/* Burmese label: အသုံးပြုသူအမည် */}
            <label className="block text-base text-gray-600 mb-1">{t.username}</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t.usernamePlaceholder}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 transition"
            />
          </div>
          <div>
            {/* Burmese label: စကားဝှက် */}
            <label className="block text-base text-gray-600 mb-1">{t.password}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.passwordPlaceholder}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 transition"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{t.loginError}</p>
          )}

          <button
            onClick={() => onLogin(username, password)}
            disabled={loading}
            className="w-full bg-sky-600 text-white font-bold py-3 rounded-xl hover:bg-sky-700 disabled:opacity-60 transition-all text-base"
          >
            {/* Burmese: ဝင်နေသည်… / ဝင်ရောက်မည် */}
            {loading ? t.signingIn : t.signIn}
          </button>
        </div>
      </div>

      <p className="mt-6 text-xs text-gray-400">admin / admin123</p>
    </div>
  );
}

// ─────────────────────────────────────────────
// Dashboard Screen — Container
// ─────────────────────────────────────────────

function DashboardContainer({ onLogout, lang, setLang, t }) {
  const { queue, isLoading, isFetching, callNext, markCompleted, addWalkin } = useQueueData();
  const [activeNav, setActiveNav] = useState("queue");

  return (
    <div className="min-h-screen bg-sky-50 flex flex-col">
      {/* Header */}
      <header className="bg-sky-600 text-white px-6 py-3 flex items-center justify-between shrink-0">
        <h1 className="text-lg font-bold tracking-tight">{t.headerTitle}</h1>
        <div className="flex items-center gap-4">
          {/* Synced indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-sm">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            {/* Burmese: ထပ်တူညီ */}
            <span>{t.synced}</span>
          </div>
          {/* Language toggle */}
          <div className="flex gap-1 bg-sky-700 rounded-full p-0.5">
            {["en", "my"].map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  lang === l ? "bg-white text-sky-700" : "text-sky-200 hover:text-white"
                }`}
              >
                {l === "en" ? "English" : "Myanmar"}
              </button>
            ))}
          </div>
          <button onClick={onLogout} className="text-sky-200 hover:text-white text-xs transition">
            ↩
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar t={t} active={activeNav} setActive={setActiveNav} />

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Welcome Banner */}
          <div className="bg-sky-100 rounded-2xl px-6 py-5">
            <h2 className="text-3xl font-bold text-gray-900">{t.welcome}</h2>
            <p className="text-base text-gray-600 mt-1">{t.subtitle}</p>
          </div>

          {/* Queue header + Call Next */}
          <div className="bg-white rounded-2xl shadow-sm px-6 py-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xl font-bold text-gray-900">{t.queueList}</span>
              {!isLoading && (
                <span className="ml-2 text-base text-gray-500">
                  {queue.length} {t.patients}
                </span>
              )}
              {isFetching && <span className="ml-3 text-xs text-sky-400 animate-pulse">↻</span>}
            </div>
            <button
              onClick={callNext}
              className="bg-sky-600 text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-sky-700 transition-all shadow-md"
            >
              {/* Burmese: + နောက်လူနာ ခေါ်မည် */}
              {t.callNext}
            </button>
          </div>

          {/* Queue Table (Presentational) */}
          <QueueTable
            queue={queue}
            isLoading={isLoading}
            onMarkCompleted={markCompleted}
            t={t}
          />

          {/* Walk-in form */}
          <WalkinForm onAdd={addWalkin} t={t} />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden bg-white border-t border-sky-100 flex justify-around py-2 shrink-0">
        {[
          { key: "home", label: t.home, icon: "🏠" },
          { key: "queue", label: t.queue, icon: "☰" },
          { key: "reports", label: t.reports, icon: "📊" },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setActiveNav(item.key)}
            className={`flex flex-col items-center gap-0.5 text-xs font-semibold px-4 py-1 transition-all ${
              activeNav === item.key ? "text-sky-600" : "text-gray-400"
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

// ─────────────────────────────────────────────
// App Root — Auth Container
// ─────────────────────────────────────────────

export default function App() {
  const { isAuthenticated, loading, error, login, logout } = useAuth();
  const [lang, setLang] = useState("en");
  const t = STRINGS[lang];

  if (!isAuthenticated) {
    return (
      <LoginScreen
        onLogin={login}
        loading={loading}
        error={error}
        lang={lang}
        setLang={setLang}
        t={t}
      />
    );
  }

  return <DashboardContainer onLogout={logout} lang={lang} setLang={setLang} t={t} />;
}