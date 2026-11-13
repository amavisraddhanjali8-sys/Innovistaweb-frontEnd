/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from "react";

export interface UserProfile {
  id: number | string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  role: "customer" | "admin";
  logo?: string;
  verified?: boolean;
  purchaseGoods?: string[];
}

export interface CustomerPayload {
  CustomerId?: number | string;
  id?: number | string;
  Cus_Name?: string;
  name?: string;
  Cus_Email?: string;
  email?: string;
  Cus_PhoneNumber?: string;
  phone?: string;
  Cus_CompanyName?: string;
  company?: string;
  Cus_Logo?: string;
  logo?: string;
  Verify_State?: boolean;
  Purchase_Goods?: string[];
}

export interface AdminPayload {
  AdminId?: number | string;
  id?: number | string;
  Admin_Name?: string;
  name?: string;
  Admin_Email?: string;
  email?: string;
  Admin_Phone?: string;
  phone?: string;
  Admin_Profile?: string;
  logo?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isLoggedIn: boolean;
  loginCustomer: (customerData: CustomerPayload, token: string) => void;
  loginAdmin: (adminData: AdminPayload, token: string) => void;
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
      if (stored) {
        return JSON.parse(stored) as UserProfile;
      }
      const token = sessionStorage.getItem("accessToken");
      if (token) {
        return {
          id: 1,
          name: "Super Admin",
          email: "admin@innovista.com",
          role: "admin",
          company: "Innovista Fabriconix HQ",
          logo: "/assets/about/director.jpg",
          verified: true,
        };
      }
    } catch {
      // fallback
    }
    return null;
  });

  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const stored = sessionStorage.getItem("userProfile");
        if (stored) {
          setUser(JSON.parse(stored) as UserProfile);
        } else if (!sessionStorage.getItem("accessToken")) {
          setUser(null);
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const loginCustomer = (customerData: CustomerPayload, token: string) => {
    const profile: UserProfile = {
      id: customerData.CustomerId || customerData.id || Date.now(),
      name: customerData.Cus_Name || customerData.name || "Valued Client",
      email: customerData.Cus_Email || customerData.email || "client@example.com",
      phone: customerData.Cus_PhoneNumber || customerData.phone,
      company: customerData.Cus_CompanyName || customerData.company || "Innovista Partner",
      role: "customer",
      logo:
        customerData.Cus_Logo ||
        customerData.logo ||
        "/assets/logos/client-zenith.svg",
      verified: customerData.Verify_State !== undefined ? customerData.Verify_State : true,
      purchaseGoods: customerData.Purchase_Goods || [],
    };

    sessionStorage.setItem("userProfile", JSON.stringify(profile));
    sessionStorage.setItem("accessToken", token);
    setUser(profile);
  };

  const loginAdmin = (adminData: AdminPayload, token: string) => {
    const profile: UserProfile = {
      id: adminData.AdminId || adminData.id || 1,
      name: adminData.Admin_Name || adminData.name || "Super Admin",
      email: adminData.Admin_Email || adminData.email || "admin@innovista.com",
      phone: adminData.Admin_Phone || adminData.phone,
      company: "Innovista Fabriconix Executive",
      role: "admin",
      logo:
        adminData.Admin_Profile ||
        adminData.logo ||
        "/assets/about/director.jpg",
      verified: true,
    };

    sessionStorage.setItem("userProfile", JSON.stringify(profile));
    sessionStorage.setItem("accessToken", token);
    setUser(profile);
  };

  const updateUser = (updatedData: Partial<UserProfile>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updatedData };
      sessionStorage.setItem("userProfile", JSON.stringify(updated));
      return updated;
    });
  };

  const logout = () => {
    sessionStorage.removeItem("userProfile");
    sessionStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
  };

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
