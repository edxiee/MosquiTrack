import { createContext } from "react";

import type { AuthContextValue } from "../types/auth.types";

export const AuthContext =
    createContext<AuthContextValue | null>(null);