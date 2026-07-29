import type { BaseUserForm } from "./base-user-form";

export interface UpdateUserForm extends BaseUserForm {
  id: string;
}