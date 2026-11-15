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
      sectionTitle="Orders"
      refreshTrigger={refreshTick}
      stats={[
        { label: "Total", value: metrics.total },
        { label: "Pending", value: metrics.pending, tone: metrics.pending > 0 ? "navy" : "green" },
        { label: "Completed", value: metrics.completed, tone: "green" },
        { label: "Queue", value: metrics.pending > 0 ? "Active" : "Clear" },
      ]}
      actions={[
        {
          label: "Designs",
          icon: <FiLayers className="text-[13px]" />,
          onClick: () => navigate("/ViewAllDesigns"),
        },
        {
          label: "About",
          icon: <FiSliders className="text-[13px]" />,
          onClick: () => navigate("/EditVisionMission"),
        },
      ]}
      primaryAction={{
        label: "Customers",
        icon: <FiUsers className="text-[13px]" />,
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
