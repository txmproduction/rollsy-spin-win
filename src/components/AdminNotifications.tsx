import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  fetchAdminNotifications,
  readAdminNotifications,
  fetchPushPublicKey,
  registerPushDevice,
  testPushNotification,
} from "@/lib/rollsy.functions";

type Notif = {
  id: string;
  type: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
};

const POLL_MS = 30_000;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminNotifications() {
  const load = useServerFn(fetchAdminNotifications);
  const markRead = useServerFn(readAdminNotifications);
  const getKey = useServerFn(fetchPushPublicKey);
  const registerDevice = useServerFn(registerPushDevice);
  const sendTest = useServerFn(testPushNotification);
  const [pushState, setPushState] = useState<"idle" | "working" | "ready" | "error">("idle");
  const [items, setItems] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "unsupported",
  );
  const seen = useRef<Set<string>>(new Set());
  const primed = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const list = (await load()) as Notif[];
      setItems(list);
      if (!primed.current) {
        list.forEach((n) => seen.current.add(n.id));
        primed.current = true;
        return;
      }
      const fresh = list.filter((n) => !seen.current.has(n.id));
      fresh.forEach((n) => seen.current.add(n.id));
      if (
        fresh.length > 0 &&
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        fresh.slice(0, 3).forEach((n) => {
          try {
            new Notification(n.title, { body: n.body, icon: "/icon-192.png", tag: n.id });
          } catch {
            /* ignore */
          }
        });
      }
    } catch {
      /* ignore */
    }
  }, [load]);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const unread = items.filter((n) => !n.readAt).length;

  const enablePush = useCallback(async () => {
    setPushState("working");
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setPushState("error");
        return;
      }
      const { publicKey } = (await getKey()) as { publicKey: string | null };
      if (!publicKey) {
        setPushState("error");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const sub =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        }));
      const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        setPushState("error");
        return;
      }
      await registerDevice({
        data: { endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth },
      });
      setPushState("ready");
    } catch (e) {
      console.error(e);
      setPushState("error");
    }
  }, [getKey, registerDevice]);

  useEffect(() => {
    if (
      permission === "granted" &&
      typeof window !== "undefined" &&
      window.top === window.self &&
      pushState === "idle"
    ) {
      void enablePush();
    }
  }, [permission, pushState, enablePush]);

  async function askPermission() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const p = await Notification.requestPermission();
    setPermission(p);
    if (p === "granted") await enablePush();
  }

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      await markRead();
      setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    }
  }

  const inIframe = typeof window !== "undefined" && window.top !== window.self;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => void toggle()}
        className="ink-border relative min-h-[44px] rounded-full bg-white px-4 font-extrabold uppercase"
      >
        Notifications
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-pink px-1 text-xs font-extrabold text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="ink-border fixed inset-x-2 top-32 z-50 max-h-[70vh] overflow-y-auto rounded-2xl bg-white p-3 text-left shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:max-h-none sm:w-[22rem] sm:overflow-visible">
          {permission !== "granted" && (
            <div className="mb-3 rounded-xl bg-yellow/60 p-3 text-xs">
              {inIframe ? (
                <p>
                  Ouvrez l'application dans un onglet à part (ou depuis l'écran d'accueil) pour
                  autoriser les alertes de votre téléphone.
                </p>
              ) : permission === "denied" ? (
                <p>
                  Les alertes sont bloquées par votre navigateur. Autorisez-les dans les réglages du
                  site pour les recevoir.
                </p>
              ) : (
                <>
                  <p className="mb-2 font-extrabold">
                    Recevez une alerte à chaque nouveau commerçant
                  </p>
                  <button
                    type="button"
                    onClick={() => void askPermission()}
                    className="ink-border rounded-full bg-white px-3 py-1 font-extrabold"
                  >
                    Autoriser les notifications
                  </button>
                </>
              )}
            </div>
          )}

          {permission === "granted" && (
            <div className="mb-3 rounded-xl border border-ink/15 p-2 text-xs">
              <p className="mb-2 font-extrabold">
                {pushState === "ready"
                  ? "Alertes activées sur cet appareil"
                  : pushState === "working"
                    ? "Activation en cours..."
                    : pushState === "error"
                      ? "Activation impossible sur cet appareil"
                      : "Alertes du téléphone"}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void enablePush()}
                  className="ink-border rounded-full bg-white px-3 py-1 font-extrabold"
                >
                  Activer sur cet appareil
                </button>
                <button
                  type="button"
                  onClick={() => void sendTest({})}
                  className="ink-border rounded-full bg-yellow px-3 py-1 font-extrabold"
                >
                  Tester
                </button>
              </div>
            </div>
          )}

          <div className="max-h-80 space-y-2 overflow-y-auto">
            {items.length === 0 && (
              <p className="py-4 text-center text-sm opacity-70">Aucune notification.</p>
            )}
            {items.map((n) => (
              <div key={n.id} className="rounded-xl border border-ink/15 p-2">
                <p className="text-sm font-extrabold">{n.title}</p>
                <p className="text-sm">{n.body}</p>
                <p className="mt-1 text-[11px] opacity-60">{formatDate(n.createdAt)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
