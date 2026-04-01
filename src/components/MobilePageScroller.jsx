import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown } from 'lucide-react';

export default function MobilePageScroller({ children, containerRef }) {
  const [touchStart, setTouchStart] = useState(0);

  const scrollRef = containerRef || useRef(null);

  const handleScroll = (direction) => {
    if (scrollRef.current) {
      const amount = direction === 'up' ? -120 : 120;
      scrollRef.current.scrollBy({ top: amount, behavior: 'smooth' });
    }
  };

  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientY);
  };

  const handleTouchEnd = (e) => {
    if (!scrollRef.current) return;
    const touchEnd = e.changedTouches[0].clientY;
    const diff = touchStart - touchEnd;
    if (Math.abs(diff) > 10) {
      scrollRef.current.scrollBy({ top: diff * 0.5, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const ref = scrollRef.current;
    if (!ref) return;

    ref.addEventListener('touchstart', handleTouchStart, { passive: true });
    ref.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      ref.removeEventListener('touchstart', handleTouchStart);
      ref.removeEventListener('touchend', handleTouchEnd);
    };
  }, [touchStart]);

  return (
    <div className="relative w-full h-full">
      <div ref={scrollRef} className="w-full h-full overflow-y-auto">
        {children}
      </div>

      {/* Scroll arrows for mobile */}
      <div className="fixed left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-20 pointer-events-auto sm:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleScroll('up')}
          className="rounded-lg h-16 w-16 bg-white/40 backdrop-blur-sm shadow-lg hover:shadow-xl hover:bg-white/60 transition-all border border-border/20 flex-shrink-0"
        >
          <ChevronUp className="w-10 h-10 text-primary" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleScroll('down')}
          className="rounded-lg h-16 w-16 bg-white/40 backdrop-blur-sm shadow-lg hover:shadow-xl hover:bg-white/60 transition-all border border-border/20 flex-shrink-0"
        >
          <ChevronDown className="w-10 h-10 text-primary" />
        </Button>
      </div>
    </div>
  );
}