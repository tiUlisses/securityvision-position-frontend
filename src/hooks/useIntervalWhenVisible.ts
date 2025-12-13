import { useEffect, useRef } from "react";

export function useIntervalWhenVisible(
  fn: () => void | Promise<void>,
  delayMs: number | null,
  deps: any[] = []
) {
  const saved = useRef(fn);
  saved.current = fn;

  useEffect(() => {
    if (delayMs == null) return;

    let timer: number | null = null;
    let stopped = false;

    const tick = async () => {
      if (stopped) return;
      if (document.visibilityState !== "visible") return;
      await saved.current();
    };

    timer = window.setInterval(() => {
      void tick();
    }, delayMs);

    return () => {
      stopped = true;
      if (timer != null) window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delayMs, ...deps]);
}
