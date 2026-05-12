import { defineConfig, presetUno } from 'unocss';

export default defineConfig({
  presets: [presetUno({ dark: 'class' })],
  theme: {
    colors: {
      bg: {
        canvas: 'var(--bg-canvas)',
        surface: 'var(--bg-surface)',
        sunken: 'var(--bg-sunken)',
        elevated: 'var(--bg-elevated)',
        hover: 'var(--bg-hover)',
      },
      fg: {
        primary: 'var(--fg-primary)',
        secondary: 'var(--fg-secondary)',
        muted: 'var(--fg-muted)',
        inverse: 'var(--fg-inverse)',
      },
      border: {
        DEFAULT: 'var(--border-default)',
        strong: 'var(--border-strong)',
        muted: 'var(--border-muted)',
      },
      brand: {
        50: '#eff6ff',
        100: '#dbeafe',
        500: '#3b82f6',
        600: '#2563eb',
        700: '#1d4ed8',
      },
      status: {
        success: 'var(--status-success)',
        warning: 'var(--status-warning)',
        danger: 'var(--status-danger)',
        info: 'var(--status-info)',
      },
    },
    boxShadow: {
      'soft-1': '0 1px 2px 0 rgba(0,0,0,0.32)',
      'soft-2': '0 4px 12px -2px rgba(0,0,0,0.4)',
      'soft-3': '0 12px 32px -4px rgba(0,0,0,0.48)',
    },
    borderRadius: {
      sm: '4px',
      DEFAULT: '6px',
      md: '8px',
      lg: '12px',
      xl: '16px',
    },
  },
  shortcuts: {
    'card-surface': 'bg-bg-surface border border-border rounded-lg',
    'card-elevated': 'bg-bg-elevated border border-border-muted rounded-lg shadow-soft-1',
    'text-mute': 'text-fg-muted',
    'h-screen-app': 'h-[100vh]',
  },
});
