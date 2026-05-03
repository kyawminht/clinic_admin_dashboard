const STORAGE_KEY = 'clinicdashboard_offline_mutations_v1';

function safeParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function loadQueue() {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const parsed = raw ? safeParse(raw) : null;
  return Array.isArray(parsed) ? parsed : [];
}

export function saveQueue(queue) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // ignore
  }
}

export function enqueueMutation(item) {
  const queue = loadQueue();
  const queueId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const next = [
    ...queue,
    {
      ...item,
      queueId,
      createdAt: new Date().toISOString(),
      status: 'queued',
    },
  ];
  saveQueue(next);
  return queueId;
}

export function removeMutation(queueId) {
  const queue = loadQueue();
  const next = queue.filter((item) => item.queueId !== queueId);
  saveQueue(next);
}
