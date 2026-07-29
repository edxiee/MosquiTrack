export interface UserFormErrors {
  firstName?: string;
  middleName?: string;
  lastName?: string;

  email?: string;
  phoneNumber?: string;

  username?: string;

  role?: string;

  municipality?: string;
 barangay?: string;

  // Used only by Create User
  password?: string;
  confirmPassword?: string;
}