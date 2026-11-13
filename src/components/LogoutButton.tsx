import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { useEffect, useState } from "react";
import { FiLogOut } from "react-icons/fi";
import axios from "axios";
import { useAuth } from "../Context/AuthContext";

function LogoutButton() {
  const [userID, setUserID] = useState<string | null>(null);
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    const token = sessionStorage.getItem("accessToken");
    if (token) {
      try {
        const decodedToken = jwtDecode<{ sub?: string }>(token);
        setUserID(decodedToken?.sub || "1");
      } catch {
        setUserID("1");
      }
    }
  }, []);

  const handleLogout = async () => {
    try {
      await axios.post(`/auth/logout?adminId=${userID || 1}`);
    } catch (error) {
      console.error("Logout failed", error);
    } finally {
      logout();
      navigate("/profile-login", { replace: true });
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-[#E60000] hover:text-[#E60000] text-xs font-semibold text-slate-700 transition-colors cursor-pointer whitespace-nowrap"
    >
      <FiLogOut className="text-[13px]" />
      <span>Logout</span>
    </button>
  );
}

export default LogoutButton;
