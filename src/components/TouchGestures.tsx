import React, { useEffect, useRef, useState } from 'react';

interface TouchGesturesProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinch?: (scale: number) => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  swipeThreshold?: number;
  longPressDelay?: number;
}

const TouchGestures: React.FC<TouchGesturesProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onPinch,
  onDoubleTap,
  onLongPress,
  swipeThreshold = 50,
  longPressDelay = 500
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number; time: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number; time: number } | null>(null);
  const [lastTap, setLastTap] = useState<number>(0);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [initialDistance, setInitialDistance] = useState<number>(0);

  // Calculate distance between two touch points
  const getDistance = (touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Handle touch start
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const touchData = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
    
    setTouchStart(touchData);
    setTouchEnd(null);

    // Handle long press
    if (onLongPress) {
      const timer = setTimeout(() => {
        onLongPress();
        // Add haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate(100);
        }
      }, longPressDelay);
      setLongPressTimer(timer);
    }

    // Handle pinch start
    if (e.touches.length === 2 && onPinch) {
      setInitialDistance(getDistance(e.touches[0], e.touches[1]));
    }
  };

  // Handle touch move
  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchEnd({
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    });

    // Cancel long press if user moves
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }

    // Handle pinch
    if (e.touches.length === 2 && onPinch && initialDistance > 0) {
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const scale = currentDistance / initialDistance;
      onPinch(scale);
    }
  };

  // Handle touch end
  const handleTouchEnd = (e: React.TouchEvent) => {
    // Cancel long press timer
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }

    if (!touchStart || !touchEnd) return;

    const deltaX = touchEnd.x - touchStart.x;
    const deltaY = touchEnd.y - touchStart.y;
    const deltaTime = touchEnd.time - touchStart.time;

    // Check for swipe gestures
    const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);
    const isVerticalSwipe = Math.abs(deltaY) > Math.abs(deltaX);
    const isFastSwipe = deltaTime < 300; // 300ms threshold for fast swipe

    if (isHorizontalSwipe && Math.abs(deltaX) > swipeThreshold && isFastSwipe) {
      if (deltaX > 0 && onSwipeRight) {
        onSwipeRight();
        // Add haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }
      } else if (deltaX < 0 && onSwipeLeft) {
        onSwipeLeft();
        // Add haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }
      }
    }

    if (isVerticalSwipe && Math.abs(deltaY) > swipeThreshold && isFastSwipe) {
      if (deltaY > 0 && onSwipeDown) {
        onSwipeDown();
        // Add haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }
      } else if (deltaY < 0 && onSwipeUp) {
        onSwipeUp();
        // Add haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }
      }
    }

    // Check for double tap
    if (onDoubleTap && deltaTime < 200) { // 200ms threshold for tap
      const currentTime = Date.now();
      if (currentTime - lastTap < 300) { // 300ms between taps
        onDoubleTap();
        // Add haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate(100);
        }
      }
      setLastTap(currentTime);
    }

    // Reset touch data
    setTouchStart(null);
    setTouchEnd(null);
    setInitialDistance(0);
  };

  // Handle touch cancel
  const handleTouchCancel = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setTouchStart(null);
    setTouchEnd(null);
    setInitialDistance(0);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };
  }, [longPressTimer]);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      style={{ touchAction: 'pan-x pan-y' }} // Allow default touch actions
    >
      {children}
    </div>
  );
};

export default TouchGestures;
