# Accensa Design System

This document outlines the core principles and implementation details of the Accensa web application design system.

## 1. Core Philosophy

The design philosophy for Accensa revolves around **Premium Glassmorphism**. The goal is to create a dynamic, engaging, and high-fidelity interface that feels physical and reactive to the user. We emphasize vivid colors, deep blurs, and crisp specular highlights to simulate frosted glass resting over a glowing, ambient background.

## 2. Global Aesthetics

- **Themes**: We explicitly support only two modes: Light and Dark. System-level auto-switching is disabled by default to maintain deterministic visual presentation, preventing awkward UI states where the OS preference overrides the user's manual toggle.
- **Typography**: Uses the `Geist` font family (Sans and Mono) for a sharp, modern, and highly legible look, matching high-end tech SaaS products.
- **Performance**: We employ `disableTransitionOnChange` on the theme provider. This temporarily suspends the global 300ms CSS transitions during a theme switch, ensuring the layout flips instantly without causing heavy GPU crossfades across hundreds of blurred elements.

## 3. The Glassmorphic Stack

Our glassmorphism effect is built using Tailwind CSS via a combination of backgrounds, borders, shadows, and backdrop filters.

### 3.1. Ambient Background Glows

Glass only looks like glass if it has something colorful beneath it to distort and blur.

- We use large, fixed, absolutely positioned `div` orbs in the root layout (Emerald, Teal, Sky, and Indigo).
- **Light Mode**: Opacities hover around `30%-40%` with `mix-blend-multiply` to darken and saturate overlapping colors.
- **Dark Mode**: Opacities drop to `15%-20%` with `mix-blend-screen` to brighten the overlapping colors against the near-black background (`#04090f`).
- **Blur**: The orbs are heavily diffused using `blur-[120px]`.

### 3.2. Surface Properties (The Glass)

All cards, dropdowns, and modals use a standardized frosted glass treatment:

- **Base Background**: `bg-white/50` (Light Mode) and `dark:bg-white/5` or `dark:bg-black/20` (Dark Mode).
- **Backdrop Blur**: `backdrop-blur-2xl` or `backdrop-blur-3xl` forces the background orbs to heavily diffuse when scrolled under the elements.
- **Physical Borders**: A subtle translucent border (`border-slate-200/60` and `dark:border-white/20`) provides the bevel of the glass edge.

### 3.3. Specular Highlights & Depth

To simulate the physical depth and light refraction of glass, we use intense inset shadows:

- **Light Mode**: `inset 0 1px 1px rgba(255,255,255,0.8)` creates a strong, sharp white highlight along the top inner edge of the container.
- **Dark Mode**: `inset 0 1px 1px rgba(255,255,255,0.15)` creates a subtle light catch on the top edge.
- **Drop Shadows**: We pair the inset highlight with soft, dispersed drop shadows (`shadow-[0_8px_32px_rgba(0,0,0,0.5)]` in dark mode) so the glass elements appear to float.

## 4. Mobile Responsiveness and Interactions

- **Tap Interactions**: Hover effects on mobile iOS Safari can trap the first tap (the "double-tap bug"). To solve this, all hover states (e.g., `hover:bg-white/60`) are strictly scoped to desktop using the `md:` breakpoint (`md:hover:bg-white/60`).
- **Active States**: For touch devices, we use the `active:` pseudo-class (e.g., `active:bg-white/60`) to provide instant physical feedback when a button or toggle is pressed, without interfering with the click event.
- **Navigation**: Mobile layouts consolidate links into a backdrop-blurred hamburger dropdown (`backdrop-blur-3xl`) to save screen real estate.

## 5. Tailwind Implementation Example

A standard glass card implementation:

```tsx
<div
  className="
  bg-white/50 dark:bg-white/5
  backdrop-blur-2xl
  border border-slate-200/60 dark:border-white/20
  rounded-3xl
  p-8
  shadow-[0_8px_30px_rgba(0,0,0,0.12),inset_0_1px_1px_rgba(255,255,255,0.8)]
  dark:shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.15)]
  transition-colors duration-300
"
>
  {/* Content */}
</div>
```
