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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Copy, Check } from "lucide-react";
import UserForm from "./UserForm";
import { validateCreateUserForm } from "@/utils/validateUserForm";
import type { CreateUserForm, UserFormErrors } from "@/types/user.types";
import { createUser } from "@/services/users.service";

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BLANK_FORM: CreateUserForm = {
  firstName: "",
  middleName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  username: "",
  role: "",
  municipality: "",
  barangay: "",
};

export default function CreateUserDialog({
  open,
  onOpenChange,
}: CreateUserDialogProps) {
  const [formData, setFormData] = useState<CreateUserForm>(BLANK_FORM);
  const [errors, setErrors] = useState<UserFormErrors>({});
  const [isCreating, setIsCreating] = useState(false);

  // Set once creation succeeds — while non-null, the dialog shows the
  // one-time temp password screen instead of the form.
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(
    null,
  );
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  function updateForm<K extends keyof CreateUserForm>(
    field: K,
    value: CreateUserForm[K]
  ) {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function resetAndClose() {
    setFormData(BLANK_FORM);
    setErrors({});
    setTemporaryPassword(null);
    setShowPassword(false);
    setCopied(false);
    onOpenChange(false);
  }

  async function handleCreateUser() {
    const validationErrors = validateCreateUserForm(formData);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsCreating(true);

    try {
      const result = await createUser(formData);
      setTemporaryPassword(result.temporaryPassword);
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

  async function handleCopyPassword() {
    if (!temporaryPassword) return;
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy password:", err);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          resetAndClose();
        } else {
          onOpenChange(nextOpen);
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        {temporaryPassword ? (
          <>
            <DialogHeader>
              <DialogTitle>User Created Successfully</DialogTitle>
              <DialogDescription>
                Share this temporary password with the user securely. It
                will not be shown again — copy it now.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="temp-password">Temporary Password</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="temp-password"
                  readOnly
                  type={showPassword ? "text" : "password"}
                  value={temporaryPassword}
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowPassword((prev) => !prev)}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopyPassword}
                  title="Copy password"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={resetAndClose}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Enter the user's information below. A secure temporary
                password will be generated automatically.
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
                onClick={resetAndClose}
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