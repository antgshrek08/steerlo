import * as Sentry from "@sentry/nextjs";

type ErrorContext = {
  action: string;
  page?: string;
  route?: string;
  requestId?: string;
  userId?: string | null;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
};

function getClientPage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.location.pathname;
}

function shouldSkipError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

export function captureExceptionWithContext(error: unknown, context: ErrorContext) {
  if (shouldSkipError(error)) {
    return;
  }

  Sentry.withScope((scope) => {
    scope.setTag("capture_source", "manual");

    if (context.userId) {
      scope.setUser({ id: context.userId });
    }

    if (context.tags) {
      for (const [key, value] of Object.entries(context.tags)) {
        scope.setTag(key, value);
      }
    }

    scope.setContext("app_context", {
      action: context.action,
      page: context.page ?? getClientPage(),
      route: context.route,
      requestId: context.requestId,
      ...(context.extra ?? {})
    });

    Sentry.captureException(error);
  });
}
