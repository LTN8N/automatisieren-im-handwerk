"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface SwipeAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "destructive";
}

interface SwipeableRowProps {
  children: React.ReactNode;
  actions: SwipeAction[];
  className?: string;
}

const SWIPE_THRESHOLD = 60;
const MAX_SWIPE = 140;

export function SwipeableRow({ children, actions, className }: SwipeableRowProps) {
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  function onTouchStart(e: React.TouchEvent) {
    startXRef.current = e.touches[0].clientX;
    setIsDragging(true);
  }

  function onTouchMove(e: React.TouchEvent) {
    if (startXRef.current === null) return;
    const deltaX = startXRef.current - e.touches[0].clientX;
    // Only swipe left (positive deltaX)
    const clamped = Math.max(0, Math.min(deltaX, MAX_SWIPE));
    setOffset(clamped);
  }

  function onTouchEnd() {
    setIsDragging(false);
    startXRef.current = null;
    // Snap open if past threshold, else snap closed
    if (offset >= SWIPE_THRESHOLD) {
      setOffset(MAX_SWIPE);
    } else {
      setOffset(0);
    }
  }

  function close() {
    setOffset(0);
  }

  const isOpen = offset >= SWIPE_THRESHOLD;
  const actionWidth = MAX_SWIPE / actions.length;

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden", className)}
    >
      {/* Action buttons revealed on swipe */}
      <div
        className="absolute right-0 top-0 bottom-0 flex"
        style={{ width: MAX_SWIPE }}
      >
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={() => {
              close();
              action.onClick();
            }}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium text-white transition-opacity",
              action.variant === "destructive" ? "bg-destructive" : "bg-primary",
              isOpen ? "opacity-100" : "opacity-0"
            )}
            style={{ width: actionWidth }}
            aria-label={action.label}
          >
            {action.icon}
            <span>{action.label}</span>
          </button>
        ))}
      </div>

      {/* Swipeable content */}
      <div
        className={cn(
          "relative bg-background",
          !isDragging && "transition-transform duration-200 ease-out"
        )}
        style={{ transform: `translateX(-${offset}px)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
        {/* Overlay to close on tap when open */}
        {isOpen && (
          <div
            className="absolute inset-0 z-10"
            onClick={close}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}
