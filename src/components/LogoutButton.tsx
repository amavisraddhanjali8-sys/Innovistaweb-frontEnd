import { useNavigate } from "react-router-dom";
import { FiLogOut } from "react-icons/fi";
import AxiosConfig from "../Context/AxiosConfig";
import { useAuth } from "../Context/AuthContext";

function LogoutButton() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await AxiosConfig.post("/auth/logout");
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
