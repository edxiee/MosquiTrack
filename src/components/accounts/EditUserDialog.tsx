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

          <UserForm
            formData={formData}
            errors={errors}
            updateForm={updateForm}
            isEditing={true}
          />

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isUpdating}
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
