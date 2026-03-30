import { useCallback, useEffect, useRef, useState } from "react";

export default function useTreemapGestures({ scrollRef, innerRef, size }) {
  const [scale, setScaleState] = useState(1);
  const scaleRef = useRef(1);
  const pinchRef = useRef(null);
  const gestureActiveRef = useRef(false);
  const gestureEndTimeRef = useRef(0);
  const touchStartRef = useRef(null);
  const lastTapRef = useRef(0);

  const setScale = useCallback((nextScale) => {
    scaleRef.current = nextScale;
    setScaleState(nextScale);
  }, []);

  const resetZoom = useCallback(
    (resetScroll = true) => {
      setScale(1);
      if (resetScroll && scrollRef.current) {
        scrollRef.current.scrollLeft = 0;
        scrollRef.current.scrollTop = 0;
      }
    },
    [scrollRef, setScale]
  );

  const isGestureActive = useCallback(
    (touchEndEvent) => {
      if (gestureActiveRef.current) return true;
      if (pinchRef.current) return true;
      if (Date.now() - gestureEndTimeRef.current < 500) return true;
      const ts = touchStartRef.current;
      if (ts) {
        const el = scrollRef.current;
        if (el) {
          const scrollDx = Math.abs(el.scrollLeft - ts.scrollLeft);
          const scrollDy = Math.abs(el.scrollTop - ts.scrollTop);
          if (scrollDx > 5 || scrollDy > 5) return true;
        }
        const ct = touchEndEvent?.changedTouches;
        if (ct?.length) {
          const dx = Math.abs(ct[0].clientX - ts.x);
          const dy = Math.abs(ct[0].clientY - ts.y);
          if (dx > 10 || dy > 10) return true;
        }
      }
      return false;
    },
    [scrollRef]
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        touchStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          scrollLeft: el.scrollLeft,
          scrollTop: el.scrollTop,
        };
      }
      if (e.touches.length === 2) {
        touchStartRef.current = null;
        e.preventDefault();
        gestureActiveRef.current = true;
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const rect = el.getBoundingClientRect();
        const midX = (t1.clientX + t2.clientX) / 2 - rect.left;
        const midY = (t1.clientY + t2.clientY) / 2 - rect.top;
        pinchRef.current = {
          startDist: dist,
          startScale: scaleRef.current,
          startScrollLeft: el.scrollLeft,
          startScrollTop: el.scrollTop,
          screenMidX: midX,
          screenMidY: midY,
        };
      }
    };

    const onTouchMove = (e) => {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const g = pinchRef.current;
        const scaleRatio = Math.max(
          1 / g.startScale,
          Math.min(5 / g.startScale, dist / g.startDist)
        );

        const rect = el.getBoundingClientRect();
        const midX = (t1.clientX + t2.clientX) / 2 - rect.left;
        const midY = (t1.clientY + t2.clientY) / 2 - rect.top;
        const anchorX = g.startScrollLeft + g.screenMidX;
        const anchorY = g.startScrollTop + g.screenMidY;
        const tx = midX - anchorX * scaleRatio + g.startScrollLeft;
        const ty = midY - anchorY * scaleRatio + g.startScrollTop;

        if (innerRef.current) {
          innerRef.current.style.transform = `translate(${tx}px, ${ty}px) scale(${scaleRatio})`;
          innerRef.current.style.transformOrigin = "0 0";
        }
        pinchRef.current.liveScale = g.startScale * scaleRatio;
        pinchRef.current.liveScreenMidX = midX;
        pinchRef.current.liveScreenMidY = midY;
      }
    };

    const onTouchEnd = (e) => {
      if (pinchRef.current) {
        e.preventDefault();
        const g = pinchRef.current;
        const newScale = g.liveScale || g.startScale;

        if (innerRef.current) {
          innerRef.current.style.transform = "";
          innerRef.current.style.transformOrigin = "";
        }

        const anchorVX = (g.startScrollLeft + g.screenMidX) / g.startScale;
        const anchorVY = (g.startScrollTop + g.screenMidY) / g.startScale;
        const screenMid = g.liveScreenMidX != null ? g.liveScreenMidX : g.screenMidX;
        const screenMidY = g.liveScreenMidY != null ? g.liveScreenMidY : g.screenMidY;
        const newScrollLeft = anchorVX * newScale - screenMid;
        const newScrollTop = anchorVY * newScale - screenMidY;

        pinchRef.current = null;
        setScale(newScale);

        requestAnimationFrame(() => {
          el.scrollLeft = Math.max(0, newScrollLeft);
          el.scrollTop = Math.max(0, newScrollTop);
        });

        gestureEndTimeRef.current = Date.now();
        setTimeout(() => {
          gestureActiveRef.current = false;
        }, 400);
        return;
      }

      if (e.touches.length === 0 && scaleRef.current > 1) {
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
          resetZoom(true);
          lastTapRef.current = 0;
          return;
        }
        lastTapRef.current = now;
      }
    };

    const onWheel = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      if (size.width <= 0 || size.height <= 0) return;
      e.preventDefault();

      const rect = el.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const anchorNX = (el.scrollLeft + screenX) / (size.width * scaleRef.current);
      const anchorNY = (el.scrollTop + screenY) / (size.height * scaleRef.current);

      const zoomFactor = 1 - e.deltaY * 0.01;
      const newScale = Math.max(1, Math.min(5, scaleRef.current * zoomFactor));
      setScale(newScale);

      requestAnimationFrame(() => {
        el.scrollLeft = anchorNX * size.width * newScale - screenX;
        el.scrollTop = anchorNY * size.height * newScale - screenY;
      });
    };

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("wheel", onWheel);
    };
  }, [innerRef, resetZoom, scrollRef, setScale, size.height, size.width]);

  return { scale, setScale, resetZoom, isGestureActive };
}
