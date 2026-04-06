---
name: interaction-design
description: Design and implement microinteractions, motion design, transitions, and user feedback patterns using Tailwind CSS 4 and CSS animations. Use when adding polish to UI interactions, implementing loading states, or creating delightful user experiences.
---

# Interaction Design

Create engaging, intuitive interactions through motion, feedback, and thoughtful state transitions that enhance usability and delight users.

## When to Use This Skill

- Adding microinteractions to enhance user feedback
- Implementing smooth page and component transitions
- Designing loading states and skeleton screens
- Building notification and toast systems
- Adding scroll-triggered animations
- Designing hover and focus states
- Animating data visualization transitions (treemap, charts)

## Core Principles

### 1. Purposeful Motion

Motion should communicate, not decorate:

- **Feedback**: Confirm user actions occurred
- **Orientation**: Show where elements come from/go to
- **Focus**: Direct attention to important changes
- **Continuity**: Maintain context during transitions

### 2. Timing Guidelines

| Duration  | Use Case                                  |
| --------- | ----------------------------------------- |
| 100-150ms | Micro-feedback (hovers, clicks)           |
| 200-300ms | Small transitions (toggles, dropdowns)    |
| 300-500ms | Medium transitions (modals, page changes) |
| 500ms+    | Complex choreographed animations          |

### 3. Easing Functions

```css
/* Common easings */
--ease-out: cubic-bezier(0.16, 1, 0.3, 1); /* Decelerate - entering */
--ease-in: cubic-bezier(0.55, 0, 1, 0.45); /* Accelerate - exiting */
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1); /* Both - moving between */
--spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* Overshoot - playful */
```

## Tailwind CSS 4 Animation Utilities

### Built-in Animations

```html
<!-- Pulse (loading indicators) -->
<div class="animate-pulse bg-gray-200 rounded h-4 w-3/4"></div>

<!-- Spin (loading spinners) -->
<svg class="animate-spin h-5 w-5 text-blue-600">...</svg>

<!-- Bounce (attention) -->
<div class="animate-bounce">New!</div>

<!-- Ping (notifications) -->
<span class="relative flex h-3 w-3">
  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
  <span class="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
</span>
```

### Transition Utilities

```html
<!-- Hover scale with transition -->
<button class="transition-transform duration-200 ease-out hover:scale-105 active:scale-95">
  Click me
</button>

<!-- Color transition -->
<div class="transition-colors duration-300 bg-gray-100 hover:bg-blue-50">
  Hover to change
</div>

<!-- Combined transitions -->
<div class="transition-all duration-300 ease-out opacity-0 translate-y-2
            group-hover:opacity-100 group-hover:translate-y-0">
  Revealed content
</div>
```

### Duration and Easing Scale

```html
<!-- Duration: 75, 100, 150, 200, 300, 500, 700, 1000 -->
<div class="duration-200">...</div>

<!-- Easing: ease-linear, ease-in, ease-out, ease-in-out -->
<div class="ease-out">...</div>
```

## Interaction Patterns

### 1. Loading States

**Skeleton Screens**: Preserve layout while loading

```tsx
function CardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-48 bg-gray-200 rounded-lg" />
      <div className="mt-4 h-4 bg-gray-200 rounded w-3/4" />
      <div className="mt-2 h-4 bg-gray-200 rounded w-1/2" />
    </div>
  );
}
```

**Progress Bar**: CSS-only with Tailwind

```tsx
function ProgressBar({ progress }) {
  return (
    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
      <div
        className="h-full bg-blue-600 transition-all duration-500 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
```

### 2. State Transitions

**Toggle with CSS transition**:

```tsx
function Toggle({ checked, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`
        relative w-12 h-6 rounded-full transition-colors duration-200
        ${checked ? 'bg-blue-600' : 'bg-gray-300'}
      `}
    >
      <span
        className={`
          absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow
          transition-transform duration-200 ease-out
          ${checked ? 'translate-x-6' : 'translate-x-0'}
        `}
      />
    </button>
  );
}
```

### 3. Card Hover Effects

```tsx
function Card({ children }) {
  return (
    <div className="transition-all duration-200 ease-out
                    hover:-translate-y-1 hover:shadow-lg
                    active:translate-y-0 active:shadow-md">
      {children}
    </div>
  );
}
```

### 4. Fade-in on Mount

```css
/* In index.css */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-out;
}
```

```tsx
function FadeInSection({ children }) {
  return <div className="animate-fadeIn">{children}</div>;
}
```

### 5. Data Visualization Transitions (Recharts)

```tsx
import { LineChart, Line } from 'recharts';

// Recharts supports animationDuration and animationEasing props
<LineChart data={data}>
  <Line
    type="monotone"
    dataKey="score"
    animationDuration={500}
    animationEasing="ease-out"
  />
</LineChart>
```

### 6. Treemap Transitions (d3)

```tsx
// When updating d3-hierarchy treemap data, use CSS transitions
// on the positioned rectangles for smooth resizing
<div
  className="absolute transition-all duration-500 ease-out"
  style={{ left, top, width, height }}
>
  {label}
</div>
```

## CSS Custom Animations

### Keyframe Animations

```css
@keyframes slideInFromRight {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

@keyframes slideInFromBottom {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes scaleIn {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

/* RTL-aware slide (use inset-inline-start in component) */
@keyframes slidePanel {
  from { transform: translateX(calc(-100% * var(--dir-multiplier, 1))); }
  to { transform: translateX(0); }
}
```

## Accessibility

### Reduced Motion

```html
<!-- Tailwind CSS 4: motion-reduce and motion-safe variants -->
<div class="animate-bounce motion-reduce:animate-none">
  Bouncing (unless reduced motion preferred)
</div>

<div class="transition-transform duration-300
            motion-reduce:transition-none motion-reduce:duration-0">
  Smooth hover (instant if reduced motion preferred)
</div>
```

```css
/* Global fallback in index.css */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Best Practices

1. **Performance First**: Use `transform` and `opacity` for smooth 60fps
2. **Reduce Motion Support**: Always use `motion-reduce:` variant on animated elements
3. **Consistent Timing**: Use Tailwind's duration scale across the app
4. **CSS over JS**: Prefer CSS transitions/animations over JavaScript for simple effects
5. **RTL Awareness**: Use logical properties (`inset-inline-start`) for directional animations
6. **Interruptible**: Allow users to cancel long animations
7. **Progressive Enhancement**: Work without animations enabled

## Common Issues

- **Janky Animations**: Avoid animating `width`, `height`, `top`, `left` -- use `transform` instead
- **Over-animation**: Too much motion causes fatigue
- **Blocking Interactions**: Never prevent user input during animations
- **Memory Leaks**: Clean up animation listeners on unmount
- **RTL direction**: Test animations with `dir="rtl"` -- translateX direction reverses

## Resources

- [Tailwind CSS Animation Docs](https://tailwindcss.com/docs/animation)
- [CSS Animation Guide](https://web.dev/animations-guide/)
- [Material Design Motion](https://m3.material.io/styles/motion/overview)
