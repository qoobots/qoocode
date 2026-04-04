/**
 * QOOCODE Design System
 * Unified UI components and theming for QOOCODE extension
 */

import * as vscode from 'vscode';

// Color tokens for light/dark themes
export interface ColorTokens {
  // Primary colors
  primary: string;
  primaryHover: string;
  primaryActive: string;
  
  // Secondary colors
  secondary: string;
  secondaryHover: string;
  
  // Background colors
  background: string;
  backgroundAlt: string;
  backgroundHover: string;
  backgroundActive: string;
  
  // Text colors
  text: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  
  // Border colors
  border: string;
  borderHover: string;
  borderActive: string;
  
  // Status colors
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Semantic colors
  focusRing: string;
  shadow: string;
  overlay: string;
}

// Typography tokens
export interface TypographyTokens {
  fontFamily: string;
  fontSizeXs: string;
  fontSizeSm: string;
  fontSizeMd: string;
  fontSizeLg: string;
  fontSizeXl: string;
  
  fontWeightNormal: string;
  fontWeightMedium: string;
  fontWeightBold: string;
  
  lineHeightTight: string;
  lineHeightNormal: string;
  lineHeightRelaxed: string;
}

// Spacing tokens
export interface SpacingTokens {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  xxl: string;
}

// Border radius tokens
export interface BorderRadiusTokens {
  none: string;
  sm: string;
  md: string;
  lg: string;
  full: string;
}

// Shadow tokens
export interface ShadowTokens {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

// Animation tokens
export interface AnimationTokens {
  durationFast: string;
  durationNormal: string;
  durationSlow: string;
  easingDefault: string;
  easingBounce: string;
}

// Complete theme
export interface Theme {
  name: string;
  colors: ColorTokens;
  typography: TypographyTokens;
  spacing: SpacingTokens;
  borderRadius: BorderRadiusTokens;
  shadows: ShadowTokens;
  animations: AnimationTokens;
}

// Default light theme
const lightColors: ColorTokens = {
  primary: '#0078d4',
  primaryHover: '#106ebe',
  primaryActive: '#005a9e',
  
  secondary: '#6c757d',
  secondaryHover: '#5a6268',
  
  background: '#ffffff',
  backgroundAlt: '#f8f9fa',
  backgroundHover: '#e9ecef',
  backgroundActive: '#dee2e6',
  
  text: '#212529',
  textSecondary: '#6c757d',
  textMuted: '#adb5bd',
  textInverse: '#ffffff',
  
  border: '#dee2e6',
  borderHover: '#ced4da',
  borderActive: '#adb5bd',
  
  success: '#28a745',
  warning: '#ffc107',
  error: '#dc3545',
  info: '#17a2b8',
  
  focusRing: 'rgba(0, 120, 212, 0.4)',
  shadow: 'rgba(0, 0, 0, 0.1)',
  overlay: 'rgba(0, 0, 0, 0.5)'
};

// Default dark theme
const darkColors: ColorTokens = {
  primary: '#4fc3f7',
  primaryHover: '#81d4fa',
  primaryActive: '#29b6f6',
  
  secondary: '#adb5bd',
  secondaryHover: '#ced4da',
  
  background: '#1e1e1e',
  backgroundAlt: '#252526',
  backgroundHover: '#2d2d2d',
  backgroundActive: '#3c3c3c',
  
  text: '#e4e4e4',
  textSecondary: '#a0a0a0',
  textMuted: '#6e6e6e',
  textInverse: '#1e1e1e',
  
  border: '#3c3c3c',
  borderHover: '#4e4e4e',
  borderActive: '#5e5e5e',
  
  success: '#4caf50',
  warning: '#ff9800',
  error: '#f44336',
  info: '#03a9f4',
  
  focusRing: 'rgba(79, 195, 247, 0.4)',
  shadow: 'rgba(0, 0, 0, 0.3)',
  overlay: 'rgba(0, 0, 0, 0.7)'
};

// Shared tokens
const typography: TypographyTokens = {
  fontFamily: 'var(--vscode-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
  fontSizeXs: '10px',
  fontSizeSm: '12px',
  fontSizeMd: '14px',
  fontSizeLg: '16px',
  fontSizeXl: '20px',
  
  fontWeightNormal: '400',
  fontWeightMedium: '500',
  fontWeightBold: '600',
  
  lineHeightTight: '1.2',
  lineHeightNormal: '1.5',
  lineHeightRelaxed: '1.75'
};

const spacing: SpacingTokens = {
  xs: '2px',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  xxl: '24px'
};

const borderRadius: BorderRadiusTokens = {
  none: '0',
  sm: '2px',
  md: '4px',
  lg: '6px',
  full: '9999px'
};

const shadows: ShadowTokens = {
  none: 'none',
  sm: '0 1px 2px rgba(0, 0, 0, 0.1)',
  md: '0 2px 4px rgba(0, 0, 0, 0.1)',
  lg: '0 4px 8px rgba(0, 0, 0, 0.15)',
  xl: '0 8px 16px rgba(0, 0, 0, 0.2)'
};

const animations: AnimationTokens = {
  durationFast: '100ms',
  durationNormal: '200ms',
  durationSlow: '300ms',
  easingDefault: 'ease-in-out',
  easingBounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
};

// Theme definitions
export const lightTheme: Theme = {
  name: 'light',
  colors: lightColors,
  typography,
  spacing,
  borderRadius,
  shadows,
  animations
};

export const darkTheme: Theme = {
  name: 'dark',
  colors: darkColors,
  typography,
  spacing,
  borderRadius,
  shadows,
  animations
};

// Design System Provider
export class DesignSystemProvider {
  private currentTheme: Theme;
  private themeChangedEmitter = new vscode.EventEmitter<Theme>();
  private colorSubscription: vscode.Disposable | undefined;

  public readonly onThemeChanged = this.themeChangedEmitter.event;

  constructor() {
    this.currentTheme = this.getSystemTheme();
    this.setupThemeListener();
  }

  /**
   * Get current theme
   */
  public getTheme(): Theme {
    return this.currentTheme;
  }

  /**
   * Get system theme based on VS Code color theme
   */
  public getSystemTheme(): Theme {
    const kind = vscode.window.activeColorTheme.kind;
    return kind === vscode.ColorThemeKind.Dark ? darkTheme : lightTheme;
  }

  /**
   * Set theme manually
   */
  public setTheme(theme: 'light' | 'dark' | 'system'): void {
    switch (theme) {
      case 'light':
        this.currentTheme = lightTheme;
        break;
      case 'dark':
        this.currentTheme = darkTheme;
        break;
      case 'system':
        this.currentTheme = this.getSystemTheme();
        break;
    }
    this.themeChangedEmitter.fire(this.currentTheme);
  }

  /**
   * Setup listener for VS Code theme changes
   */
  private setupThemeListener(): void {
    this.colorSubscription = vscode.window.onDidChangeActiveColorTheme((theme) => {
      this.currentTheme = theme.kind === vscode.ColorThemeKind.Dark ? darkTheme : lightTheme;
      this.themeChangedEmitter.fire(this.currentTheme);
    });
  }

  /**
   * Apply theme colors to a webview
   */
  public getWebviewStyles(theme?: Theme): string {
    const t = theme || this.currentTheme;
    return `
      :root {
        /* Primary colors */
        --oc-primary: ${t.colors.primary};
        --oc-primary-hover: ${t.colors.primaryHover};
        --oc-primary-active: ${t.colors.primaryActive};
        
        /* Secondary colors */
        --oc-secondary: ${t.colors.secondary};
        --oc-secondary-hover: ${t.colors.secondaryHover};
        
        /* Background colors */
        --oc-background: ${t.colors.background};
        --oc-background-alt: ${t.colors.backgroundAlt};
        --oc-background-hover: ${t.colors.backgroundHover};
        --oc-background-active: ${t.colors.backgroundActive};
        
        /* Text colors */
        --oc-text: ${t.colors.text};
        --oc-text-secondary: ${t.colors.textSecondary};
        --oc-text-muted: ${t.colors.textMuted};
        --oc-text-inverse: ${t.colors.textInverse};
        
        /* Border colors */
        --oc-border: ${t.colors.border};
        --oc-border-hover: ${t.colors.borderHover};
        --oc-border-active: ${t.colors.borderActive};
        
        /* Status colors */
        --oc-success: ${t.colors.success};
        --oc-warning: ${t.colors.warning};
        --oc-error: ${t.colors.error};
        --oc-info: ${t.colors.info};
        
        /* Semantic colors */
        --oc-focus-ring: ${t.colors.focusRing};
        --oc-shadow: ${t.colors.shadow};
        --oc-overlay: ${t.colors.overlay};
        
        /* Typography */
        --oc-font-family: ${t.typography.fontFamily};
        --oc-font-size-xs: ${t.typography.fontSizeXs};
        --oc-font-size-sm: ${t.typography.fontSizeSm};
        --oc-font-size-md: ${t.typography.fontSizeMd};
        --oc-font-size-lg: ${t.typography.fontSizeLg};
        --oc-font-size-xl: ${t.typography.fontSizeXl};
        
        /* Spacing */
        --oc-spacing-xs: ${t.spacing.xs};
        --oc-spacing-sm: ${t.spacing.sm};
        --oc-spacing-md: ${t.spacing.md};
        --oc-spacing-lg: ${t.spacing.lg};
        --oc-spacing-xl: ${t.spacing.xl};
        --oc-spacing-xxl: ${t.spacing.xxl};
        
        /* Border radius */
        --oc-radius-none: ${t.borderRadius.none};
        --oc-radius-sm: ${t.borderRadius.sm};
        --oc-radius-md: ${t.borderRadius.md};
        --oc-radius-lg: ${t.borderRadius.lg};
        --oc-radius-full: ${t.borderRadius.full};
        
        /* Shadows */
        --oc-shadow-sm: ${t.shadows.sm};
        --oc-shadow-md: ${t.shadows.md};
        --oc-shadow-lg: ${t.shadows.lg};
        --oc-shadow-xl: ${t.shadows.xl};
      }
    `;
  }

  /**
   * Get base CSS styles for QOOCODE components
   */
  public getBaseStyles(): string {
    return `
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      
      body {
        font-family: var(--oc-font-family);
        font-size: var(--oc-font-size-md);
        line-height: var(--oc-line-height-normal);
        color: var(--oc-text);
        background-color: var(--oc-background);
      }
      
      button {
        font-family: inherit;
        cursor: pointer;
        border: none;
        outline: none;
        transition: all var(--oc-duration-normal) var(--oc-easing-default);
      }
      
      button:focus-visible {
        box-shadow: 0 0 0 2px var(--oc-focus-ring);
      }
      
      input, textarea {
        font-family: inherit;
        font-size: inherit;
        border: 1px solid var(--oc-border);
        border-radius: var(--oc-radius-md);
        padding: var(--oc-spacing-sm) var(--oc-spacing-md);
        background: var(--oc-background);
        color: var(--oc-text);
      }
      
      input:focus, textarea:focus {
        border-color: var(--oc-primary);
        outline: none;
      }
    `;
  }

  /**
   * Create button class styles
   */
  public getButtonStyles(variant: 'primary' | 'secondary' | 'ghost' | 'danger' = 'primary'): string {
    const base = `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--oc-spacing-sm);
      padding: var(--oc-spacing-sm) var(--oc-spacing-lg);
      font-size: var(--oc-font-size-sm);
      font-weight: var(--oc-font-weight-medium);
      border-radius: var(--oc-radius-md);
      transition: all var(--oc-duration-fast) var(--oc-easing-default);
    `;

    switch (variant) {
      case 'primary':
        return `${base}
          background-color: var(--oc-primary);
          color: var(--oc-text-inverse);
        `;
      case 'secondary':
        return `${base}
          background-color: var(--oc-secondary);
          color: var(--oc-text-inverse);
        `;
      case 'ghost':
        return `${base}
          background-color: transparent;
          color: var(--oc-text);
        `;
      case 'danger':
        return `${base}
          background-color: var(--oc-error);
          color: var(--oc-text-inverse);
        `;
    }
  }

  /**
   * Dispose the design system
   */
  public dispose(): void {
    this.colorSubscription?.dispose();
    this.themeChangedEmitter.dispose();
  }
}
