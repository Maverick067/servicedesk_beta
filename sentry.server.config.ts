// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: process.env.NODE_ENV === 'development',

  // Filter out certain errors
  beforeSend(event, hint) {
    // Don't send database connection errors in development
    if (process.env.NODE_ENV === 'development') {
      const error = hint.originalException;
      if (error && typeof error === 'object' && 'message' in error) {
        const message = String(error.message);
        if (message.includes('database') || message.includes('prisma')) {
          return null;
        }
      }
    }

    return event;
  },

  // Add custom tags
  initialScope: {
    tags: {
      environment: process.env.NODE_ENV,
      release: process.env.APP_VERSION || 'unknown',
    },
  },
});

