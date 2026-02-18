import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { definePreset } from '@primeuix/themes';

import { routes } from './app.routes';

const TNFD_Theme = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#EAF6FE',
      100: '#D6EDFD',
      200: '#ADD6F6',
      300: '#7CC1F4',
      400: '#3BAAF8',
      500: '#005ea2', // Navy
      600: '#004d87',
      700: '#003d6b',
      800: '#002d50',
      900: '#001d35',
      950: '#000d1a',
    },
    secondary: {
      50: '#F5F5F7',
      100: '#E5E5EA',
      200: '#F2F2F7',
      300: '#D1D1D6',
      400: '#C7C7CC',
      500: '#AEAEB2',
      600: '#8E8E93',
      700: '#636366',
      800: '#48484A',
      900: '#1D1D1F',
      950: '#000000',
    },
    success: { 500: '#34C759' },
    info: { 500: '#0071E3' },
    warning: { 500: '#FFD60A' },
    danger: { 500: '#FF3B30' },
    surface: {
      50: '#FFFFFF',
      100: '#F5F5F7',
      200: '#E5E5EA',
      300: '#F2F2F7',
      400: '#D1D1D6',
      500: '#AEAEB2',
      600: '#8E8E93',
      700: '#636366',
      800: '#48484A',
      900: '#1D1D1F',
      950: '#000000',
    },
  }
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideAnimationsAsync(),
    providePrimeNG({ 
      theme: { 
        preset: TNFD_Theme,
        options: {
          darkModeSelector: false,
          mode: 'light'
        }
      } 
    })
  ]
};
