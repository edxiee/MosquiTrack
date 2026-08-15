import { useEffect, useMemo, useState } from "react";
import UserPageHeader from "@/components/accounts/UserPageHeader";
import UserStatistics from "@/components/accounts/UserStatistics";
import UserToolbar from "@/components/accounts/UserToolbar";
import UsersTable from "@/components/accounts/UsersTable";
import CreateUserDialog from "@/components/accounts/CreateUserDialog";
import EditUserDialog from "@/components/accounts/EditUserDialog";
import type { DatabaseUser } from "@/types/user.types";
import { getUsers } from "@/services/get-users.service";
import { deleteUser, setUserStatus } from "@/services/users.service";

export default function UserAccessControlPage() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");

  const [allUsers, setAllUsers] = useState<DatabaseUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<DatabaseUser | null>(null);

  async function loadUsers() {
    setIsLoading(true);
    try {
      const data = await getUsers();
      setAllUsers(data);
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allUsers.filter((u) => {
      const matchesSearch =
        q === "" ||
        `${u.first_name} ${u.last_name}`.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q);
      const matchesRole = role === "all" || u.role === role;
      const matchesStatus =
        status === "all" || u.status === status.toUpperCase();
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [allUsers, search, role, status]);

  const stats = useMemo(
    () => ({
      total: allUsers.length,
      active: allUsers.filter((u) => u.status === "ACTIVE").length,
      inactive: allUsers.filter((u) => u.status === "INACTIVE").length,
      pending: allUsers.filter((u) => u.status === "PENDING").length,
    }),
    [allUsers],
  );

  function handleCreateUser() {
    setIsCreateDialogOpen(true);
  }

  function handleEditUser(user: DatabaseUser) {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  }

  function handleCreateDialogChange(open: boolean) {
    setIsCreateDialogOpen(open);
    if (!open) loadUsers();
  }

  function handleEditDialogChange(open: boolean) {
    setIsEditDialogOpen(open);
    if (!open) loadUsers();
  }

  async function handleDeleteUser(user: DatabaseUser) {
    const confirmed = window.confirm(
      `Delete ${user.first_name} ${user.last_name}? This cannot be undone.`,
    );
    if (!confirmed) return;

    try {
      await deleteUser(user.id);
      await loadUsers();
    } catch (err) {
      console.error("Failed to delete user:", err);
      window.alert("Failed to delete user. Please try again.");
    }
  }

  async function handleToggleStatus(user: DatabaseUser) {
    const action = user.status === "INACTIVE" ? "activate" : "deactivate";
    const confirmed = window.confirm(
      action === "deactivate"
        ? `Deactivate ${user.first_name} ${user.last_name}? They won't be able to log in.`
        : `Reactivate ${user.first_name} ${user.last_name}?`,
    );
    if (!confirmed) return;

    try {
      await setUserStatus(user.id, action);
      await loadUsers();
    } catch (err) {
      console.error("Failed to update user status:", err);
      window.alert("Failed to update user status. Please try again.");
    }
  }

  return (
    <div className="space-y-6 p-8">
      <UserPageHeader />
      <UserStatistics stats={stats} />
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
        users={filteredUsers}
        isLoading={isLoading}
        onEdit={handleEditUser}
        onDelete={handleDeleteUser}
        onToggleStatus={handleToggleStatus}
      />
      <CreateUserDialog
        open={isCreateDialogOpen}
        onOpenChange={handleCreateDialogChange}
      />

      <EditUserDialog
        open={isEditDialogOpen}
        onOpenChange={handleEditDialogChange}
        user={selectedUser}
      />
    </div>
  );
}
