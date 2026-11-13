import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiLayers, FiSliders, FiUsers } from "react-icons/fi";
import AdminPortalShell from "../../components/AdminPortalShell";
import ViewAllorder from "./ViewAllorder";
import type { OrderMetrics } from "../../utils/adminPortalHelpers";

function OrdermanageAdmin() {
  const navigate = useNavigate();
  const [refreshTick, setRefreshTick] = useState(0);
  const [metrics, setMetrics] = useState<OrderMetrics>({
    total: 2,
    pending: 1,
    send: 0,
    viewOrder: 0,
    completed: 1,
  });

  return (
    <AdminPortalShell
      sectionCode="Order Fulfillment"
      sectionTitle="Order Management"
      sectionSubtitle="Track incoming specifications, status transitions, and client deliveries."
      refreshTrigger={refreshTick}
      bannerLeftLines={[
        { label: "Total Orders", value: String(metrics.total) },
        { label: "Pending Review", value: String(metrics.pending) },
        { label: "Completed", value: String(metrics.completed) },
      ]}
      headerAction={{
        label: "Manage Customers",
        icon: <FiUsers className="text-[13px]" />,
        onClick: () => navigate("/CustomerManager"),
      }}
      railTopAction={{
        label: "Browse Design Catalog",
        icon: <FiLayers className="text-[13px]" />,
        onClick: () => navigate("/ViewAllDesigns"),
      }}
      kpiLabel="Pending Orders"
      kpiValue={metrics.pending}
      kpiNote={`of ${metrics.total} total`}
      kpiStatusText={`${metrics.completed} ${metrics.completed === 1 ? "order" : "orders"} completed`}
      kpiStatusTone={metrics.pending > 0 ? "navy" : "green"}
      railSecondaryLeft={{
        label: "All Designs",
        icon: <FiLayers className="text-[13px]" />,
        onClick: () => navigate("/ViewAllDesigns"),
      }}
      railSecondaryRight={{
        label: "About CMS",
        icon: <FiSliders className="text-[13px]" />,
        onClick: () => navigate("/EditVisionMission"),
      }}
      railPrimaryAction={{
        label: "Customer Accounts",
        icon: <FiUsers className="text-[14px]" />,
        onClick: () => navigate("/CustomerManager"),
      }}
    >
      <ViewAllorder
        onMetricsChange={setMetrics}
        onStatusUpdated={() => setRefreshTick((t) => t + 1)}
      />
    </AdminPortalShell>
  );
}

export default OrdermanageAdmin;
