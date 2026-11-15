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
      sectionCode="Client Directory"
      sectionTitle="Customer Accounts"
      sectionSubtitle="Manage verified commercial clients, contacts, and purchased suites."
      refreshTrigger={refreshTick}
      bannerLeftLines={[
        { label: "Total Accounts", value: String(metrics.total) },
        { label: "Verified Clients", value: String(metrics.verified) },
        { label: "Pending Verification", value: String(metrics.unverified) },
      ]}
      headerAction={{
        label: activeTab === "directory" ? "Register Customer" : "View Directory",
        icon: activeTab === "directory" ? <FiPlus className="text-[13px]" /> : <FiUsers className="text-[13px]" />,
        onClick: () =>
          setActiveTab((prev) => (prev === "directory" ? "register" : "directory")),
      }}
      railTopAction={{
        label: activeTab === "directory" ? "+ Register Customer" : "Back to Client List",
        onClick: () =>
          setActiveTab((prev) => (prev === "directory" ? "register" : "directory")),
      }}
      kpiLabel="Verified Clients"
      kpiValue={metrics.verified}
      kpiNote={`of ${metrics.total} total`}
      kpiStatusText={
        metrics.unverified === 0
          ? "All accounts verified"
          : `${metrics.unverified} awaiting verification`
      }
      kpiStatusTone={metrics.unverified === 0 ? "green" : "navy"}
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
        label: activeTab === "directory" ? "+ Add Customer" : "View Client Directory",
        icon: <FiUsers className="text-[14px]" />,
        onClick: () =>
          setActiveTab((prev) => (prev === "directory" ? "register" : "directory")),
      }}
    >
      <div className="flex items-center justify-between flex-wrap gap-3 pb-4 mb-4 border-b border-slate-100">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            {activeTab === "directory" ? "Registered Customers" : "New Customer Account"}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeTab === "directory"
              ? "Active partners and client accounts synced with order fulfillment."
              : "Create a new client profile with purchased system tags."}
          </p>
        </div>

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
            + Register
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
