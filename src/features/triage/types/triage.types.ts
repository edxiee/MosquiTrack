export type TriagePriority = "Low" | "Medium" | "High" | "Critical";
export type TriageStatus = "Pending" | "In Progress" | "Completed" | "Cancelled";

export interface TriageAction {
  id: string;
  barangayId: string;
  barangayName: string;
  deviceId: string | null;
  deviceCode: string | null;
  triggerSource: string;
  priority: TriagePriority;
  status: TriageStatus;
  assignedTo: string | null;
  assignedToName: string | null;
  assignedDate: string; // "YYYY-MM-DD"
  dueDate: string | null;
  completedAt: string | null;
  remarks: string | null;
  createdAt: string;
}

export interface TriageFilterValues {
  search: string; // matches barangay name or device code
  priority: string; // TriagePriority, or "all"
  status: string; // TriageStatus, or "all"
  barangay: string; // barangay_name, or "all"
  dateFrom: string; // "YYYY-MM-DD", or ""
  dateTo: string; // "YYYY-MM-DD", or ""
}

export interface TriageStats {
  totalAssigned: number;
  pending: number;
  inProgress: number;
  completed: number;
  highPriority: number; // High + Critical
}

export interface UpdateActionStatusInput {
  status: TriageStatus;
  remarks?: string;
}