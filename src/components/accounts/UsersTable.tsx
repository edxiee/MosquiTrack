import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DatabaseUser } from "@/types/user.types";
import RoleBadge from "./RoleBadge";
import StatusBadge from "./StatusBadge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, UserX, UserCheck } from "lucide-react";

interface UsersTableProps {
  users: DatabaseUser[];
  isLoading: boolean;
  onEdit: (user: DatabaseUser) => void;
  onDelete: (user: DatabaseUser) => void;
  onToggleStatus: (user: DatabaseUser) => void;
}

export default function UsersTable({
  users,
  isLoading,
  onEdit,
  onDelete,
  onToggleStatus,
}: UsersTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading users...
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
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Assigned Area</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-8 text-center text-muted-foreground"
                >
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => {
                const isInactive = user.status === "INACTIVE";
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium text-slate-900">
                      {user.first_name} {user.last_name}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <RoleBadge role={user.role} />
                    </TableCell>
                    <TableCell>
                      {[user.municipality, user.barangay]
                        .filter(Boolean)
                        .join(" - ") || "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={user.status} />
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(user)}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onToggleStatus(user)}
                      >
                        {isInactive ? (
                          <>
                            <UserCheck className="mr-2 h-4 w-4" />
                            Activate
                          </>
                        ) : (
                          <>
                            <UserX className="mr-2 h-4 w-4" />
                            Deactivate
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => onDelete(user)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
