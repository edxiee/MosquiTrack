import { useEffect } from "react";
import { useRouteError, isRouteErrorResponse } from "react-router-dom";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { isChunkLoadError, tryReloadForChunkError } from "@/utils/lazyWithRetry";

export default function RouteErrorBoundary() {
  const error = useRouteError();
  const isChunkError = isChunkLoadError(error);

  useEffect(() => {
    if (isChunkError) {
      tryReloadForChunkError();
    }
  }, [isChunkError]);

  let errorMessage = "An unexpected error occurred while loading this page.";
  if (isChunkError) {
    errorMessage =
      "A new version of MosquiTrack was recently deployed or your network connection was interrupted while loading this page.";
  } else if (isRouteErrorResponse(error)) {
    errorMessage = `${error.status} ${error.statusText}`;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-6 sm:p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <AlertTriangle className="h-6 w-6" />
        </div>

        <h1 className="text-xl font-bold text-slate-900 mb-2">
          {isChunkError ? "Page Update Available" : "Something went wrong"}
        </h1>

        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          {errorMessage}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            Reload Page
          </button>

          <a
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Home className="h-4 w-4" />
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

