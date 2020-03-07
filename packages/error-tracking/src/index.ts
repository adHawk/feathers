import {
  configureScope as sentryConfigureScope,
  captureException as sentryCaptureException,
  init as sentryInit,
} from "@sentry/browser";

interface User {
  id: string;
  username?: string;
  email?: string;
}

interface ErrorTrackingConfig {
  environment: string;
  release: string;
  sentryDsn?: string;
  debug?: boolean;
}

export function init(conf: ErrorTrackingConfig): void {
  const { sentryDsn, release, debug, environment } = conf;

  if (sentryDsn) {
    sentryInit({ dsn: sentryDsn, debug, environment, release });
  }
}

export function identify<T extends User>(user: T): void {
  sentryConfigureScope(scope => {
    scope.setUser(user);
  });
}

export function captureException(error: Error): string {
  if (
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    process?.env?.NODE_ENV !== "production"
  ) {
    console.error(error);
  }

  return sentryCaptureException(error);
}

export { showReportDialog } from "@sentry/browser";
