import { useCallback, useEffect, useRef, useState } from "react";
import {
  App as AntdApp,
  Table,
  Tag,
  Space,
  Button,
  Modal,
  Form,
  Input,
  Popconfirm,
} from "antd";
import AxiosConfig from "../../../Context/AxiosConfig";
import SafeImage from "../../../components/SafeImage";
import { computeCustomerMetrics, type CustomerMetrics } from "../../../utils/adminPortalHelpers";

type Customer = {
  CustomerId: number;
  Cus_Name: string;
  Cus_Email: string;
  Cus_PhoneNumber: string;
  Cus_CompanyName: string;
  Cus_Logo: string;
  Cus_Password: string;
  Verify_State: boolean;
  Purchase_Goods?: string[];
};

interface PreviewCustomerProps {
  refreshTrigger?: number;
  onMetricsChange?: (metrics: CustomerMetrics) => void;
}

function PreviewCustomer({
  refreshTrigger = 0,
  onMetricsChange,
}: PreviewCustomerProps) {
  const { message } = AntdApp.useApp();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const pageRef = useRef({ page: 1, limit: 10 });
  const onMetricsChangeRef = useRef(onMetricsChange);
  useEffect(() => {
    onMetricsChangeRef.current = onMetricsChange;
  }, [onMetricsChange]);

  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [form] = Form.useForm();

  const fetchCustomers = useCallback(async (page = 1, limit = 10) => {
    try {
      setLoading(true);
      const response = await AxiosConfig.get("/customer/getAllCustomers", {
        params: { page, limit },
      });

      const list: Customer[] = response.data.data || [];
      const reportedTotal = response.data.total ?? list.length;
      const nextPage = response.data.page || page;
      const nextLimit = response.data.limit || limit;

      pageRef.current = { page: nextPage, limit: nextLimit };
      setCustomers(list);
      setTotal(reportedTotal);
      setCurrentPage(nextPage);
      setPageSize(nextLimit);
      onMetricsChangeRef.current?.(computeCustomerMetrics(list, reportedTotal));
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers(pageRef.current.page, pageRef.current.limit);
  }, [fetchCustomers, refreshTrigger]);

  const handleDelete = async (customerId: number) => {
    try {
      await AxiosConfig.delete("/customer/deleteCustomer", {
        params: { customerId },
      });
      message.success("Customer removed.");
      fetchCustomers(currentPage, pageSize);
    } catch {
      message.error("Failed to remove customer.");
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    form.setFieldsValue({
      ...customer,
      Purchase_Goods: customer.Purchase_Goods?.join(", ") || "",
    });
    setIsModalVisible(true);
  };

  const handleUpdate = async () => {
    try {
      const values = await form.validateFields();
      const updatedCustomer: Customer = {
        CustomerId: editingCustomer?.CustomerId ?? 0,
        Cus_Name: values.Cus_Name,
        Cus_Email: values.Cus_Email,
        Cus_PhoneNumber: values.Cus_PhoneNumber,
        Cus_CompanyName: values.Cus_CompanyName,
        Cus_Logo: values.Cus_Logo,
        Cus_Password: editingCustomer?.Cus_Password ?? "",
        Verify_State: editingCustomer?.Verify_State ?? false,
        Purchase_Goods: values.Purchase_Goods
          ? values.Purchase_Goods.split(",").map((item: string) => item.trim()).filter(Boolean)
          : [],
      };

      await AxiosConfig.put("/customer/updateCustomer", updatedCustomer);
      message.success("Customer updated.");
      setIsModalVisible(false);
      setEditingCustomer(null);
      form.resetFields();
      fetchCustomers(currentPage, pageSize);
    } catch {
      message.error("Could not update customer.");
    }
  };

  const columns = [
    {
      title: "Client",
      dataIndex: "Cus_Name",
      key: "Cus_Name",
      render: (name: string, record: Customer) => (
        <div className="flex items-center gap-3">
          {record.Cus_Logo ? (
            <SafeImage
              src={record.Cus_Logo}
              alt={record.Cus_CompanyName}
              width={36}
              height={36}
              style={{ objectFit: "cover", borderRadius: 8 }}
              preview={false}
            />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 shrink-0" />
          )}
          <div>
            <div className="text-xs font-semibold text-slate-900">{name}</div>
            <div className="text-[11px] text-slate-500">{record.Cus_Email}</div>
          </div>
        </div>
      ),
    },
    {
      title: "Company",
      dataIndex: "Cus_CompanyName",
      key: "Cus_CompanyName",
      render: (company: string, record: Customer) => (
        <div>
          <div className="text-xs font-medium text-slate-800">{company}</div>
          <div className="text-[11px] text-slate-500 tabular-nums">
            {record.Cus_PhoneNumber}
          </div>
        </div>
      ),
    },
    {
      title: "Purchased Suites",
      dataIndex: "Purchase_Goods",
      key: "Purchase_Goods",
      render: (goods: string[]) =>
        goods?.length ? (
          <span className="text-xs text-slate-600">{goods.join(", ")}</span>
        ) : (
          <Tag color="default">None</Tag>
        ),
    },
    {
      title: "Status",
      dataIndex: "Verify_State",
      key: "Verify_State",
      render: (verified: boolean) =>
        verified ? (
          <Tag color="green">Verified</Tag>
        ) : (
          <Tag color="red">Pending</Tag>
        ),
    },
    {
      title: "Actions",
      key: "actions",
      align: "right" as const,
      render: (_: unknown, record: Customer) => (
        <Space size="small">
          <Button size="small" type="primary" onClick={() => handleEdit(record)}>
            Edit
          </Button>
          <Popconfirm
            title="Remove this customer?"
            onConfirm={() => handleDelete(record.CustomerId)}
            okText="Remove"
            cancelText="Cancel"
          >
            <Button size="small" danger>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Table
        rowKey="CustomerId"
        columns={columns}
        dataSource={customers}
        loading={loading}
        size="middle"
        scroll={{ x: 640 }}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: total,
          showSizeChanger: true,
          pageSizeOptions: ["5", "10", "20", "50"],
          onChange: (page, limit) => {
            fetchCustomers(page, limit);
          },
        }}
      />

      <Modal
        title={<span className="font-bold text-slate-900">Edit Customer</span>}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingCustomer(null);
          form.resetFields();
        }}
        onOk={handleUpdate}
        okText="Save Changes"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="Cus_Name"
            label="Name"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="Cus_Email"
            label="Email"
            rules={[{ required: true, type: "email" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item name="Cus_PhoneNumber" label="Phone">
            <Input />
          </Form.Item>

          <Form.Item name="Cus_CompanyName" label="Company">
            <Input />
          </Form.Item>

          <Form.Item name="Cus_Logo" label="Logo URL">
            <Input />
          </Form.Item>

          <Form.Item name="Purchase_Goods" label="Purchase Goods">
            <Input placeholder="Comma separated values" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

export default PreviewCustomer;
