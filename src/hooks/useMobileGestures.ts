import { useState, useEffect, useRef } from 'react';

interface UseMobileGesturesOptions {
  onRefresh: () => Promise<boolean | void>;
  onBackStep: () => void;
  onExitApp: () => void;
  isAtHome: boolean;
  hasOpenModal: boolean;
}

export function useMobileGestures({
  onRefresh,
  onBackStep,
  onExitApp,
  isAtHome,
  hasOpenModal,
}: UseMobileGesturesOptions) {
  // Pull to refresh state
  const [pullDistance, setPullDistance] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const pullStartYRef = useRef<number>(0);
  const isPullingRef = useRef<boolean>(false);
  const pullDistanceRef = useRef<number>(0);
  const isRefreshingRef = useRef<boolean>(false);

  // Edge swipe state
  const [edgeSwipe, setEdgeSwipe] = useState<{
    side: 'left' | 'right';
    distance: number;
    active: boolean;
  } | null>(null);

  const edgeStartPosRef = useRef<{ x: number; y: number; side: 'left' | 'right' } | null>(null);
  const edgeSwipeRef = useRef<{ side: 'left' | 'right'; distance: number; active: boolean } | null>(null);

  // Keep references to options to prevent stale closures
  const optionsRef = useRef({ onRefresh, onBackStep, onExitApp, isAtHome, hasOpenModal });
  useEffect(() => {
    optionsRef.current = { onRefresh, onBackStep, onExitApp, isAtHome, hasOpenModal };
  }, [onRefresh, onBackStep, onExitApp, isAtHome, hasOpenModal]);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      const startX = touch.clientX;
      const startY = touch.clientY;
      const windowWidth = window.innerWidth;

      // 1. Edge Swipe detection: touch begins within 45px from left or right edge
      const edgeThreshold = Math.min(45, windowWidth * 0.12);
      if (startX <= edgeThreshold) {
        edgeStartPosRef.current = { x: startX, y: startY, side: 'left' };
      } else if (startX >= windowWidth - edgeThreshold) {
        edgeStartPosRef.current = { x: startX, y: startY, side: 'right' };
      } else {
        edgeStartPosRef.current = null;
      }

      // 2. Pull-to-refresh detection: only if scrolled to top of page and no modal open
      if (window.scrollY <= 2 && !optionsRef.current.hasOpenModal && !isRefreshingRef.current) {
        pullStartYRef.current = startY;
        isPullingRef.current = true;
      } else {
        isPullingRef.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      const currentX = touch.clientX;
      const currentY = touch.clientY;

      // A. Process Edge Swipe
      if (edgeStartPosRef.current) {
        const deltaX =
          edgeStartPosRef.current.side === 'left'
            ? currentX - edgeStartPosRef.current.x
            : edgeStartPosRef.current.x - currentX;
        const deltaY = Math.abs(currentY - edgeStartPosRef.current.y);

        // Horizontal intent check: horizontal motion is distinct from vertical scrolling
        if (deltaX > 12 && deltaY < deltaX * 0.85) {
          const progress = Math.min(100, deltaX);
          const swipeState = {
            side: edgeStartPosRef.current.side,
            distance: progress,
            active: progress >= 42,
          };
          edgeSwipeRef.current = swipeState;
          setEdgeSwipe(swipeState);
        } else if (deltaX <= 10) {
          edgeSwipeRef.current = null;
          setEdgeSwipe(null);
        }
      }

      // B. Process Pull-to-refresh
      if (isPullingRef.current && !isRefreshingRef.current && window.scrollY <= 2) {
        const deltaY = currentY - pullStartYRef.current;
        if (deltaY > 6) {
          // Logarithmic resistance curve for smooth feel
          const distance = Math.min(110, deltaY * 0.42);
          pullDistanceRef.current = distance;
          setPullDistance(distance);
        } else {
          pullDistanceRef.current = 0;
          setPullDistance(0);
        }
      }
    };

    const handleTouchEnd = async () => {
      // 1. Resolve Edge Swipe
      const currentEdgeSwipe = edgeSwipeRef.current;
      if (edgeStartPosRef.current && currentEdgeSwipe && currentEdgeSwipe.active) {
        // Haptic feedback if supported by browser/Android
        try {
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(25);
          }
        } catch {
          // ignore
        }

        const { hasOpenModal, isAtHome, onBackStep, onExitApp } = optionsRef.current;
        if (hasOpenModal || !isAtHome) {
          onBackStep();
        } else {
          onExitApp();
        }
      }

      edgeStartPosRef.current = null;
      edgeSwipeRef.current = null;
      setEdgeSwipe(null);

      // 2. Resolve Pull-to-refresh
      if (isPullingRef.current) {
        isPullingRef.current = false;
        const currentPull = pullDistanceRef.current;

        if (currentPull >= 50 && !isRefreshingRef.current) {
          isRefreshingRef.current = true;
          setIsRefreshing(true);
          setPullDistance(55); // Hold at indicator height

          try {
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate(35);
            }
          } catch {
            // ignore
          }

          try {
            await optionsRef.current.onRefresh();
          } catch (err) {
            console.error('Pull to refresh failed:', err);
          } finally {
            isRefreshingRef.current = false;
            setIsRefreshing(false);
            pullDistanceRef.current = 0;
            setPullDistance(0);
          }
        } else {
          pullDistanceRef.current = 0;
          setPullDistance(0);
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, []);

  return {
    pullDistance,
    isRefreshing,
    edgeSwipe,
  };
}
