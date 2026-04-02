import type { UIEvent } from "react";
import { useEffect, useRef } from "react";

const NEAR_BOTTOM_PX = 48;

/** Pin log <pre> to bottom unless the user scrolled up; never uses scrollIntoView (avoids scrolling the page). */
export function useStickToBottomLogScroll(log: string, running: boolean) {
  const logPreRef = useRef<HTMLPreElement>(null);
  const stickRef = useRef(true);
  const prevRunningRef = useRef(false);

  useEffect(() => {
    if (running && !prevRunningRef.current) stickRef.current = true;
    prevRunningRef.current = running;
    if (!stickRef.current) return;
    const el = logPreRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log, running]);

  return {
    logPreRef,
    onLogPreScroll: (e: UIEvent<HTMLPreElement>) => {
      const t = e.currentTarget;
      stickRef.current =
        t.scrollHeight - t.scrollTop - t.clientHeight <= NEAR_BOTTOM_PX;
    },
  };
}
