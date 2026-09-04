import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { fetchAdminNotifications, readAdminNotifications } from "@/lib/rollsy.functions";

type Notif = {
  id: string;
  type: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
};

const POLL_MS = 30_000;

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

  async function askPermission() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const p = await Notification.requestPermission();
    setPermission(p);
    if (p === "granted") {
      try {
        new Notification("Notifications activées", {
          body: "Vous serez prévenu à chaque nouveau commerçant ou nouvelle roue.",
          icon: "/icon-192.png",
        });
      } catch {
        /* ignore */
      }
    }
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
        <div className="ink-border absolute right-0 z-50 mt-2 w-[min(92vw,22rem)] rounded-2xl bg-white p-3 text-left shadow-xl">
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
