"use client";

import * as React from 'react';
// @ts-ignore
import { useInView } from 'react-intersection-observer';

interface ChatScrollAnchorProps {
  trackVisibility: boolean;
  isAtBottom: boolean;
  scrollAreaRef: React.RefObject<HTMLDivElement>;
}

export function ChatScrollAnchor({
  trackVisibility,
  isAtBottom,
  scrollAreaRef,
}: ChatScrollAnchorProps) {
  const { ref, inView, entry } = useInView({
    trackVisibility,
    delay: 100,
  });

  React.useEffect(() => {
    if (isAtBottom && trackVisibility && !inView) {
      if (!scrollAreaRef.current) return;

      const scrollAreaElement = scrollAreaRef.current;

      scrollAreaElement.scrollTop =
        scrollAreaElement.scrollHeight - scrollAreaElement.clientHeight;
    }
  }, [inView, entry, isAtBottom, trackVisibility]);

  return <div ref={ref} className='h-px w-full' />;
}
