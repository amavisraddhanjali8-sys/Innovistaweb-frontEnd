import { useCallback, useEffect, useRef, useState } from "react";
import { Table, Tag, Select, Input, message } from "antd";
import { FiSearch } from "react-icons/fi";
import AxiosConfig from "../../Context/AxiosConfig";
import XlfileGenerate from "./XlfileGenerate";
import SafeImage from "../../components/SafeImage";
import { computeOrderMetrics, type OrderMetrics } from "../../utils/adminPortalHelpers";

export const OrderStatus = {
  PENDING: "PENDING",
  SEND: "SEND",
  VIEWORDER: "VIEWORDER",
  COMPLETED: "COMPLETED",
} as const;

type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export type Order = {
  OrderID: string;
  Order_Date: string;
  Order_Status: OrderStatus;
  Client_Name: string;
  Client_Email: string;
  Customer?: {
    Cus_CompanyName?: string;
    Cus_Logo?: string;
    Purchase_Goods?: string[];
  };
  Designs?: {
    Design?: {
      Design_Name?: string;
      Design_Image?: string | string[];
    };
  }[];
};

interface ViewAllorderProps {
  onMetricsChange?: (metrics: OrderMetrics) => void;
  onStatusUpdated?: () => void;
}

function ViewAllorder({ onMetricsChange, onStatusUpdated }: ViewAllorderProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const [loadingOrder, setLoadingOrder] = useState<string | null>(null);
  const onMetricsChangeRef = useRef(onMetricsChange);
  useEffect(() => {
    onMetricsChangeRef.current = onMetricsChange;
  }, [onMetricsChange]);

  const fetchOrders = useCallback(async (page = 1, limit = 10) => {
    try {
      setLoading(true);
      const response = await AxiosConfig.get("/order/getAllOrders", {
        params: { page, limit },
      });

      const list: Order[] = response.data.data || [];
      const reportedTotal = response.data.total ?? list.length;

      setOrders(list);
      setTotal(reportedTotal);
      setCurrentPage(response.data.page || page);
      setPageSize(response.data.limit || limit);
      onMetricsChangeRef.current?.(computeOrderMetrics(list, reportedTotal));
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders(1, 10);
  }, [fetchOrders]);

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      setLoadingOrder(orderId);
      await AxiosConfig.put(`/order/ChangeStates?orderId=${orderId}&Status=${status}`);
      message.success(`Order status updated to ${status}`);
      await fetchOrders(currentPage, pageSize);
      onStatusUpdated?.();
    } catch (error) {
      console.error("Error updating status:", error);
      message.error("Failed to update status.");
    } finally {
      setLoadingOrder(null);
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case "PENDING":
        return "orange";
      case "SEND":
        return "blue";
      case "VIEWORDER":
        return "cyan";
      case "COMPLETED":
        return "green";
      default:
        return "default";
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesStatus =
      statusFilter === "ALL" || order.Order_Status === statusFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      order.OrderID?.toLowerCase().includes(q) ||
      order.Client_Name?.toLowerCase().includes(q) ||
      order.Client_Email?.toLowerCase().includes(q) ||
      order.Customer?.Cus_CompanyName?.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const columns = [
    {
      title: "Order & Date",
      dataIndex: "OrderID",
      key: "OrderID",
      render: (id: string, record: Order) => (
        <div>
          <div className="text-xs font-bold text-[#22577A] tabular-nums">{id}</div>
          <div className="text-[11px] text-slate-400 tabular-nums">
            {new Date(record.Order_Date).toLocaleDateString()}
          </div>
        </div>
      ),
    },
    {
      title: "Client",
      dataIndex: "Client_Name",
      key: "Client_Name",
      render: (name: string, record: Order) => (
        <div>
          <div className="text-xs font-semibold text-slate-900">{name}</div>
          <div className="text-[11px] text-slate-500">{record.Client_Email}</div>
          {record.Customer?.Cus_CompanyName && (
            <div className="text-[11px] text-slate-400">
              {record.Customer.Cus_CompanyName}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Designs",
      dataIndex: "Designs",
      key: "Designs",
      render: (designs: Order["Designs"]) => (
        <div className="space-y-1">
          {designs?.map((item, i) => {
            const img = Array.isArray(item.Design?.Design_Image)
              ? item.Design?.Design_Image[0]
              : item.Design?.Design_Image;
            return (
              <div key={i} className="flex items-center gap-2">
                {img && (
                  <SafeImage
                    src={img}
                    alt={item.Design?.Design_Name || "Design"}
                    width={32}
                    height={32}
                    style={{ objectFit: "cover", borderRadius: 6 }}
                  />
                )}
                <span className="text-xs text-slate-700 font-medium">
                  {item.Design?.Design_Name || "Custom System"}
                </span>
              </div>
            );
          })}
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "Order_Status",
      key: "Order_Status",
      render: (status: OrderStatus) => (
        <Tag color={getStatusColor(status)} style={{ fontWeight: 600 }}>
          {status}
        </Tag>
      ),
    },
    {
      title: "Update Status",
      key: "action",
      align: "right" as const,
      render: (_: unknown, record: Order) => (
        <Select
          size="small"
          value={record.Order_Status}
          style={{ width: 138 }}
          loading={loadingOrder === record.OrderID}
          onChange={(value) =>
            updateOrderStatus(record.OrderID, value as OrderStatus)
          }
        >
          {Object.values(OrderStatus).map((status) => (
            <Select.Option key={status} value={status}>
              {status}
            </Select.Option>
          ))}
        </Select>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex flex-wrap items-center gap-1.5">
          {["ALL", ...Object.values(OrderStatus)].map((status) => {
            const active = statusFilter === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? "bg-[#22577A] text-white border-[#22577A]"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-white"
                }`}
              >
                {status === "ALL" ? "All Orders" : status}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <Input
            allowClear
            size="middle"
            prefix={<FiSearch className="text-slate-400" />}
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: 210 }}
          />
          <XlfileGenerate orders={filteredOrders} />
        </div>
      </div>

      <Table
        rowKey={(r) => r.OrderID}
        columns={columns}
        dataSource={filteredOrders}
        loading={loading}
        size="middle"
        scroll={{ x: 680 }}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: total,
          showSizeChanger: true,
          pageSizeOptions: ["5", "10", "20", "50"],
          onChange: (page, limit) => {
            fetchOrders(page, limit);
          },
        }}
      />
    </div>
  );
}

export default ViewAllorder;
