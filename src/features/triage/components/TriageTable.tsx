import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import type { TriageAction } from "../types/triage.types";
import { PRIORITY_STYLES, STATUS_STYLES } from "../utils/triageHelpers";

interface TriageTableProps {
  actions: TriageAction[];
  isLoading: boolean;
  onUpdateStatus: (action: TriageAction) => void;
}

function Badge({ label, styles }: { label: string; styles: Record<string, string> }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${styles[label] ?? "bg-slate-100 text-slate-700"}`}
    >
      {label}
    </span>
  );
}

export default function TriageTable({
  actions,
  isLoading,
  onUpdateStatus,
}: TriageTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          Loading action items...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action ID</TableHead>
              <TableHead>Barangay</TableHead>
              <TableHead>Device</TableHead>
              <TableHead>Trigger Source</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Assigned Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {actions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="py-8 text-center text-muted-foreground"
                >
                  No action items found.
                </TableCell>
              </TableRow>
            ) : (
              actions.map((action) => (
                <TableRow key={action.id}>
                  <TableCell className="font-mono text-xs">
                    {action.id.slice(0, 8)}
                  </TableCell>
                  <TableCell>{action.barangayName}</TableCell>
                  <TableCell>{action.deviceCode ?? "—"}</TableCell>
                  <TableCell>{action.triggerSource}</TableCell>
                  <TableCell>
                    <Badge label={action.priority} styles={PRIORITY_STYLES} />
                  </TableCell>
                  <TableCell>
                    {new Date(action.assignedDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge label={action.status} styles={STATUS_STYLES} />
                  </TableCell>
                  <TableCell>{action.assignedToName ?? "Unassigned"}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onUpdateStatus(action)}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Update
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}