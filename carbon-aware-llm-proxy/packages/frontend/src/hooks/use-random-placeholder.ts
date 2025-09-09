import { useState, useEffect } from 'react';

// Quirky and playful placeholders for initial chat input
const initialPlaceholders = [
  "Where shall we adventure?",
  "Ready for a chat journey?",
  "What's our destination?",
  "Let's explore together!",
  "Your AI awaits...",
  "What's on your mind?",
  "Adventure awaits!",
  "Ready to explore?",
  "What's next?",
  "Let's begin!",
  "Your thoughts?",
  "Ready when you are!",
  "What's our quest?",
  "Let's discover!",
  "Your turn!",
  "What's brewing?"
];

// Quirky and playful placeholders for bottom chat input
const bottomPlaceholders = [
  "Keep chatting!",
  "What's next?",
  "Your thoughts?",
  "Tell me more!",
  "Share your ideas!",
  "What's cooking?",
  "What's your take?",
  "Any thoughts?",
  "What's up?",
  "Share away!",
  "Your turn!",
  "What's new?",
  "Tell me!",
  "What's on?",
  "Let's hear it!",
  "Your input?"
];

export function useRandomPlaceholder(type: 'initial' | 'bottom') {
  const [placeholder, setPlaceholder] = useState('');

  useEffect(() => {
    const placeholders = type === 'initial' ? initialPlaceholders : bottomPlaceholders;
    const randomIndex = Math.floor(Math.random() * placeholders.length);
    setPlaceholder(placeholders[randomIndex]);
  }, [type]);

  return placeholder;
}
