# Streaming Text Fade-in Animation

## Overview
The streaming text fade-in animation provides a subtle but noticeable effect as text streams in from the LLM. When content is updated during streaming, it triggers a smooth fade-in animation with gentle upward motion.

## How It Works

### Animation Trigger
The animation is triggered automatically when:
1. A message has `isStreaming: true`
2. Content is being updated in real-time via the `onProgress` callback
3. New content appears in the message

### Implementation Details

#### Chat Page Updates Content (`ChatPageClient.tsx`)
```typescript
// Line 281: Content updates during streaming
if (progress.status === "ready" && progress.message) {
  setMessages((prev) =>
    prev.map((msg) =>
      msg.id === assistantMessageId
        ? { ...msg, content: progress.message || "" }
        : msg
    )
  );
}
```

#### Animation Component (`chat-message.tsx`)
```typescript
// Lines 22-33: Animation trigger logic
useEffect(() => {
  if (isStreaming && content) {
    // Trigger animation when streaming starts and content appears
    setShouldAnimate(true);

    // Reset animation flag after animation completes
    const timer = setTimeout(() => {
      setShouldAnimate(false);
    }, 600); // Matches CSS animation duration

    return () => clearTimeout(timer);
  }
}, [content, isStreaming]);
```

## Animation Timing Configuration

### CSS Animation Duration
**File**: `packages/frontend/src/app/globals.css`

```css
.streaming-text {
  animation: fadeIn 0.6s ease-out forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(3px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

#### To adjust the animation timing:
1. **Duration**: Change `0.6s` (line 322) to your desired duration
   - Faster: `0.3s` or `0.4s` for quicker animations
   - Slower: `0.8s` or `1.0s` for more dramatic effect

2. **Easing function**: Change `ease-out` to alter the animation curve
   - `ease-in`: Starts slow, speeds up
   - `ease-in-out`: Smooth acceleration and deceleration
   - `linear`: Constant speed

3. **Movement**: Adjust `translateY(3px)` to change the upward motion
   - More subtle: `translateY(1px)`
   - More noticeable: `translateY(5px)`

### Component Timing
**File**: `packages/frontend/src/components/chat/chat-message.tsx`

The component timeout must match the CSS duration:

```typescript
// Line 28: Update this to match CSS duration
const timer = setTimeout(() => {
  setShouldAnimate(false);
}, 600); // Should match CSS animation duration
```

### Animation Classes

#### Available Classes:
- `.streaming-text`: Main fade-in animation for streaming content
- `.streaming-text-word`: Word-by-word animation (备用选项)

#### Usage:
The animation is automatically applied when:
- `message.isStreaming` is `true`
- Content is being updated in real-time

## Customization Examples

### Quick, Subtle Animation:
```css
.streaming-text {
  animation: fadeIn 0.4s ease-out forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(1px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Dramatic, Slow Animation:
```css
.streaming-text {
  animation: fadeIn 1.2s ease-in-out forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### No Movement (Fade Only):
```css
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(0);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

## Testing Changes

After making changes:
1. Restart the development server
2. Send a message to see the streaming animation
3. Adjust timing values until you achieve the desired effect

## Accessibility

The animation respects `prefers-reduced-motion` settings and will be disabled for users who have requested reduced motion in their system preferences.