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
import { validateUpdateUserForm } from "@/utils/validateUserForm";
import type {
  UpdateUserForm,
  UserFormErrors,
  DatabaseUser,
} from "@/types/user.types";
import { updateUser } from "@/services/update-user.service";

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

  useEffect(() => {
    if (!user) return;

    setFormData({
      id: user.id,
      firstName: user.first_name,
      middleName: user.middle_name ?? "",
      lastName: user.last_name,
      email: user.email,
      phoneNumber: user.phone_number ?? "",
      username: user.username,
      role: user.role,
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
      alert("User updated successfully.");
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to update user."
      );
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update the user's information below.
          </DialogDescription>
        </DialogHeader>

        <UserForm
          formData={formData}
          errors={errors}
          updateForm={updateForm}
        />

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUpdating}
          >
            Cancel
          </Button>

          <Button onClick={handleUpdateUser} disabled={isUpdating}>
            {isUpdating ? "Updating..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
