import React, { useState, useEffect, useRef, useCallback } from 'react';

interface InfiniteScrollProps {
  children: React.ReactNode;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  threshold?: number;
  loadingComponent?: React.ReactNode;
  endComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  className?: string;
}

const InfiniteScroll: React.FC<InfiniteScrollProps> = ({
  children,
  hasMore,
  loadMore,
  threshold = 200,
  loadingComponent,
  endComponent,
  errorComponent,
  className = ''
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);

  const handleLoadMore = useCallback(async () => {
    if (isLoadingRef.current || !hasMore) return;

    setIsLoading(true);
    setError(null);
    isLoadingRef.current = true;

    try {
      await loadMore();
      setHasLoadedOnce(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more content');
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [hasMore, loadMore]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !isLoadingRef.current) {
          handleLoadMore();
        }
      },
      {
        root: containerRef.current,
        rootMargin: `${threshold}px`,
        threshold: 0.1
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [handleLoadMore, hasMore, threshold]);

  // Scroll-based loading for better mobile performance
  const handleScroll = useCallback(() => {
    if (!containerRef.current || isLoadingRef.current || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    if (distanceFromBottom <= threshold) {
      handleLoadMore();
    }
  }, [handleLoadMore, hasMore, threshold]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  // Touch-based loading for mobile
  const handleTouchEnd = useCallback(() => {
    if (!containerRef.current || isLoadingRef.current || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    if (distanceFromBottom <= threshold * 2) {
      handleLoadMore();
    }
  }, [handleLoadMore, hasMore, threshold]);

  const defaultLoadingComponent = (
    <div className="infinite-scroll-loading">
      <div className="loading-spinner" />
      <span>Loading more...</span>
    </div>
  );

  const defaultEndComponent = (
    <div className="infinite-scroll-end">
      <span>You've reached the end!</span>
    </div>
  );

  const defaultErrorComponent = (
    <div className="infinite-scroll-error">
      <span>Failed to load content</span>
      <button 
        onClick={handleLoadMore}
        className="retry-button"
      >
        Try Again
      </button>
    </div>
  );

  return (
    <div
      ref={containerRef}
      className={`infinite-scroll-container ${className}`}
      onTouchEnd={handleTouchEnd}
      style={{
        height: '100%',
        overflow: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      {children}
      
      {/* Loading indicator */}
      {isLoading && (loadingComponent || defaultLoadingComponent)}
      
      {/* Error state */}
      {error && (errorComponent || defaultErrorComponent)}
      
      {/* End of content */}
      {!hasMore && hasLoadedOnce && (endComponent || defaultEndComponent)}
      
      {/* Sentinel element for intersection observer */}
      <div ref={sentinelRef} style={{ height: '1px' }} />
      
      <style jsx>{`
        .infinite-scroll-container {
          position: relative;
        }
        
        .infinite-scroll-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          gap: 12px;
          color: #6b7280;
          font-size: 14px;
        }
        
        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid #e5e7eb;
          border-top: 2px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        .infinite-scroll-end {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          color: #6b7280;
          font-size: 14px;
        }
        
        .infinite-scroll-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
          gap: 12px;
          color: #ef4444;
          font-size: 14px;
        }
        
        .retry-button {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }
        
        .retry-button:hover {
          background: #2563eb;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Mobile optimizations */
        @media (max-width: 768px) {
          .infinite-scroll-loading,
          .infinite-scroll-end,
          .infinite-scroll-error {
            padding: 16px;
            font-size: 13px;
          }
          
          .loading-spinner {
            width: 18px;
            height: 18px;
          }
        }
      `}</style>
    </div>
  );
};

export default InfiniteScroll;
