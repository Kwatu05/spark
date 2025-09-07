import React, { useState, useRef, useEffect } from 'react';

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  threshold?: number;
  maxPullDistance?: number;
  refreshText?: string;
  pullingText?: string;
  releasingText?: string;
  refreshingText?: string;
}

const PullToRefresh: React.FC<PullToRefreshProps> = ({
  children,
  onRefresh,
  threshold = 80,
  maxPullDistance = 120,
  refreshText = 'Pull to refresh',
  pullingText = 'Pull to refresh',
  releasingText = 'Release to refresh',
  refreshingText = 'Refreshing...'
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [canRefresh, setCanRefresh] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number>(0);
  const currentY = useRef<number>(0);
  const isDragging = useRef<boolean>(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isRefreshing) return;
    
    const touch = e.touches[0];
    startY.current = touch.clientY;
    currentY.current = touch.clientY;
    isDragging.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isRefreshing) return;

    const touch = e.touches[0];
    currentY.current = touch.clientY;
    
    const scrollTop = containerRef.current?.scrollTop || 0;
    
    // Only trigger pull-to-refresh if we're at the top of the scroll
    if (scrollTop === 0 && touch.clientY > startY.current) {
      e.preventDefault();
      
      const distance = Math.min(touch.clientY - startY.current, maxPullDistance);
      const progress = distance / threshold;
      
      setPullDistance(distance);
      setIsPulling(true);
      setCanRefresh(progress >= 1);
      isDragging.current = true;
    }
  };

  const handleTouchEnd = () => {
    if (isRefreshing || !isDragging.current) return;

    if (canRefresh) {
      handleRefresh();
    } else {
      // Reset to original position
      setPullDistance(0);
      setIsPulling(false);
      setCanRefresh(false);
    }
    
    isDragging.current = false;
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setPullDistance(threshold);
    
    try {
      await onRefresh();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      // Reset after a short delay
      setTimeout(() => {
        setPullDistance(0);
        setIsPulling(false);
        setCanRefresh(false);
        setIsRefreshing(false);
      }, 500);
    }
  };

  const getStatusText = () => {
    if (isRefreshing) return refreshingText;
    if (canRefresh) return releasingText;
    return pullingText;
  };

  const getProgress = () => {
    return Math.min(pullDistance / threshold, 1);
  };

  return (
    <div
      ref={containerRef}
      className="pull-to-refresh-container"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'relative',
        overflow: 'auto',
        height: '100%'
      }}
    >
      {/* Pull indicator */}
      <div
        className="pull-indicator"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: `${Math.max(pullDistance, 0)}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
          color: 'white',
          fontSize: '14px',
          fontWeight: '500',
          transform: `translateY(${Math.max(pullDistance - threshold, 0)}px)`,
          transition: isDragging.current ? 'none' : 'transform 0.3s ease',
          zIndex: 1000
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '20px',
              height: '20px',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              borderTop: '2px solid white',
              borderRadius: '50%',
              animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
              transform: isPulling ? `rotate(${getProgress() * 180}deg)` : 'none',
              transition: isDragging.current ? 'none' : 'transform 0.3s ease'
            }}
          />
          <span>{getStatusText()}</span>
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          transform: `translateY(${Math.max(pullDistance, 0)}px)`,
          transition: isDragging.current ? 'none' : 'transform 0.3s ease',
          minHeight: '100%'
        }}
      >
        {children}
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .pull-to-refresh-container {
          -webkit-overflow-scrolling: touch;
        }
        
        .pull-indicator {
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
};

export default PullToRefresh;
