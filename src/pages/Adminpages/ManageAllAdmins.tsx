import React, { useCallback, useEffect, useRef, useState } from "react";
import { App as AntdApp, Table, Avatar, Popconfirm, Button } from "antd";
import type { TableProps } from "antd";
import AxiosConfig from "../../Context/AxiosConfig";
import { DeleteOutlined } from "@ant-design/icons";

interface AdminType {
  key: number;
  AdminId: number;
  Admin_Name: string;
  Admin_Email: string;
  Admin_Phone: string;
  Admin_Profile?: string;
}

interface ManageAllAdminsProps {
  refreshTrigger?: number;
  onCountChange?: (count: number) => void;
}

const ManageAllAdmins: React.FC<ManageAllAdminsProps> = ({
  refreshTrigger = 0,
  onCountChange,
}) => {
  const { message } = AntdApp.useApp();
  const [data, setData] = useState<AdminType[]>([]);
  const [loading, setLoading] = useState(true);

  const onCountChangeRef = useRef(onCountChange);
  useEffect(() => {
    onCountChangeRef.current = onCountChange;
  }, [onCountChange]);

  const fetchAdmins = useCallback(async () => {
    try {
      setLoading(true);
      const response = await AxiosConfig.get("/auth/getAllAdmins");

      const result = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];

      const formattedData = result.map((admin: AdminType, index: number) => ({
        ...admin,
        key: admin.AdminId || index,
      }));

      setData(formattedData);
      onCountChangeRef.current?.(formattedData.length);
    } catch {
      message.error("Error fetching admins");
    } finally {
      setLoading(false);
    }
  }, [message]);

  const handleDelete = async (adminId: number) => {
    try {
      await AxiosConfig.delete(`/auth/RemoveAdmin?adminId=${adminId}`);
      message.success("Admin removed.");
      fetchAdmins();
    } catch {
      message.error("Cannot remove the only remaining admin.");
    }
  };

  const columns: TableProps<AdminType>["columns"] = [
    {
      title: "Operator",
      dataIndex: "Admin_Name",
      key: "Admin_Name",
      render: (name: string, record) => (
        <div className="flex items-center gap-3">
          <Avatar
            src={record.Admin_Profile}
            size={34}
            style={{ backgroundColor: "#22577A", fontWeight: 600 }}
          >
            {name?.charAt(0)?.toUpperCase() || "A"}
          </Avatar>
          <div>
            <div className="text-xs font-semibold text-slate-900">{name}</div>
            <div className="text-[11px] text-slate-500">{record.Admin_Email}</div>
          </div>
        </div>
      ),
    },
    {
      title: "Phone",
      dataIndex: "Admin_Phone",
      key: "Admin_Phone",
      render: (phone: string) => (
        <span className="text-xs text-slate-600 tabular-nums">{phone || "—"}</span>
      ),
    },
    {
      title: "Action",
      key: "action",
      align: "right",
      render: (_, record) => (
        <Popconfirm
          title="Remove this admin?"
          okText="Remove"
          cancelText="Cancel"
          onConfirm={() => handleDelete(record.AdminId)}
        >
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            disabled={data.length <= 1}
          >
            Remove
          </Button>
        </Popconfirm>
      ),
    },
  ];

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins, refreshTrigger]);

  return (
    <Table<AdminType>
      columns={columns}
      dataSource={data}
      loading={loading}
      rowKey="AdminId"
      size="middle"
      scroll={{ x: 520 }}
      pagination={{ pageSize: 6, hideOnSinglePage: true }}
    />
  );
};

export default ManageAllAdmins;
