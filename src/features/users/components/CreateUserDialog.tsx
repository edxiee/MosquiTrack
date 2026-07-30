import { useState } from "react";

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
import PasswordForm from "./PasswordForm";

import { validateCreateUserForm } from "../utils/validateCreateUserForm";

import type { CreateUserForm } from "../types/create-user-form";
import type { UserFormErrors } from "../types/user-form-errors";
import { createUser } from "../services/users.service.ts";

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateUserDialog({
  open,
  onOpenChange,
}: CreateUserDialogProps) {
  const [formData, setFormData] = useState<CreateUserForm>({
    firstName: "",
    middleName: "",
    lastName: "",

    email: "",
    phoneNumber: "",

    username: "",
    password: "",
    confirmPassword: "",

    role: "",

    municipality: "",
    barangay: "",
  });

  const [errors, setErrors] = useState<UserFormErrors>({});

  const [isCreating, setIsCreating] = useState(false);

  function updateForm<K extends keyof CreateUserForm>(
    field: K,
    value: CreateUserForm[K]
  ) {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function handleCreateUser() {
    console.log("Create User button clicked");

    const validationErrors = validateCreateUserForm(formData);

    console.log("Validation Errors:", validationErrors);
    console.log("Form Data:", formData);

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsCreating(true);

    try {
      await createUser(formData);

      alert("User created successfully.");

      onOpenChange(false);
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to create user."
      );
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>

          <DialogDescription>
            Enter the user's information below.
          </DialogDescription>
        </DialogHeader>

        <UserForm
          formData={formData}
          errors={errors}
          updateForm={updateForm}
        />

        <PasswordForm
          password={formData.password}
          confirmPassword={formData.confirmPassword}
          passwordError={errors.password}
          confirmPasswordError={errors.confirmPassword}
          onPasswordChange={(value) =>
            updateForm("password", value)
          }
          onConfirmPasswordChange={(value) =>
            updateForm("confirmPassword", value)
          }
        />

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>

          <Button
            onClick={handleCreateUser}
            disabled={isCreating}
          >
            {isCreating ? "Creating..." : "Create User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}