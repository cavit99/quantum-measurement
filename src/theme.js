// src/theme.js
import { createSystem, defaultConfig } from '@chakra-ui/react';

// Define your theme overrides using the new structure
const themeOverrides = {
  config: {
    initialColorMode: 'light',
    useSystemColorMode: false,
  },
  tokens: { // Theme values now go under 'tokens'
    colors: {
      brand: { // Your custom brand colors
        50: { value: '#f0f9ff' }, // Values should often be wrapped in { value: ... }
        100: { value: '#e0f2fe' },
        200: { value: '#bae6fd' },
        300: { value: '#7dd3fc' },
        400: { value: '#38bdf8' },
        500: { value: '#0ea5e9' },
        600: { value: '#0284c7' },
        700: { value: '#0369a1' },
        800: { value: '#075985' },
        900: { value: '#0c4a6e' },
      },
    },
    fonts: { // Your custom fonts
      heading: { value: 'system-ui, sans-serif' },
      body: { value: 'system-ui, sans-serif' },
    },
  },
  // You can add semanticTokens or component styles here later if needed
  // semanticTokens: { ... }
  // components: { Button: { ... } }
};

// Create the theme system by merging defaults with your overrides
const theme = createSystem(defaultConfig, {
  theme: themeOverrides
});

export default theme;