import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import EmailField from "@/components/forms/EmailField";
import PasswordField from "@/components/forms/PasswordField";
import RememberMe from "@/components/forms/RememberMe";
import SubmitButton from "@/components/forms/SubmitButton";

import { supabase } from "@/lib/supabase";

import {
  loginSchema,
  type LoginSchema,
} from "../schemas/login.schema";

export default function LoginForm() {
  const navigate = useNavigate();

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
    console.clear();

    console.log("========== LOGIN TEST ==========");
    console.log("Email:", data.email);

    const { data: authData, error } =
      await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

    console.log("Supabase Response:");
    console.log({
      authData,
      error,
    });

    if (error) {
      console.error("❌ Login failed:");
      console.error(error);
      alert(error.message);
      return;
    }

    console.log("✅ Login successful!");
    console.log(authData);

    navigate("/dashboard");
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