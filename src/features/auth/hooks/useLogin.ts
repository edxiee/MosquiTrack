import { useMutation } from "@tanstack/react-query";

import { login } from "../services/auth.service";
import type { LoginRequest } from "../types/login.type";

export function useLogin() {
  return useMutation({
    mutationFn: (data: LoginRequest) => login(data),
  });
}