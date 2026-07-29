import { useMutation } from "@tanstack/react-query";
import { register } from "../services/register.service";

export function useRegister() {
  return useMutation({
    mutationFn: register,
  });
}