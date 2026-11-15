/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { AccountClassification } from "../components/SecurityAuthWidgets";

export interface UserProfile {
  id: number | string;
  username?: string | null;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  role: "customer" | "admin";
  logo?: string;
  verified?: boolean;
  emailVerified?: boolean;
  accountStatus?: "ACTIVE" | "SUSPENDED";
  totpEnabled?: boolean;
  classification?: AccountClassification["statusCode"];
  purchaseGoods?: string[];
}

export interface CustomerPayload {
  CustomerId?: number | string;
  id?: number | string;
  Cus_Name?: string;
  name?: string;
  Cus_Username?: string | null;
  username?: string | null;
  Cus_Email?: string;
  email?: string;
  Cus_PhoneNumber?: string;
  phone?: string;
  Cus_CompanyName?: string;
  company?: string;
  Cus_Logo?: string;
  logo?: string;
  Verify_State?: boolean;
  Email_Verified?: boolean;
  Account_Status?: "ACTIVE" | "SUSPENDED";
  Purchase_Goods?: string[];
}

export interface AdminPayload {
  AdminId?: number | string;
  id?: number | string;
  Admin_Name?: string;
  name?: string;
  Admin_Username?: string | null;
  username?: string | null;
  Admin_Email?: string;
  email?: string;
  Admin_Phone?: string;
  phone?: string;
  Admin_Profile?: string;
  logo?: string;
  isVerified?: boolean;
  emailVerified?: boolean;
  accountStatus?: "ACTIVE" | "SUSPENDED";
  totpEnabled?: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  isLoggedIn: boolean;
  loginCustomer: (
    customerData: CustomerPayload,
    token: string,
    refreshToken?: string
  ) => void;
  loginAdmin: (
    adminData: AdminPayload,
    token: string,
    refreshToken?: string
  ) => void;
  updateUser: (updatedData: Partial<UserProfile>) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoggedIn: false,
  loginCustomer: () => {},
  loginAdmin: () => {},
  updateUser: () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const stored = sessionStorage.getItem("userProfile");
      const token = sessionStorage.getItem("accessToken");
      if (stored && token) {
        return JSON.parse(stored) as UserProfile;
      }
      if (!token && stored) {
        sessionStorage.removeItem("userProfile");
      }
    } catch {
      // ignore invalid stored session JSON
    }
    return null;
  });

  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const stored = sessionStorage.getItem("userProfile");
        const token = sessionStorage.getItem("accessToken");
        if (stored && token) {
          setUser(JSON.parse(stored) as UserProfile);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const loginCustomer = useCallback((
    customerData: CustomerPayload,
    token: string,
    refreshToken?: string
  ) => {
    const isVerified = Boolean(customerData.Verify_State);
    const emailVerified = Boolean(customerData.Email_Verified);
    const accountStatus = customerData.Account_Status || "ACTIVE";
    const profile: UserProfile = {
      id: customerData.CustomerId || customerData.id || Date.now(),
      username: customerData.Cus_Username ?? customerData.username ?? null,
      name: customerData.Cus_Name || customerData.name || "Client",
      email: customerData.Cus_Email || customerData.email || "",
      phone: customerData.Cus_PhoneNumber || customerData.phone || "",
      company: customerData.Cus_CompanyName || customerData.company || "",
      role: "customer",
      logo:
        customerData.Cus_Logo ||
        customerData.logo ||
        "/assets/logos/client-zenith.svg",
      verified: isVerified,
      emailVerified,
      accountStatus,
      totpEnabled: false,
      classification:
        accountStatus === "SUSPENDED"
          ? "SUSPENDED_CLIENT"
          : isVerified && emailVerified
          ? "VERIFIED_CLIENT"
          : "UNVERIFIED_CLIENT",
      purchaseGoods: customerData.Purchase_Goods || [],
    };

    sessionStorage.setItem("userProfile", JSON.stringify(profile));
    sessionStorage.setItem("accessToken", token);
    if (refreshToken) {
      sessionStorage.setItem("refreshToken", refreshToken);
    }
    setUser(profile);
  }, []);

  const loginAdmin = useCallback((
    adminData: AdminPayload,
    token: string,
    refreshToken?: string
  ) => {
    const isVerified = adminData.isVerified !== undefined ? adminData.isVerified : true;
    const emailVerified = adminData.emailVerified !== undefined ? adminData.emailVerified : true;
    const accountStatus = adminData.accountStatus || "ACTIVE";
    const profile: UserProfile = {
      id: adminData.AdminId || adminData.id || 1,
      username: adminData.Admin_Username ?? adminData.username ?? null,
      name: adminData.Admin_Name || adminData.name || "Administrator",
      email: adminData.Admin_Email || adminData.email || "",
      phone: adminData.Admin_Phone || adminData.phone || "",
      company: "Innovista Fabriconix Executive",
      role: "admin",
      logo:
        adminData.Admin_Profile ||
        adminData.logo ||
        "/assets/about/director.jpg",
      verified: isVerified,
      emailVerified,
      accountStatus,
      totpEnabled: Boolean(adminData.totpEnabled),
      classification:
        accountStatus === "SUSPENDED"
          ? "SUSPENDED_ADMIN"
          : isVerified && emailVerified
          ? "VERIFIED_ADMIN"
          : "UNVERIFIED_ADMIN",
    };

    sessionStorage.setItem("userProfile", JSON.stringify(profile));
    sessionStorage.setItem("accessToken", token);
    if (refreshToken) {
      sessionStorage.setItem("refreshToken", refreshToken);
    }
    setUser(profile);
  }, []);

  const updateUser = useCallback((updatedData: Partial<UserProfile>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updatedData };
      sessionStorage.setItem("userProfile", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem("userProfile");
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("refreshToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: Boolean(user),
        loginCustomer,
        loginAdmin,
        updateUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
