
"use client";

import { useEffect, useRef, useState } from "react";

interface UseAutoScrollOptions {
  ref: React.RefObject<HTMLElement>;
  dependency: any[];
}

export function useAutoScroll({ ref, dependency }: UseAutoScrollOptions) {
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const observerRef = useRef<MutationObserver | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const isScrollingRef = useRef(false);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      const isNearBottom = distanceFromBottom <= 150; // 150px threshold
      setUserScrolledUp(!isNearBottom);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [ref]);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const scrollToBottom = () => {
      if (!userScrolledUp && !isScrollingRef.current) {
        isScrollingRef.current = true;
        container.scrollTop = container.scrollHeight;

        // Reset scrolling flag after a short delay to allow for smooth scrolling
        setTimeout(() => {
          isScrollingRef.current = false;
        }, 100);
      }
    };

    // Scroll to bottom on initial dependency change
    scrollToBottom();

    // MutationObserver to watch for DOM changes (new messages, content updates)
    observerRef.current = new MutationObserver((mutations) => {
      let shouldScroll = false;

      for (const mutation of mutations) {
        // Check for childList mutations (new elements added/removed)
        if (mutation.type === "childList") {
          shouldScroll = true;
          break;
        }

        // Check for characterData mutations (text content changes)
        if (mutation.type === "characterData") {
          shouldScroll = true;
          break;
        }

        // Check for attribute mutations that might affect layout
        if (mutation.type === "attributes" && mutation.attributeName === "style") {
          shouldScroll = true;
          break;
        }
      }

      if (shouldScroll) {
        // Use requestAnimationFrame to ensure DOM has updated
        requestAnimationFrame(() => {
          scrollToBottom();
        });
      }
    });

    observerRef.current.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["style"]
    });

    // ResizeObserver to watch for container size changes
    resizeObserverRef.current = new ResizeObserver(() => {
      // Only scroll if we're near the bottom or this is a new message
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      const isNearBottom = distanceFromBottom <= 200; // Slightly larger threshold for resize

      if (isNearBottom || !userScrolledUp) {
        requestAnimationFrame(() => {
          scrollToBottom();
        });
      }
    });

    resizeObserverRef.current.observe(container);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [ref, userScrolledUp, dependency]);

  // Reset userScrolledUp when dependency changes (new messages)
  useEffect(() => {
    setUserScrolledUp(false);
  }, [dependency]);

  return { userScrolledUp };
}
