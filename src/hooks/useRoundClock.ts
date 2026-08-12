import { useCallback, useEffect, useState } from "react";

/** Counts whole seconds while a round is live. */
export function useRoundClock(running: boolean): [number, () => void] {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const reset = useCallback(() => setSeconds(0), []);
  return [seconds, reset];
}
