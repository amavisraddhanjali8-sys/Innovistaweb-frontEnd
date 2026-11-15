import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiPlus, FiShoppingBag, FiSliders, FiUsers } from "react-icons/fi";
import AdminPortalShell from "../components/AdminPortalShell";
import CreateCustomer from "./Adminpages/CustomerManager/CreateCustomer";
import PreviewCustomer from "./Adminpages/CustomerManager/PreviewCustomer";
import type { CustomerMetrics } from "../utils/adminPortalHelpers";

function CustomerManager() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"directory" | "register">("directory");
  const [refreshTick, setRefreshTick] = useState(0);
  const [metrics, setMetrics] = useState<CustomerMetrics>({
    total: 0,
    verified: 0,
    unverified: 0,
  });

  return (
    <AdminPortalShell
      sectionTitle="Customers"
      refreshTrigger={refreshTick}
      stats={[
        { label: "Total", value: metrics.total },
        { label: "Verified", value: metrics.verified, tone: "green" },
        { label: "Pending", value: metrics.unverified, tone: metrics.unverified > 0 ? "navy" : "default" },
        { label: "Status", value: metrics.unverified === 0 ? "Verified" : "Active" },
      ]}
      actions={[
        {
          label: "Orders",
          icon: <FiShoppingBag className="text-[13px]" />,
          onClick: () => navigate("/OrdermanageAdmin"),
        },
        {
          label: "About",
          icon: <FiSliders className="text-[13px]" />,
          onClick: () => navigate("/EditVisionMission"),
        },
      ]}
      primaryAction={{
        label: activeTab === "directory" ? "Register" : "Directory",
        icon: activeTab === "directory" ? <FiPlus className="text-[13px]" /> : <FiUsers className="text-[13px]" />,
        onClick: () =>
          setActiveTab((prev) => (prev === "directory" ? "register" : "directory")),
      }}
    >
      <div className="flex items-center justify-between flex-wrap gap-3 pb-4 mb-4 border-b border-slate-100">
        <h2 className="text-sm font-bold text-slate-900 m-0">
          {activeTab === "directory" ? "Directory" : "Register"}
        </h2>

        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("directory")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === "directory"
                ? "bg-white text-[#22577A] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Directory ({metrics.total})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("register")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === "register"
                ? "bg-white text-[#22577A] shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Register
          </button>
        </div>
      </div>

      {activeTab === "directory" ? (
        <PreviewCustomer
          refreshTrigger={refreshTick}
          onMetricsChange={setMetrics}
        />
      ) : (
        <CreateCustomer
          onSuccess={() => {
            setRefreshTick((t) => t + 1);
            setActiveTab("directory");
          }}
        />
      )}
    </AdminPortalShell>
  );
}

export default CustomerManager;
