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
      <DialogContent className={
        showSuccess 
          ? "max-h-[90vh] overflow-y-auto sm:max-w-xxl" 
          : "max-h-[90vh] overflow-y-auto sm:max-w-xl"
      }>
        {showSuccess ? (
          <div className="flex flex-col items-center text-center space-y-6 px-1 py-4">
            {/* Success Icon */}
            <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-8 ring-emerald-500/5">
              <svg
                className="w-8 h-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>

            {/* Header */}
            <div className="space-y-1.5">
              <DialogTitle className="text-xl font-semibold tracking-tight text-foreground">
                User Created Successfully
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Account setup complete with initial pending status.
              </DialogDescription>
            </div>

            {/* Summary Card */}
            <div className="w-full rounded-xl bg-muted/40 border border-border/60 p-4 text-left text-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Account Status</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  PENDING
                </span>
              </div>

             <div className="border-t border-border/40 pt-2.5 flex items-start gap-2.5 text-muted-foreground">
                <svg
                  className="w-4 h-4 text-muted-foreground/70 shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                />
              </svg>
              <span className="leading-relaxed">
                A confirmation email with temporary credentials has been sent to their inbox.
              </span>
            </div>
          </div>

            {/* Actions */}
            <Button
              className="w-full h-10 rounded-lg text-sm font-medium shadow-sm transition-all bg-emerald-500 text-white hover:bg-emerald-600 focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
              onClick={() => handleOpenChange(false)}
            >
              Done
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
