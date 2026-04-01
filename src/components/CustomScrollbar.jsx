import { useRef, useEffect, useState, useCallback } from 'react';

export default function CustomScrollbar({
  children,
  height = 'h-96',
  className = '',
  trackColor = 'bg-gray-200',
  thumbColor = 'bg-primary',
  showOnHover = true,
  autoHide = true,
}) {
  const scrollContainerRef = useRef(null);
  const scrollbarRef = useRef(null);
  const thumbRef = useRef(null);
  const [isHovering, setIsHovering] = useState(false);
  const [thumbHeight, setThumbHeight] = useState(40);
  const [thumbTop, setThumbTop] = useState(0);

  const updateThumbPosition = useCallback(() => {
    if (!scrollContainerRef.current || !scrollbarRef.current || !thumbRef.current) return;

    const container = scrollContainerRef.current;
    const scrollbar = scrollbarRef.current;
    const thumb = thumbRef.current;

    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    const scrollTop = container.scrollTop;

    const maxScrollTop = scrollHeight - clientHeight;

    // Altura do thumb proporcional
    const thumbHeightPercent = (clientHeight / scrollHeight) * 100;
    const newThumbHeight = Math.max(20, Math.min(thumbHeightPercent * (scrollbar.clientHeight / 100), 80));
    setThumbHeight(newThumbHeight);

    // Posição do thumb
    const thumbPositionPercent = maxScrollTop > 0 ? (scrollTop / maxScrollTop) * 100 : 0;
    const newThumbTop = (scrollbar.clientHeight - newThumbHeight) * (thumbPositionPercent / 100);
    setThumbTop(newThumbTop);

    thumb.style.height = `${newThumbHeight}px`;
    thumb.style.transform = `translateY(${newThumbTop}px)`;
  }, []);

  const handleThumbDrag = useCallback((clientY) => {
    if (!scrollContainerRef.current || !scrollbarRef.current) return;

    const scrollbar = scrollbarRef.current;
    const rect = scrollbar.getBoundingClientRect();
    const scrollbarTop = rect.top;
    const scrollbarHeight = rect.height;

    const thumbPositionPercent = Math.max(0, Math.min(100, ((clientY - scrollbarTop) / scrollbarHeight) * 100));
    const scrollPosition = (thumbPositionPercent / 100) * scrollContainerRef.current.scrollHeight;

    scrollContainerRef.current.scrollTop = scrollPosition;
  }, []);

  const handleMouseDown = (e) => {
    e.preventDefault();
    const handleMouseMove = (moveEvent) => handleThumbDrag(moveEvent.clientY);
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleTouchStart = (e) => {
    e.preventDefault();
  };

  const handleTouchMove = useCallback((e) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      handleThumbDrag(e.touches[0].clientY);
    }
  }, [handleThumbDrag]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => updateThumbPosition();
    container.addEventListener('scroll', handleScroll, { passive: true });

    updateThumbPosition();

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [updateThumbPosition]);

  return (
    <div
      className={`flex w-full relative ${height} ${className}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Container de scroll */}
      <div
        ref={scrollContainerRef}
        className="w-full h-full overflow-hidden relative"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="w-full h-full overflow-y-auto pr-2">
          {children}
        </div>
      </div>

      {/* Barra de rolagem customizada */}
      <div
        ref={scrollbarRef}
        className={`absolute right-0 top-0 h-full w-1 bg-transparent transition-all duration-300 ${
          autoHide && !isHovering ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div
          ref={thumbRef}
          className={`absolute left-0 w-full rounded-full transition-all duration-200 cursor-grab active:cursor-grabbing ${thumbColor}`}
          style={{
            height: `${thumbHeight}px`,
            top: 0,
            transform: `translateY(${thumbTop}px)`,
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
        />
      </div>
    </div>
  );
}