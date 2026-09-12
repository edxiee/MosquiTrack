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
import { validateCreateUserForm } from "@/utils/validateUserForm";
import type { CreateUserForm, UserFormErrors } from "@/types/user.types";
import { createUser } from "@/services/users.service";

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
    role: "",
    municipality: "",
    barangay: "",
  });

  const [errors, setErrors] = useState<UserFormErrors>({});
  const [isCreating, setIsCreating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false); // Track success state

  function updateForm<K extends keyof CreateUserForm>(
    field: K,
    value: CreateUserForm[K]
  ) {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  // Reset state when modal closes
  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      setTimeout(() => {
        setShowSuccess(false);
        setFormData({
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
        setErrors({});
      }, 300); // Wait for transition
    }
    onOpenChange(isOpen);
  }

  async function handleCreateUser() {
    const validationErrors = validateCreateUserForm(formData);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsCreating(true);

    try {
      await createUser(formData);
      setShowSuccess(true);
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        {showSuccess ? (
          <div className="flex flex-col items-center gap-6 px-2 py-6 text-center">
            {/* Icon */}
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-green-100 ring-8 ring-green-50 dark:bg-green-900/30 dark:ring-green-900/10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-12 w-12 text-green-600 dark:text-green-400"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>

            {/* Text */}
            <div className="space-y-3">
              <DialogTitle className="text-2xl font-bold tracking-tight">
                User Created Successfully!
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
                The account has been created with a{" "}
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  PENDING
                </span>{" "}
                status.
                <br className="mb-1" />
                A confirmation email with the user's temporary credentials has
                been sent to their Gmail.
              </DialogDescription>
            </div>

            {/* Divider */}
            <div className="w-full border-t border-border" />

            {/* Button */}
            <Button
              className="h-11 min-w-48 rounded-lg bg-green-600 px-8 text-base font-semibold text-white shadow-sm hover:bg-green-700 active:bg-green-800 dark:bg-green-600 dark:hover:bg-green-700"
              onClick={() => handleOpenChange(false)}
            >
              Okay
            </Button>
          </div>
        ) : (
          <>
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

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>

              <Button onClick={handleCreateUser} disabled={isCreating}>
                {isCreating ? "Creating..." : "Create User"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
