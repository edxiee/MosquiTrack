import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

export interface Announcement {
  id: string;
  title: string;
  message: string;
  level: "info" | "warning" | "critical";
  createdAt: string;
}

export interface SystemControlContextValue {
  isMaintenanceMode: boolean;
  setMaintenanceMode: (enabled: boolean) => void;
  announcements: Announcement[];
  addAnnouncement: (announcement: Omit<Announcement, "id" | "createdAt">) => void;
  removeAnnouncement: (id: string) => void;
  systemStatus: "operational" | "degraded" | "maintenance";
}

export const SystemControlContext =
  createContext<SystemControlContextValue | null>(null);

export function SystemControlProvider({ children }: { children: ReactNode }) {
  const [isMaintenanceMode, setMaintenanceMode] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([
    {
      id: "1",
      title: "Routine Sensor Calibration",
      message: "Scheduled hardware diagnostics on all barangay nodes this weekend.",
      level: "info",
      createdAt: new Date().toISOString(),
    },
  ]);

  function addAnnouncement(
    announcement: Omit<Announcement, "id" | "createdAt">
  ) {
    const newAnnouncement: Announcement = {
      ...announcement,
      id: Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
    };
    setAnnouncements((prev) => [newAnnouncement, ...prev]);
  }

  function removeAnnouncement(id: string) {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  }

  const systemStatus: "operational" | "degraded" | "maintenance" =
    isMaintenanceMode ? "maintenance" : "operational";

  return (
    <SystemControlContext.Provider
      value={{
        isMaintenanceMode,
        setMaintenanceMode,
        announcements,
        addAnnouncement,
        removeAnnouncement,
        systemStatus,
      }}
    >
      {children}
    </SystemControlContext.Provider>
  );
}

export function useSystemControl(): SystemControlContextValue {
  const context = useContext(SystemControlContext);
  if (!context) {
    throw new Error(
      "useSystemControl must be used within a SystemControlProvider."
    );
  }
  return context;
}
