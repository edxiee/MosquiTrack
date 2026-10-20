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
import { useAuth } from "@/contexts/AuthContext";

export default function UserAccessControlPage() {
  const { profile } = useAuth();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [municipality, setMunicipality] = useState("all");
  const [barangay, setBarangay] = useState("all");

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

  // Built from whatever values actually exist right now — there's no
  // fixed municipality/barangay lookup table, these are free-text
  // fields on the user record.
  const municipalityOptions = useMemo(() => {
    const values = new Set(
      allUsers
        .map((u) => u.municipality)
        .filter((v): v is string => Boolean(v)),
    );
    return Array.from(values).sort();
  }, [allUsers]);

  const barangayOptions = useMemo(() => {
    const values = new Set(
      allUsers.map((u) => u.barangay).filter((v): v is string => Boolean(v)),
    );
    return Array.from(values).sort();
  }, [allUsers]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allUsers.filter((u) => {
      const matchesSearch =
        q === "" ||
        `${u.first_name} ${u.last_name}`.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone_number ?? "").toLowerCase().includes(q);
      const matchesRole = role === "all" || u.role === role;
      const matchesStatus =
        status === "all" || u.status === status.toUpperCase();
      const matchesMunicipality =
        municipality === "all" || u.municipality === municipality;
      const matchesBarangay = barangay === "all" || u.barangay === barangay;
      return (
        matchesSearch &&
        matchesRole &&
        matchesStatus &&
        matchesMunicipality &&
        matchesBarangay
      );
    });
  }, [allUsers, search, role, status, municipality, barangay]);

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
    if (!canEditUser(user)) return;
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  }
  

  function canEditUser(user: DatabaseUser) {
    if (!profile || user.id === profile.id) return true;
    const currentRole = profile.role.role_code;
    return !(
      (currentRole === "ADMIN" &&
        (user.role === "ADMIN" || user.role === "SYS_ADMIN")) ||
      (currentRole === "SYS_ADMIN" && user.role === "SYS_ADMIN")
    );
  }

  function canToggleStatus(user: DatabaseUser) {
    if (!profile) return false;
    // Optional: allow toggling yourself, or block it — here we block self
    if (user.id === profile.id) return false;

    const currentRole = profile.role.role_code;

    if (currentRole === "SYS_ADMIN") {
      // SYS_ADMIN can deactivate/activate ADMIN, but not other SYS_ADMIN
      return user.role !== "SYS_ADMIN";
    }

    if (currentRole === "ADMIN") {
      // ADMIN cannot touch ADMIN or SYS_ADMIN
      return user.role !== "ADMIN" && user.role !== "SYS_ADMIN";
    }

    return false;
  }

  function canDeleteUser(user: DatabaseUser) {
    if (!profile) return false;
    if (user.id === profile.id) return false; // never delete yourself

    const currentRole = profile.role.role_code;

    if (currentRole === "SYS_ADMIN") {
      return user.role !== "SYS_ADMIN";
    }

    if (currentRole === "ADMIN") {
      return user.role !== "ADMIN" && user.role !== "SYS_ADMIN";
    }

    return false;
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

  async function handleResendConfirmation(user: DatabaseUser) {
    const confirmed = window.confirm(
      `Resend confirmation email to ${user.email}?`
    );
    if (!confirmed) return;

    try {
      const { resendConfirmationEmail } = await import("@/services/users.service");
      await resendConfirmationEmail(user.email);
      window.alert(`Confirmation email resent to ${user.email}.`);
    } catch (err) {
      console.error("Failed to resend email:", err);
      window.alert("Failed to resend confirmation email. Please try again.");
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
        municipality={municipality}
        onMunicipalityChange={setMunicipality}
        municipalityOptions={municipalityOptions}
        barangay={barangay}
        onBarangayChange={setBarangay}
        barangayOptions={barangayOptions}
        onCreateUser={handleCreateUser}
      />
      <UsersTable
        users={filteredUsers}
        isLoading={isLoading}
        onEdit={handleEditUser}
        onDelete={handleDeleteUser}
        onToggleStatus={handleToggleStatus}
        onResendConfirmation={handleResendConfirmation}
        canEditUser={canEditUser}
        canToggleStatus={canToggleStatus}
        canDeleteUser={canDeleteUser}
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