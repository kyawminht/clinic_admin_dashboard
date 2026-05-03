import { useState, useCallback, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useOnlineStatus } from "./hooks/useOnlineStatus";
import { enqueueMutation, loadQueue, removeMutation } from "./services/offlineMutationQueue";

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
    not_started: "Not started",
    completed: "Completed",
    addWalkin: "Add Walk-in",
    patientName: "Patient Name",
    phoneNumber: "Phone Number",
    chooseDoctor: "Choose Doctor",
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
    not_started: "မစတင်သေးပါ",
    completed: "ပြီးစီး",
    addWalkin: "လမ်းလျောက်လာသူ ထည့်မည်",
    patientName: "လူနာအမည်",
    phoneNumber: "ဖုန်းနံပါတ်",
    chooseDoctor: "ဆရာဝန် ရွေးချယ်မည်",
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

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

async function apiRequest(path, { token, method = "GET", body, headers } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.message || response.statusText || "Request failed";
    throw new Error(message);
  }

  return data;
}

const api = {
  adminLogin: (username, password) =>
    apiRequest("/api/admin/login", { method: "POST", body: { username, password } }),
  adminLogout: (token) => apiRequest("/api/admin/logout", { token, method: "POST" }),
  fetchBookings: (token, dateKey) => apiRequest(`/api/bookings?date=${encodeURIComponent(dateKey)}`, { token }),
  startQueue: (token, dateKey) =>
    apiRequest(`/api/queue/start?date=${encodeURIComponent(dateKey)}`, { token, method: "POST" }),
  fetchQueueStatus: (dateKey) => apiRequest(`/api/queue/status?date=${encodeURIComponent(dateKey)}`),
  moveToNext: (token, dateKey) =>
    apiRequest(`/api/bookings/next?date=${encodeURIComponent(dateKey)}`, { token, method: "POST" }),
  updateBookingStatus: (token, id, status) =>
    apiRequest(`/api/bookings/${id}/status`, { token, method: "PATCH", body: { status } }),
  createBooking: (token, payload) =>
    apiRequest("/api/bookings", { token, method: "POST", body: payload }),
};

// ─────────────────────────────────────────────
// Custom Hooks
// ─────────────────────────────────────────────

/** useAuth — login / logout simulation */
function useAuth() {
  const [token, setToken] = useState(() => localStorage.getItem("admin_token"));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useCallback(async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const { token } = await api.adminLogin(username, password);
      localStorage.setItem("admin_token", token);
      setToken(token);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    const existingToken = token;
    setToken(null);
    localStorage.removeItem("admin_token");

    if (!existingToken) return;
    try {
      await api.adminLogout(existingToken);
    } catch {
      // ignore (server may be down)
    }
  }, [token]);

  return { token, isAuthenticated: !!token, loading, error, login, logout };
}

function normalizeBookingStatus(status) {
  if (status === "done") return "completed";
  if (status === "not_started") return "not_started";
  return status;
}

function mapBookingToPatient(booking) {
  return {
    id: booking.id,
    queueNumber: booking.queueNumber,
    name: booking.patientName,
    phone: booking.phone,
    doctor: booking.doctorName,
    status: normalizeBookingStatus(booking.status),
  };
}

/** useQueueData — TanStack-Query-style with staleTime, cache & mutations */
function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function useQueueData(token, dateKey, onUnauthorized) {
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();

  const queryKey = ["adminQueue", token, dateKey];
  const {
    data: snapshot,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey,
    enabled: Boolean(token && dateKey),
    queryFn: () => api.fetchBookings(token, dateKey),
  });

  useEffect(() => {
    if (error?.message === "Unauthorized") onUnauthorized?.();
  }, [error, onUnauthorized]);

  const queue = (snapshot?.appointments || []).map(mapBookingToPatient);
  const queueStatus = { started: Boolean(snapshot?.started), startedAt: snapshot?.startedAt || null };

  const flushOfflineQueue = useCallback(async () => {
    if (!isOnline || !token) return;
    const items = loadQueue();
    if (!items.length) return;

    for (const item of items) {
      try {
        if (item.type === "startQueue") {
          await api.startQueue(token, item.dateKey);
        } else if (item.type === "callNext") {
          await api.moveToNext(token, item.dateKey);
        } else if (item.type === "markCompleted") {
          await api.updateBookingStatus(token, item.bookingId, "done");
        } else if (item.type === "addWalkin") {
          await api.createBooking(token, item.payload);
        }
        removeMutation(item.queueId);
      } catch (e) {
        if (e?.message === "Unauthorized") onUnauthorized?.();
        break;
      }
    }

    await queryClient.invalidateQueries({ queryKey });
  }, [isOnline, token, queryClient, queryKey, onUnauthorized]);

  useEffect(() => {
    flushOfflineQueue().catch(() => null);
  }, [flushOfflineQueue]);

  const startDayMutation = useMutation({
    mutationFn: async () => {
      if (!isOnline) {
        enqueueMutation({ type: "startQueue", dateKey });
        return { queued: true };
      }
      return api.startQueue(token, dateKey);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const callNextMutation = useMutation({
    mutationFn: async () => {
      if (!isOnline) {
        enqueueMutation({ type: "callNext", dateKey });
        return { queued: true };
      }
      return api.moveToNext(token, dateKey);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const markCompletedMutation = useMutation({
    mutationFn: async (id) => {
      if (!isOnline) {
        enqueueMutation({ type: "markCompleted", bookingId: id });
        queryClient.setQueryData(queryKey, (previous) => {
          const prev = previous || {};
          const appointments = Array.isArray(prev.appointments) ? prev.appointments : [];
          return {
            ...prev,
            appointments: appointments.map((apt) => (String(apt.id) === String(id) ? { ...apt, status: "done" } : apt)),
          };
        });
        return { queued: true };
      }
      return api.updateBookingStatus(token, id, "done");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const addWalkinMutation = useMutation({
    mutationFn: async ({ name, phone, doctorName }) => {
      if (dateKey !== getLocalDateKey()) {
        throw new Error("Walk-in can only be added for today");
      }

      const chosenDoctorName = doctorName || DOCTORS[0];
      const payload = {
        user: { name, age: 18, phone },
        doctor: {
          id: chosenDoctorName.toLowerCase().replace(/\\s+/g, "-"),
          name: chosenDoctorName,
        },
        slot: new Date().toISOString(),
        date: dateKey,
      };

      if (!isOnline) {
        enqueueMutation({ type: "addWalkin", payload });
        return { queued: true };
      }

      return api.createBooking(token, payload);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    queue,
    isLoading,
    isFetching,
    error: error?.message || null,
    queueStatus,
    startDay: () => startDayMutation.mutateAsync(),
    callNext: () => callNextMutation.mutateAsync(),
    markCompleted: (id) => markCompletedMutation.mutateAsync(id),
    addWalkin: (name, phone, doctorName) => addWalkinMutation.mutateAsync({ name, phone, doctorName }),
    refetch: () => refetch(),
  };
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
    not_started: "bg-amber-100 text-amber-700",
    completed: "bg-green-100 text-green-700",
  };
  return (
    <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full whitespace-nowrap ${map[status] || map.waiting}`}>
      {t[status] || status}
    </span>
  );
}

function PatientRow({ patient, onMarkCompleted, t, index }) {
  const isCompleted = patient.status === "completed";
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
        disabled={isCompleted}
        className="shrink-0 text-xs font-bold text-sky-600 border-2 border-sky-500 rounded-lg px-3 py-1.5 hover:bg-sky-600 hover:text-white disabled:opacity-60 disabled:hover:bg-transparent disabled:hover:text-sky-600 transition-all whitespace-nowrap"
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
  const [doctor, setDoctor] = useState(DOCTORS[0]);
  const [busy, setBusy] = useState(false);

  const handleAdd = async () => {
    if (!name.trim() || !phone.trim()) return;
    setBusy(true);
    await onAdd(name.trim(), phone.trim(), doctor);
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
        <div>
          <label className="block text-base text-gray-600 mb-1">{t.chooseDoctor}</label>
          <select
            value={doctor}
            onChange={(e) => setDoctor(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 transition"
          >
            {DOCTORS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
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

function DashboardContainer({ token, onLogout, lang, setLang, t }) {
  const [selectedDate, setSelectedDate] = useState(getLocalDateKey());
  const { queue, isLoading, isFetching, error, queueStatus, startDay, callNext, markCompleted, addWalkin } =
    useQueueData(token, selectedDate, onLogout);
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

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-6 py-3 text-sm">
              {error}
            </div>
          )}

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
              <div className="mt-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="border border-sky-100 rounded-xl px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!queueStatus.started && (
                <button
                  onClick={startDay}
                  className="bg-amber-500 text-white font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-amber-600 transition-all shadow-md"
                  title="Start doctor"
                >
                  ⭐ Start
                </button>
              )}
              <button
                onClick={callNext}
                disabled={!queueStatus.started}
                className="bg-sky-600 text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-sky-700 disabled:opacity-60 transition-all shadow-md"
              >
                {/* Burmese: + နောက်လူနာ ခေါ်မည် */}
                {t.callNext}
              </button>
            </div>
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
  const { token, isAuthenticated, loading, error, login, logout } = useAuth();
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

  return <DashboardContainer token={token} onLogout={logout} lang={lang} setLang={setLang} t={t} />;
}
