import React, { useEffect, useState, useCallback, useRef } from 'react';

export const CustomCursor: React.FC = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef({ x: -100, y: -100 });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const checkDevice = () => {
      const hasHover = window.matchMedia('(hover: hover)').matches;
      const hasPointer = window.matchMedia('(pointer: fine)').matches;
      const isLargeScreen = window.innerWidth >= 1024;
      const noTouch = !('ontouchstart' in window) && navigator.maxTouchPoints === 0;
      
      const shouldEnable = hasHover && hasPointer && isLargeScreen && noTouch;
      setIsEnabled(shouldEnable);
      
      if (shouldEnable) {
        document.documentElement.classList.add('custom-cursor-active');
      } else {
        document.documentElement.classList.remove('custom-cursor-active');
      }
    };

    const timeout = setTimeout(checkDevice, 50);
    window.addEventListener('resize', checkDevice);
    
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', checkDevice);
      document.documentElement.classList.remove('custom-cursor-active');
    };
  }, []);

  // Use RAF for smooth cursor movement
  useEffect(() => {
    if (!isEnabled) return;

    let targetX = -100;
    let targetY = -100;
    let currentX = -100;
    let currentY = -100;
    const ease = 0.15;

    const animate = () => {
      // Lerp for smooth movement
      currentX += (targetX - currentX) * ease;
      currentY += (targetY - currentY) * ease;

      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${currentX - 6}px, ${currentY - 6}px)`;
      }
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${currentX - 20}px, ${currentY - 20}px)`;
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    const handleMouseMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      positionRef.current = { x: targetX, y: targetY };
      if (!isVisible) setIsVisible(true);
    };

    rafRef.current = requestAnimationFrame(animate);
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isEnabled, isVisible]);

  const handleMouseOver = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const isClickable = 
      target.tagName === 'BUTTON' ||
      target.tagName === 'A' ||
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.closest('button') ||
      target.closest('a') ||
      target.closest('[role="button"]') ||
      target.closest('input') ||
      target.closest('[data-clickable]') ||
      window.getComputedStyle(target).cursor === 'pointer';
    
    setIsHovering(!!isClickable);
  }, []);

  useEffect(() => {
    if (!isEnabled) return;

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);
    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    window.addEventListener('mouseover', handleMouseOver, { passive: true });
    window.addEventListener('mousedown', handleMouseDown, { passive: true });
    window.addEventListener('mouseup', handleMouseUp, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      window.removeEventListener('mouseover', handleMouseOver);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [isEnabled, handleMouseOver]);

  if (!isEnabled || !isVisible) return null;

  const dotScale = isClicking ? 0.6 : isHovering ? 0.4 : 1;
  const ringScale = isClicking ? 0.6 : isHovering ? 1.5 : 1;

  return (
    <>
      {/* Main Dot */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 pointer-events-none mix-blend-difference"
        style={{
          width: 12,
          height: 12,
          backgroundColor: '#00F0FF',
          borderRadius: '50%',
          zIndex: 99999,
          transform: 'translate(-100px, -100px)',
          transition: 'width 0.1s, height 0.1s',
          willChange: 'transform',
        }}
      >
        <div 
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            backgroundColor: '#00F0FF',
            transform: `scale(${dotScale})`,
            transition: 'transform 0.1s ease-out',
          }}
        />
      </div>
      
      {/* Trailing Ring */}
      <div
        ref={ringRef}
        className="fixed top-0 left-0 pointer-events-none"
        style={{
          width: 40,
          height: 40,
          border: `2px solid ${isHovering ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 240, 255, 0.4)'}`,
          borderRadius: '50%',
          zIndex: 99998,
          transform: 'translate(-100px, -100px)',
          opacity: isHovering ? 0.8 : 0.4,
          willChange: 'transform',
        }}
      >
        <div 
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            transform: `scale(${ringScale})`,
            transition: 'transform 0.15s ease-out, opacity 0.15s ease-out',
          }}
        />
      </div>
    </>
  );
};
