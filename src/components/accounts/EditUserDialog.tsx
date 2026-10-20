import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import UserForm from "./UserForm";
import NoticeDialog from "./NoticeDialog";
import { validateUpdateUserForm } from "@/utils/validateUserForm";
import type {
  UpdateUserForm,
  UserFormErrors,
  DatabaseUser,
} from "@/types/user.types";
import { updateUser } from "@/services/update-user.service";

import { useAuth } from "@/contexts/AuthContext";

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: DatabaseUser | null;
}

export default function EditUserDialog({
  open,
  onOpenChange,
  user,
}: EditUserDialogProps) {
  const { profile, refreshProfile } = useAuth();
  const currentUserRole = profile?.role.role_code;
  const isReadOnly =
    !!user &&
    user.id !== profile?.id &&
    ((currentUserRole === "ADMIN" &&
      (user.role === "ADMIN" || user.role === "SYS_ADMIN")) ||
      (currentUserRole === "SYS_ADMIN" && user.role === "SYS_ADMIN"));
  const isRoleLocked =
    user?.role === "SYS_ADMIN" ||
    (currentUserRole === "ADMIN" && user?.role === "ADMIN");
  const [formData, setFormData] = useState<UpdateUserForm>({
    id: "",
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    username: "",
    role: "",
    municipality: "",
    barangay: "",
  });

  const [errors, setErrors] = useState<UserFormErrors>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [notice, setNotice] = useState<{
    variant: "success" | "error";
    title: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!user) return;

    setFormData({
      id: user.id,
      firstName: user.first_name ?? "",
      middleName: user.middle_name ?? "",
      lastName: user.last_name ?? "",
      email: user.email ?? "",
      phoneNumber: user.phone_number ?? "",
      username: user.username ?? "",
      role: user.role ?? "",
      municipality: user.municipality ?? "",
      barangay: user.barangay ?? "",
    });

    setErrors({});
  }, [user]);

  function updateForm<K extends keyof UpdateUserForm>(
    field: K,
    value: UpdateUserForm[K]
  ) {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function handleUpdateUser() {
    if (isReadOnly) return;

    const isChangingToElevatedRole =
      (formData.role === "SYS_ADMIN" || formData.role === "ADMIN") &&
      formData.role !== user?.role;

    if (isChangingToElevatedRole && currentUserRole !== "SYS_ADMIN") {
      setNotice({
        variant: "error",
        title: "Role Change Not Allowed",
        message: "Only a System Administrator can assign these roles.",
      });
      return;
    }

    const validationErrors = validateUpdateUserForm(formData);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsUpdating(true);

    try {
      await updateUser(formData);
      if (profile && profile.id === formData.id) {
        await refreshProfile();
      }
      onOpenChange(false);
      setNotice({
        variant: "success",
        title: "Changes Saved",
        message: "The user's information was updated successfully.",
      });
    } catch (error) {
      console.error(error);
      setNotice({
        variant: "error",
        title: "Update Failed",
        message:
          error instanceof Error ? error.message : "Failed to update user.",
      });
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg rounded-2xl p-7 gap-6">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-semibold tracking-tight">
              Edit User
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Update the user's information below.
            </DialogDescription>
          </DialogHeader>

          {isReadOnly && (
            <p className="text-sm text-muted-foreground">
              You cannot edit another administrator's account.
            </p>
          )}
          <fieldset disabled={isReadOnly} className="min-w-0 border-0 p-0">
            <UserForm
              formData={formData}
              errors={errors}
              updateForm={updateForm}
              isEditing={true}
              currentUserRole={currentUserRole}
              roleDisabled={isRoleLocked || isReadOnly}
            />
          </fieldset>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isUpdating || isReadOnly}
            >
              Cancel
            </Button>

            <Button
              className="bg-emerald-500 text-white hover:bg-emerald-600"
              onClick={handleUpdateUser}
              disabled={isUpdating}
            >
              {isUpdating ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NoticeDialog
        open={notice !== null}
        variant={notice?.variant ?? "success"}
        title={notice?.title ?? ""}
        message={notice?.message ?? ""}
        onClose={() => setNotice(null)}
      />
    </>
  );
}
