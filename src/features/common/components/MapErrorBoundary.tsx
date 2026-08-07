import React, { Component } from "react";
import type { ReactNode } from "react";
import { WifiOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class MapErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Map rendering error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <Card className="w-full h-full border-dashed border-slate-300 bg-slate-50 flex items-center justify-center">
          <CardContent className="flex flex-col items-center justify-center p-6 text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-slate-200 flex items-center justify-center">
              <WifiOff className="h-6 w-6 text-slate-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-700">Map Offline</p>
              <p className="text-sm text-slate-500 mt-1 max-w-xs">
                Unable to load map tiles. Please check your internet connection or try again later.
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
