import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "antd";
import {
  FiBriefcase,
  FiKey,
  FiLayers,
  FiPlus,
  FiShoppingBag,
  FiSliders,
  FiUsers,
} from "react-icons/fi";
import AxiosConfig from "../../Context/AxiosConfig";
import AdminPortalShell, { type AdminSummaryStats } from "../../components/AdminPortalShell";
import AdminRegisterForm from "../AdminRegisterForm";
import ManageAllAdmins from "./ManageAllAdmins";
import PasswordReset from "../../components/PasswordReset";

function AdminHome() {
  const navigate = useNavigate();
  const [activeMode, setActiveMode] = useState<"team" | "register">("team");
  const [adminRefresh, setAdminRefresh] = useState(0);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [stats, setStats] = useState<AdminSummaryStats>({
    admins: 2,
    designs: 4,
    customers: 2,
    verifiedCustomers: 2,
    orders: 2,
    pendingOrders: 1,
    completedOrders: 1,
    projects: 4,
    totalProjectBudget: 44000000,
    feedbacks: 2,
    unreadNotifications: 2,
  });

  const loadSummary = () => {
    AxiosConfig.get<AdminSummaryStats>("/admin/summary")
      .then((res) => {
        if (res.data) setStats(res.data);
      })
      .catch(() => {
        // Ignore transient failure
      });
  };

  useEffect(() => {
    loadSummary();
  }, [adminRefresh]);

  const metricRows = [
    {
      label: "Designs",
      value: stats.designs,
      path: "/ViewAllDesigns",
      icon: <FiLayers className="text-[#22577A]" />,
    },
    {
      label: "Customers",
      value: stats.customers,
      path: "/CustomerManager",
      icon: <FiUsers className="text-[#3393B8]" />,
    },
    {
      label: "Orders",
      value: stats.orders,
      path: "/OrdermanageAdmin",
      icon: <FiShoppingBag className="text-[#22577A]" />,
    },
    {
      label: "Projects",
      value: stats.projects,
      path: "/AddProjects",
      icon: <FiBriefcase className="text-[#3393B8]" />,
    },
  ];

  return (
    <AdminPortalShell
      sectionCode="Overview & Team"
      sectionTitle="Admin Command Center"
      sectionSubtitle="Monitor portal operations, manage operator access, and launch workflows."
      refreshTrigger={adminRefresh}
      bannerLeftLines={[
        { label: "Active Admins", value: String(stats.admins) },
        { label: "Pending Orders", value: String(stats.pendingOrders) },
        { label: "Unread Alerts", value: String(stats.unreadNotifications) },
      ]}
      headerAction={{
        label: activeMode === "team" ? "Register Admin" : "View Admin Team",
        icon: <FiPlus className="text-[13px]" />,
        onClick: () =>
          setActiveMode((prev) => (prev === "team" ? "register" : "team")),
      }}
      railTopAction={{
        label: "Add New Design",
        icon: <FiPlus className="text-[13px]" />,
        onClick: () => navigate("/DesignAdded"),
      }}
      kpiLabel="Pending Orders"
      kpiValue={stats.pendingOrders}
      kpiNote={`${stats.orders} total`}
      kpiStatusText={`${stats.completedOrders} ${stats.completedOrders === 1 ? "completed order" : "completed orders"}`}
      kpiStatusTone={stats.pendingOrders > 0 ? "navy" : "green"}
      railSecondaryLeft={{
        label: "View Orders",
        icon: <FiShoppingBag className="text-[13px]" />,
        onClick: () => navigate("/OrdermanageAdmin"),
      }}
      railSecondaryRight={{
        label: "About CMS",
        icon: <FiSliders className="text-[13px]" />,
        onClick: () => navigate("/EditVisionMission"),
      }}
      railPrimaryAction={{
        label: "Reset Password",
        icon: <FiKey className="text-[14px]" />,
        onClick: () => setResetModalOpen(true),
      }}
    >
      {/* Clean Hairline Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 border border-slate-200/80 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 mb-6 bg-slate-50/40">
        {metricRows.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => navigate(item.path)}
            className="p-3.5 text-left hover:bg-white transition-colors cursor-pointer first:rounded-tl-xl sm:first:rounded-l-xl last:rounded-br-xl sm:last:rounded-r-xl"
          >
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>{item.label}</span>
              {item.icon}
            </div>
            <div className="mt-1 text-xl font-bold text-slate-900 tabular-nums">
              {item.value}
            </div>
          </button>
        ))}
      </div>

      {/* Workspace Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-4 mb-4 border-b border-slate-100">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            {activeMode === "team" ? "Administrator Directory" : "Create New Admin"}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeMode === "team"
              ? "Authorized operators with control panel access."
              : "Invite a new operator to the Innovista admin portal."}
          </p>
        </div>

        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => setActiveMode("team")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeMode === "team"
                ? "bg-white text-[#22577A] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Admins ({stats.admins})
          </button>
          <button
            type="button"
            onClick={() => setActiveMode("register")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeMode === "register"
                ? "bg-white text-[#22577A] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            + Register
          </button>
        </div>
      </div>

      {activeMode === "team" ? (
        <ManageAllAdmins
          refreshTrigger={adminRefresh}
          onCountChange={(count) =>
            setStats((prev) => ({ ...prev, admins: count }))
          }
        />
      ) : (
        <AdminRegisterForm
          onSuccess={() => {
            setAdminRefresh((c) => c + 1);
            setActiveMode("team");
          }}
        />
      )}

      <Modal
        title={<span className="font-bold text-slate-900">Reset Admin Password</span>}
        open={resetModalOpen}
        onCancel={() => setResetModalOpen(false)}
        footer={null}
        centered
      >
        <PasswordReset onSuccess={() => setResetModalOpen(false)} />
      </Modal>
    </AdminPortalShell>
  );
}

export default AdminHome;
