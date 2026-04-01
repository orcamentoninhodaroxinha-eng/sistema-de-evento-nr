import { useRef, useEffect, useState, useCallback } from 'react';

export default function MobileCustomScrollbar({
  children,
  height = 'h-96 md:h-[500px] lg:h-[600px]',
  className = '',
  trackColor = 'bg-gray-200 dark:bg-gray-700',
  thumbColor = 'bg-gray-400 dark:bg-gray-500',
  thumbHoverColor = 'bg-gray-600 dark:bg-gray-400',
  showOnHover = true,
  autoHide = true,
  maxHeight = 'max-h-[80vh] md:max-h-[90vh]',
}) {
  const scrollContainerRef = useRef(null);
  const scrollbarRef = useRef(null);
  const thumbRef = useRef(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [maxScroll, setMaxScroll] = useState(0);
  const [thumbHeight, setThumbHeight] = useState(40);
  const [thumbTop, setThumbTop] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const updateThumbPosition = useCallback(() => {
    if (!scrollContainerRef.current || !scrollbarRef.current || !thumbRef.current) return;

    const container = scrollContainerRef.current;
    const scrollbar = scrollbarRef.current;
    const thumb = thumbRef.current;

    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    const scrollTopVal = container.scrollTop;

    const maxScrollTop = scrollHeight - clientHeight;
    setMaxScroll(maxScrollTop);
    setScrollTop(scrollTopVal);

    if (maxScrollTop > 0) {
      setIsScrolling(true);
      
      const ratio = clientHeight / scrollHeight;
      const newThumbHeight = Math.max(20, ratio * scrollbar.clientHeight);
      setThumbHeight(newThumbHeight);

      const thumbPositionPercent = (scrollTopVal / maxScrollTop) * 100;
      const newThumbTop = (scrollbar.clientHeight - newThumbHeight) * (thumbPositionPercent / 100);
      setThumbTop(newThumbTop);

      thumb.style.height = `${newThumbHeight}px`;
      thumb.style.transform = `translateY(${newThumbTop}px)`;
    }
  }, []);

  const scrollToPosition = useCallback((positionPercent) => {
    if (!scrollContainerRef.current) return;
    
    const maxScrollTop = scrollContainerRef.current.scrollHeight - 
                        scrollContainerRef.current.clientHeight;
    scrollContainerRef.current.scrollTop = (positionPercent / 100) * maxScrollTop;
  }, []);

  const handleStartDrag = useCallback(() => {
    setIsDragging(true);
    document.body.style.userSelect = 'none';
    document.body.style.touchAction = 'none';
  }, []);

  const handleDrag = useCallback((clientY) => {
    if (!scrollbarRef.current || !isDragging) return;

    const rect = scrollbarRef.current.getBoundingClientRect();
    const relativeY = clientY - rect.top;
    const positionPercent = Math.max(0, Math.min(100, (relativeY / rect.height) * 100));
    scrollToPosition(positionPercent);
  }, [scrollToPosition, isDragging]);

  const handleEndDrag = useCallback(() => {
    setIsDragging(false);
    document.body.style.userSelect = '';
    document.body.style.touchAction = '';
  }, []);

  const getClientY = (e) => {
    return e.touches && e.touches.length > 0 ? e.touches[0].clientY : e.clientY;
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      updateThumbPosition();
      setTimeout(() => setIsScrolling(false), 1000);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', updateThumbPosition);

    updateThumbPosition();

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateThumbPosition);
    };
  }, [updateThumbPosition]);

  useEffect(() => {
    const handleGlobalMove = (e) => {
      if (isDragging) {
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        handleDrag(clientY);
      }
    };

    const handleGlobalEnd = () => {
      if (isDragging) handleEndDrag();
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMove, { passive: false });
      document.addEventListener('touchmove', handleGlobalMove, { passive: false });
      document.addEventListener('mouseup', handleGlobalEnd);
      document.addEventListener('touchend', handleGlobalEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMove);
      document.removeEventListener('touchmove', handleGlobalMove);
      document.removeEventListener('mouseup', handleGlobalEnd);
      document.removeEventListener('touchend', handleGlobalEnd);
    };
  }, [isDragging, handleDrag, handleEndDrag]);

  const visibilityClass = (showOnHover || isScrolling || isDragging) 
    ? 'opacity-100 w-2 sm:w-2.5 md:w-2 scale-x-100' 
    : 'opacity-0 w-0 scale-x-0';

  return (
    <div
      className={`w-full relative flex flex-col ${height} ${maxHeight} ${className} sm:rounded-xl md:rounded-2xl overflow-hidden`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div
        ref={scrollContainerRef}
        className={`w-full h-full flex-1 overflow-hidden relative scrollbar-none ${showOnHover ? 'hover:pr-3 sm:hover:pr-4 md:hover:pr-2' : 'pr-2'} transition-all duration-300 ease-out`}
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div className="w-full h-full overflow-y-auto pr-2 sm:pr-3 md:pr-4 pb-4">
          {children}
        </div>
      </div>

      <div
        ref={scrollbarRef}
        className={`absolute right-1 sm:right-2 md:right-1 top-0 h-full w-1.5 sm:w-2 md:w-1.5 bg-transparent/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-full transition-all duration-300 group ${trackColor} ${visibilityClass} hover:opacity-100 hover:w-2.5 sm:hover:w-3 md:hover:w-2.5`}
      >
        <div
          ref={thumbRef}
          className={`absolute left-0 w-full rounded-full transition-all duration-200 ease-out active:scale-110 shadow-lg cursor-grab active:cursor-grabbing select-none touch-none ${thumbColor} group-hover:${thumbHoverColor} ${isDragging ? `${thumbHoverColor} scale-110 shadow-xl` : ''}`}
          style={{
            height: `${thumbHeight}px`,
            top: 0,
            transform: `translateY(${thumbTop}px)`,
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            handleStartDrag(getClientY(e));
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            handleStartDrag(getClientY(e));
          }}
        />
        
        {isScrolling && (
          <div className="absolute inset-0 bg-gradient-to-b from-blue-400/30 to-purple-400/30 animate-pulse rounded-full blur-sm" />
        )}
      </div>
    </div>
  );
}