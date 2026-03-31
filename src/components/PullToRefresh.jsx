import { useState, useRef, useCallback } from "react";
import { Loader2 } from "lucide-react";

const THRESHOLD = 70;

export default function PullToRefresh({ onRefresh, children }) {
  const [pulling, setPulling] = useState(false);
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);

  const onTouchStart = useCallback((e) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const onTouchMove = useCallback((e) => {
    if (startY.current === null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0 && window.scrollY === 0) {
      setPulling(true);
      setPullY(Math.min(dy * 0.5, THRESHOLD + 20));
    }
  }, []);

  const onTouchEnd = useCallback(async () => {
    if (pullY >= THRESHOLD) {
      setRefreshing(true);
      await onRefresh();
      setRefreshing(false);
    }
    setPulling(false);
    setPullY(0);
    startY.current = null;
  }, [pullY, onRefresh]);

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ position: "relative" }}
    >
      {(pulling || refreshing) && (
        <div
          className="flex items-center justify-center text-primary transition-all"
          style={{ height: refreshing ? 48 : pullY, overflow: "hidden" }}
        >
          <Loader2
            className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`}
            style={{ opacity: Math.min(pullY / THRESHOLD, 1), transform: `rotate(${(pullY / THRESHOLD) * 180}deg)` }}
          />
        </div>
      )}
      {children}
    </div>
  );
}