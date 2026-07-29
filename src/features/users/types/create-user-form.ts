import type { BaseUserForm } from "./base-user-form";

export interface CreateUserForm extends BaseUserForm {
  password: string;
  confirmPassword: string;
}