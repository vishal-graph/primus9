/**
 * TatvaOps Vision - Material UI Theme
 * 
 * Design Principles:
 * - Calm over clever
 * - Clarity over decoration
 * - Enterprise SaaS aesthetic
 * - Visual inspiration: Apple iCloud, Google Cloud Console, Linear
 * 
 * NO gradients, NO flashy colors, NO visual noise
 */

import { createTheme, ThemeOptions } from '@mui/material/styles';

// Color Palette - Dark theme, frosted-glass friendly
const palette = {
  mode: 'dark' as const,
  // Background: Dark base for frosted overlays
  background: {
    default: '#0f0f11',       // Dark base
    paper: '#18181b',         // Elevated surface
    elevated: '#1f1f23',      // Cards, panels
  },
  
  // Primary: Muted indigo (works on dark)
  primary: {
    main: '#818cf8',          // Indigo
    light: '#a5b4fc',
    dark: '#6366f1',
    contrastText: '#ffffff',
  },
  
  // Accent
  secondary: {
    main: '#5C6BC0',
    light: '#8E99F3',
    dark: '#26418F',
    contrastText: '#FFFFFF',
  },
  
  success: {
    main: '#34d399',
    light: '#6ee7b7',
    dark: '#10b981',
    contrastText: '#000000',
  },
  error: {
    main: '#f87171',
    light: '#fca5a5',
    dark: '#ef4444',
    contrastText: '#FFFFFF',
  },
  warning: {
    main: '#fbbf24',
    light: '#fcd34d',
    dark: '#f59e0b',
    contrastText: '#000000',
  },
  info: {
    main: '#38bdf8',
    light: '#7dd3fc',
    dark: '#0ea5e9',
    contrastText: '#000000',
  },
  text: {
    primary: '#fafafa',
    secondary: '#a1a1aa',
    disabled: '#71717a',
  },
  divider: 'rgba(255, 255, 255, 0.08)',
  action: {
    active: '#fafafa',
    hover: 'rgba(255, 255, 255, 0.06)',
    selected: 'rgba(255, 255, 255, 0.1)',
    disabled: 'rgba(255, 255, 255, 0.26)',
    disabledBackground: 'rgba(255, 255, 255, 0.08)',
  },
};

// Typography - System-first, Clear Hierarchy
const typography = {
  fontFamily: [
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'Roboto',
    '"Helvetica Neue"',
    'Arial',
    'sans-serif',
  ].join(','),
  
  // Headings
  h1: {
    fontSize: '2.5rem',       // 40px
    fontWeight: 600,
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
  },
  h2: {
    fontSize: '2rem',         // 32px
    fontWeight: 600,
    lineHeight: 1.25,
    letterSpacing: '-0.01em',
  },
  h3: {
    fontSize: '1.75rem',      // 28px
    fontWeight: 600,
    lineHeight: 1.3,
  },
  h4: {
    fontSize: '1.5rem',       // 24px
    fontWeight: 600,
    lineHeight: 1.35,
  },
  h5: {
    fontSize: '1.25rem',      // 20px
    fontWeight: 600,
    lineHeight: 1.4,
  },
  h6: {
    fontSize: '1rem',         // 16px
    fontWeight: 600,
    lineHeight: 1.5,
  },
  
  // Body
  body1: {
    fontSize: '1rem',         // 16px
    lineHeight: 1.5,
  },
  body2: {
    fontSize: '0.875rem',     // 14px
    lineHeight: 1.43,
  },
  
  // Utility
  button: {
    fontSize: '0.875rem',
    fontWeight: 500,
    textTransform: 'none' as const,  // No uppercase buttons
    letterSpacing: '0.02em',
  },
  caption: {
    fontSize: '0.75rem',      // 12px
    lineHeight: 1.66,
  },
  overline: {
    fontSize: '0.75rem',
    fontWeight: 600,
    lineHeight: 2.66,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
  },
};

// Spacing - Consistent 8px Grid (Tighter for cleaner UI)
const spacing = 8;

// Shape - Subtle Borders
const shape = {
  borderRadius: 8,            // Consistent border radius
};

// Shadows - Minimal Elevation
const shadows = [
  'none',
  '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  ...Array(18).fill('none'),
] as any;

// Frosted glass / visible glass style for all surface backgrounds
const glassSurface = {
  backgroundColor: 'rgba(28, 28, 32, 0.72)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
};

// Component Overrides
const components = {
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        padding: '10px 20px',
        fontWeight: 500,
        boxShadow: 'none',
        '&:hover': {
          boxShadow: 'none',
        },
      },
      contained: {
        '&:hover': {
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        },
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        ...glassSurface,
        borderRadius: 12,
        boxShadow: 'none',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
        },
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        backgroundImage: 'none',
        ...glassSurface,
      },
      elevation1: {
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.2)',
      },
      elevation2: {
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.25)',
      },
    },
  },
  MuiAppBar: {
    styleOverrides: {
      root: {
        boxShadow: 'none',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      },
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: {
        ...glassSurface,
        borderRight: '1px solid rgba(255,255,255,0.08)',
        boxShadow: 'none',
      },
    },
  },
  MuiDialog: {
    defaultProps: {
      slotProps: {
        backdrop: {
          sx: {
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          },
        },
      },
      PaperProps: {
        sx: {
          backgroundColor: 'rgba(30, 30, 34, 0.88)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        },
      },
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          '& fieldset': {
            borderColor: 'rgba(255,255,255,0.12)',
          },
        },
      },
    },
  },
  
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: 6,
        fontWeight: 500,
      },
    },
  },
  
  MuiTab: {
    styleOverrides: {
      root: {
        textTransform: 'none',
        fontWeight: 500,
        fontSize: '0.9375rem',
      },
    },
  },
  
  MuiStepper: {
    styleOverrides: {
      root: {
        padding: 0,
      },
    },
  },
};

// Create Theme
const themeOptions: ThemeOptions = {
  palette,
  typography,
  spacing,
  shape,
  shadows,
  components,
  
  // Transitions - Subtle, Never Distracting
  transitions: {
    duration: {
      shortest: 150,
      shorter: 200,
      short: 250,
      standard: 300,
      complex: 375,
      enteringScreen: 225,
      leavingScreen: 195,
    },
    easing: {
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
    },
  },
};

export const theme = createTheme(themeOptions);

// Export for use in emotion/styled
export type Theme = typeof theme;

