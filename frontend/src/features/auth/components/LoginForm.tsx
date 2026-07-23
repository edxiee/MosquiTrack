import { Link} from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import EmailField from "@/components/forms/EmailField";
import PasswordField from "@/components/forms/PasswordField";
import RememberMe from "@/components/forms/RememberMe";
import SubmitButton from "@/components/forms/SubmitButton";

import { useAuth } from "../hooks/useAuth";

import {
  loginSchema,
  type LoginSchema,
} from "../schemas/login.schema";

export default function LoginForm() {

  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: LoginSchema) {
    try {
      await login(data);
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert("An unexpected error occurred.");
      }
    }
  }

  return (
      <form
        onSubmit={(event) => {
          console.log("🚀 Form submitted");
          handleSubmit(onSubmit)(event);
        }}
        className="space-y-6"
      >
      <EmailField
        register={register}
        error={errors.email}
      />

      <PasswordField
        register={register}
        error={errors.password}
      />

      <div className="flex items-center justify-between">
        <RememberMe />

        <Link
          to="/forgot-password"
          className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          Forgot password?
        </Link>
      </div>

      <SubmitButton
        text={isSubmitting ? "Signing In..." : "Sign In"}
        loading={isSubmitting}
      />
    </form>
  );
}