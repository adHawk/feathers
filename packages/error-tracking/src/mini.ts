import { ErrorTrackingConfig } from "./index";
import { BrowserClient } from "@sentry/browser/esm/client";
import { initAndBind } from "@sentry/core/esm/sdk";
import { LinkedErrors } from "@sentry/browser/esm/integrations/linkederrors";
import { UserAgent } from "@sentry/browser/esm/integrations/useragent";
import { InboundFilters } from "@sentry/core/esm/integrations/inboundfilters";
import { FunctionToString } from "@sentry/core/esm/integrations/functiontostring";

const integrations = [
  new InboundFilters(),
  new FunctionToString(),
  // new TryCatch(),
  // new Breadcrumbs(),
  new LinkedErrors(),
  new UserAgent(),
];

export function init(conf: ErrorTrackingConfig): void {
  const { sentryDsn, ...opts } = conf;

  initAndBind(BrowserClient, { dsn: sentryDsn, integrations, ...opts });
}

export { captureException } from "@sentry/minimal";
