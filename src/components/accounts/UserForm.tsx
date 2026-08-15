import PersonalInformationForm from "./PersonalInformationForm";
import ContactInformationForm from "./ContactInformationForm";
import UsernameForm from "./UsernameForm";
import RoleAssignmentForm from "./RoleAssignmentForm";
import LocationAssignmentForm from "./LocationAssignmentForm";
import type { BaseUserForm, UserFormErrors } from "@/types/user.types";

interface UserFormProps<T extends BaseUserForm> {
  formData: T;
  errors: UserFormErrors;
  updateForm: <K extends keyof T>(field: K, value: T[K]) => void;
}

export default function UserForm<T extends BaseUserForm>({
  formData,
  errors,
  updateForm,
}: UserFormProps<T>) {
  return (
    <div className="space-y-6">
      <PersonalInformationForm
        firstName={formData.firstName}
        middleName={formData.middleName}
        lastName={formData.lastName}
        errors={errors}
        onFirstNameChange={(value) => updateForm("firstName", value)}
        onMiddleNameChange={(value) => updateForm("middleName", value)}
        onLastNameChange={(value) => updateForm("lastName", value)}
      />

      <ContactInformationForm
        email={formData.email}
        phoneNumber={formData.phoneNumber}
        errors={errors}
        onEmailChange={(value) => updateForm("email", value)}
        onPhoneNumberChange={(value) => updateForm("phoneNumber", value)}
      />

      <UsernameForm
        username={formData.username}
        error={errors.username}
        onUsernameChange={(value) => updateForm("username", value)}
      />

      <RoleAssignmentForm
        role={formData.role}
        errors={errors}
        onRoleChange={(value) => updateForm("role", value)}
      />

      <LocationAssignmentForm
        role={formData.role}
        municipality={formData.municipality}
        barangay={formData.barangay}
        errors={errors}
        onMunicipalityChange={(value) => updateForm("municipality", value)}
        onBarangayChange={(value) => updateForm("barangay", value)}
      />
    </div>
  );
}
