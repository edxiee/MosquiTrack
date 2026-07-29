import { useState } from "react";
import UserPageHeader from "../components/UserPageHeader";
import UserStatistics from "../components/UserStatistics";
import UserToolbar from "../components/UserToolbar";
import UsersTable from "../components/UsersTable";
import CreateUserDialog from "../components/CreateUserDialog";
import EditUserDialog from "../components/EditUserDialog";
import type { DatabaseUser } from "../types/database-user";

export default function UserAccessControlPage() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [selectedUser, setSelectedUser] =
    useState<DatabaseUser | null>(null);

  function handleCreateUser() {
    setIsCreateDialogOpen(true);
  }

  function handleEditUser(user: DatabaseUser) {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  }

  return (
    <div className="space-y-6 p-8">
      <UserPageHeader />

      <UserStatistics />
      <UserToolbar
        search={search}
        onSearchChange={setSearch}
        role={role}
        onRoleChange={setRole}
        status={status}
        onStatusChange={setStatus}
        onCreateUser={handleCreateUser}
      />

      <UsersTable
        onEdit={handleEditUser}
      />

      <CreateUserDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
      
      <EditUserDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        user={selectedUser}
      />
    </div>
  );
}