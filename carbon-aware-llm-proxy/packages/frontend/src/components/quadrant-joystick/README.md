# QuadrantJoystick Component

A reusable React component for selecting preferences between Efficiency, Trust, Performance, and Simplicity using a 2D joystick-style slider.

## Features

- **Interactive 2D Joystick**: Drag or click to set position
- **Four Quadrants**: Visual representation of trade-offs
- **Real-time Feedback**: Immediate position and quadrant updates
- **Responsive Design**: Works on desktop and mobile
- **Dark Mode Support**: Automatically adapts to theme
- **Smooth Animations**: 300ms transitions for all interactions
- **TypeScript Support**: Full type safety
- **Accessibility**: Keyboard navigation support

## Installation

The component is already integrated into the carbon-aware-llm-proxy project. Simply import and use:

```typescript
import { QuadrantJoystick } from "@/components/quadrant-joystick";
```

## Usage

### Basic Usage

```typescript
import { QuadrantJoystick } from '@/components/quadrant-joystick';

function MyComponent() {
  const handleChange = (position) => {
    console.log('Position:', position.x, position.y);
    console.log('Quadrant:', position.quadrant);
  };

  return <QuadrantJoystick onChange={handleChange} />;
}
```

### Advanced Usage

```typescript
import { QuadrantJoystick } from '@/components/quadrant-joystick';

function AdvancedExample() {
  const [position, setPosition] = useState({ x: 0.5, y: -0.3 });

  return (
    <QuadrantJoystick
      onChange={setPosition}
      defaultPosition={{ x: 0.5, y: -0.3 }}
      size={400}
      showCoordinates={true}
      snapToCenter={true}
      disabled={false}
    />
  );
}
```

## Props

| Prop              | Type                                   | Default          | Description                              |
| ----------------- | -------------------------------------- | ---------------- | ---------------------------------------- |
| `onChange`        | `(position: QuadrantPosition) => void` | -                | Callback fired when position changes     |
| `defaultPosition` | `{ x: number, y: number }`             | `{ x: 0, y: 0 }` | Initial position (normalized -1 to 1)    |
| `disabled`        | `boolean`                              | `false`          | Whether the joystick is disabled         |
| `size`            | `number`                               | `320`            | Size of the joystick container in pixels |
| `showCoordinates` | `boolean`                              | `false`          | Whether to display coordinate values     |
| `snapToCenter`    | `boolean`                              | `false`          | Whether to snap to center on release     |
| `className`       | `string`                               | -                | Additional CSS classes                   |

## Quadrant Mapping

The component divides the space into four quadrants:

- **Top-Left (Trust)**: x < 0, y > 0
- **Top-Right (Performance)**: x > 0, y > 0
- **Bottom-Left (Efficiency)**: x < 0, y < 0
- **Bottom-Right (Simplicity)**: x > 0, y < 0
- **Center**: Within 0.1 threshold of (0, 0)

## Styling

The component uses Tailwind CSS and follows the project's design system:

- **Dark mode**: Automatic theme adaptation
- **Colors**: Uses semantic color tokens
- **Spacing**: Consistent with design tokens
- **Typography**: Matches existing text styles

## Examples

See `QuadrantJoystick.example.tsx` for a complete usage example with live preview.

## Integration with Carbon-Aware Routing

The component can be used to set user preferences for model routing:

```typescript
function RoutingPreferences() {
  const [preferences, setPreferences] = useState(null);

  const handlePreferenceChange = (position) => {
    // Map position to routing weights
    const weights = {
      efficiency: Math.max(0, -position.x), // Left = efficiency
      trust: Math.max(0, position.y),       // Top = trust
      performance: Math.max(0, position.x), // Right = performance
      simplicity: Math.max(0, -position.y), // Bottom = simplicity
    };

    setPreferences(weights);
  };

  return (
    <div>
      <h3>Set Your Preferences</h3>
      <QuadrantJoystick onChange={handlePreferenceChange} />
    </div>
  );
}
```

## Browser Support

- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance

- Optimized re-renders with React hooks
- Smooth 60fps animations
- Minimal bundle size impact
- Efficient event handling
