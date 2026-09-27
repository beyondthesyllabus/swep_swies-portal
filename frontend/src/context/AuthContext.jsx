import React, { createContext, useContext, useState } from "react";
import client from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("swep_user");
    return stored ? JSON.parse(stored) : null;
  });

  async function login(username, password) {
    const { data } = await client.post("/auth/login/", { username, password });
    localStorage.setItem("swep_access_token", data.access);
    localStorage.setItem("swep_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  function logout() {
    localStorage.removeItem("swep_access_token");
    localStorage.removeItem("swep_user");
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
