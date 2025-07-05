# Frontend Design System

This project uses Tailwind CSS with custom CSS variables _(HSL notation)_ to provide a cohesive, easily-themed UI across light & dark modes.

---

## 1. Color Tokens

All colors live as **CSS custom properties** on `:root` (light) and `.dark` (dark) in `app/globals.css`.

```
--background          --foreground
--primary             --primary-foreground
--secondary           --secondary-foreground
--accent              --accent-foreground   (gold / highlight)
--success             --success-foreground  (green)
--destructive         --destructive-foreground (red)
--muted               --muted-foreground
--border / --input / --ring
--chart-1 … --chart-5 (data-viz palette)
--sidebar-*           (navigation chrome)
```

### Why HSL?
HSL makes it easy to bump **lightness / saturation** for hover or disabled states with `opacity` utilities (e.g. `bg-primary/80`).

---

## 2. Tailwind Configuration (`tailwind.config.ts`)

The config maps each CSS variable to **semantic names**:

```ts
colors: {
  background: 'hsl(var(--background))',
  primary:   { DEFAULT: 'hsl(var(--primary))',  foreground: 'hsl(var(--primary-foreground))' },
  secondary: { DEFAULT: 'hsl(var(--secondary))',foreground: 'hsl(var(--secondary-foreground))' },
  accent:    { DEFAULT: 'hsl(var(--accent))',   foreground: 'hsl(var(--accent-foreground))' },
  success:   'hsl(var(--success))',
  'success-foreground': 'hsl(var(--success-foreground))',
  destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
  // …plus border, ring, chart, sidebar etc.
}
```

Use **semantic utilities** instead of raw Tailwind colors:

```
text-primary           bg-background
bg-accent/70           border-border
```

Avoid classes like `bg-blue-600` or `text-red-500` in app code.

---

## 3. Component Variants

We added variants to core UI primitives (all in `components/ui/`):

| Component | Variant(s) |
|-----------|------------|
| `Button`  | `default`, `secondary`, `ghost`, `link`, `destructive`, **`success`** |
| `Badge`   | `default`, `secondary`, `outline`, `destructive`, **`success`**, **`accent`** |

These variants already apply the correct background / text tokens. Prefer them over ad-hoc classNames.

Example:

```tsx
<Button variant="success">Save</Button>
<Badge variant="accent">National</Badge>
```

---

## 4. Dark Mode

We rely on [`next-themes`](https://github.com/pacocoursey/next-themes).

* `ThemeProvider` wraps the app in `app/layout.tsx`.
* User preference is stored in `localStorage`; system preference is honoured by default.
* Toggle via the **sun/moon icon** in the navigation bar (`components/theme-toggle.tsx`).

When adding components:

1. Use semantic tokens — they automatically flip in dark mode.
2. For custom graphics (e.g. SVG strokes), read the variable directly:
   ```tsx
   <svg stroke="hsl(var(--foreground))" />
   ```

---

## 5. Creating New Tokens / Variants

1. **Add CSS vars** in both `:root` and `.dark` inside `app/globals.css`.
2. Expose them in `tailwind.config.ts` under `theme.extend.colors`.
3. (Optional) Add a component variant if it makes sense across the app.

---

## 6. Linting Tips

A `grep` search for `bg-.*-[0-9]` and `text-.*-[0-9]` should return **no matches** inside `frontend/app` & `frontend/components`.*

> _* Allowable exceptions: charts & utility demos where arbitrary colours improve clarity._

---

Happy theming! 🎨 