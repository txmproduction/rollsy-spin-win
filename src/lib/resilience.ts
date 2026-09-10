import { useEffect, useRef } from "react";

/** Empêche un appel réseau resté "suspendu" (retour d'arrière-plan iOS) de bloquer l'écran. */
export function withTimeout<T>(promise: Promise<T>, ms = 8000, label = "timeout"): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(label)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/** Rejoue une action quand l'app revient au premier plan (onglet visible / retour du cache iOS). */
export function useAppResume(callback: () => void) {
  const ref = useRef(callback);
  ref.current = callback;

  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVisible = () => {
      if (document.visibilityState === "visible") ref.current();
    };
    const onPageShow = () => ref.current();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("focus", onVisible);
    };
  }, []);
}
