import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Tabs,
  Button,
  Tag,
  Avatar,
  Form,
  Input,
  message,
  Upload,
  Spin,
} from "antd";
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  BankOutlined,
  CheckCircleFilled,
  LogoutOutlined,
  UploadOutlined,
  ShoppingOutlined,
  SafetyCertificateOutlined,
  DashboardOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import axios from "axios";
import { useAuth } from "../Context/AuthContext";

interface OrderItem {
  OrderID: string;
  Order_Date: string;
  Order_Status: "COMPLETED" | "PENDING" | "VIEWORDER" | "SEND";
  Client_Name: string;
  Client_Email: string;
  Designs?: {
    Design?: {
      Design_Name?: string;
      Design_Image?: string | string[];
    };
  }[];
}

interface ProfileFormValues {
  name: string;
  company: string;
  email: string;
  phone: string;
  logo?: string;
}

export default function UserProfile() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoggedIn, logout, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<string>(searchParams.get("tab") || "orders");
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(true);
  const [savingProfile, setSavingProfile] = useState<boolean>(false);
  const [avatarUploading, setAvatarUploading] = useState<boolean>(false);

  useEffect(() => {
    if (!isLoggedIn && !sessionStorage.getItem("accessToken")) {
      navigate("/profile-login");
    }
  }, [isLoggedIn, navigate]);

  const fetchCustomerOrders = useCallback(async () => {
    if (!user) return;
    setLoadingOrders(true);
    try {
      if (user.role === "admin") {
        const res = await axios.get("/order/getAllOrders?limit=20");
        setOrders(res.data?.data || []);
      } else {
        const res = await axios.get(`/customer/profile?customerId=${user.id || ""}&email=${user.email || ""}`);
        setOrders(res.data?.orders || []);
      }
    } catch (err) {
      console.error("Failed to load orders", err);
    } finally {
      setLoadingOrders(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchCustomerOrders();
    }
  }, [user, fetchCustomerOrders]);

  const handleProfileUpdate = async (values: ProfileFormValues) => {
    setSavingProfile(true);
    try {
      if (user?.role === "customer") {
        await axios.put("/customer/updateProfile", {
          CustomerId: user.id,
          Cus_Name: values.name,
          Cus_PhoneNumber: values.phone,
          Cus_CompanyName: values.company,
          Cus_Logo: values.logo || user.logo,
        });
      }
      updateUser({
        name: values.name,
        phone: values.phone,
        company: values.company,
        logo: values.logo || user?.logo,
      });
      message.success("Saved");
    } catch (err) {
      console.error(err);
      message.error("Error saving");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    setAvatarUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post("/api/upload", formData);

      const uploadedUrl = res.data?.secure_url || res.data?.url;
      if (uploadedUrl) {
        updateUser({ logo: uploadedUrl });
        if (user?.role === "customer") {
          await axios.put("/customer/updateProfile", {
            CustomerId: user.id,
            Cus_Logo: uploadedUrl,
          });
        }
        message.success("Updated");
      }
    } catch (err) {
      console.error("Upload error", err);
      message.error("Upload failed");
    } finally {
      setAvatarUploading(false);
    }
    return false;
  };

  const handleSignOut = () => {
    logout();
    message.success("Signed out");
    navigate("/profile-login");
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Simple Profile Header */}
        <div className="bg-white rounded-3xl shadow-sm border border-neutral-200 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
              <div className="relative group">
                <Avatar
                  size={88}
                  src={user.logo}
                  icon={<UserOutlined />}
                  className="border-2 border-neutral-200 bg-neutral-100 object-cover"
                />
                <Upload
                  beforeUpload={handleAvatarUpload}
                  showUploadList={false}
                  accept="image/*"
                >
                  <button
                    type="button"
                    disabled={avatarUploading}
                    className="absolute inset-0 rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity cursor-pointer text-[10px] font-bold"
                  >
                    <UploadOutlined className="text-sm mb-0.5" />
                    {avatarUploading ? "..." : "Photo"}
                  </button>
                </Upload>
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">
                    {user.name}
                  </h1>
                  {user.verified && (
                    <Tag color="success" className="rounded-full px-2 py-0.5 text-xs font-semibold border-0">
                      <CheckCircleFilled className="mr-1" /> Verified
                    </Tag>
                  )}
                  <Tag
                    color={user.role === "admin" ? "volcano" : "blue"}
                    className="rounded-full px-2 py-0.5 text-xs font-semibold border-0"
                  >
                    {user.role === "admin" ? "Admin" : "Client"}
                  </Tag>
                </div>
                <p className="text-xs font-medium text-neutral-600 flex items-center justify-center sm:justify-start gap-1.5">
                  <BankOutlined className="text-neutral-400" />
                  {user.company || "Partner"}
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-neutral-400 pt-0.5">
                  <span className="flex items-center gap-1">
                    <MailOutlined /> {user.email}
                  </span>
                  {user.phone && (
                    <span className="flex items-center gap-1">
                      <PhoneOutlined /> {user.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {user.role === "admin" && (
                <Button
                  size="middle"
                  icon={<DashboardOutlined />}
                  onClick={() => navigate("/admin-home")}
                  className="rounded-xl font-semibold text-xs"
                >
                  Admin
                </Button>
              )}
              <Button
                size="middle"
                danger
                icon={<LogoutOutlined />}
                onClick={handleSignOut}
                className="rounded-xl font-semibold text-xs"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>

        {/* Simple Dashboard Tabs */}
        <div className="bg-white rounded-3xl shadow-sm border border-neutral-200 p-6 sm:p-8">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: "orders",
                label: (
                  <span className="font-semibold px-2">
                    <ShoppingOutlined className="mr-1" /> Orders ({orders.length})
                  </span>
                ),
                children: (
                  <div className="pt-4">
                    {loadingOrders ? (
                      <div className="py-12 text-center">
                        <Spin />
                      </div>
                    ) : orders.length === 0 ? (
                      <div className="py-12 text-center text-neutral-400 text-sm">
                        No orders found
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {orders.map((order, idx) => {
                          const statusColor =
                            order.Order_Status === "COMPLETED"
                              ? "success"
                              : order.Order_Status === "PENDING"
                              ? "processing"
                              : "warning";

                          return (
                            <div
                              key={order.OrderID || idx}
                              className="border border-neutral-200 rounded-2xl p-4 bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-neutral-900 text-sm">
                                    {order.OrderID}
                                  </span>
                                  <Tag color={statusColor} className="rounded-full px-2 py-0 text-xs border-0">
                                    {order.Order_Status}
                                  </Tag>
                                  <span className="text-xs text-neutral-400 flex items-center gap-1">
                                    <ClockCircleOutlined />
                                    {new Date(order.Order_Date).toLocaleDateString()}
                                  </span>
                                </div>
                                <div className="text-xs text-neutral-700 font-medium">
                                  {order.Designs?.[0]?.Design?.Design_Name || "Glazing System"}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Button
                                  size="small"
                                  onClick={() => navigate("/milestones")}
                                  className="rounded-lg text-xs"
                                >
                                  Milestones
                                </Button>
                                <Button
                                  type="primary"
                                  size="small"
                                  onClick={() => navigate("/products")}
                                  className="bg-[#22577a] rounded-lg text-xs"
                                >
                                  Specs
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: "settings",
                label: (
                  <span className="font-semibold px-2">
                    <UserOutlined className="mr-1" /> Settings
                  </span>
                ),
                children: (
                  <div className="max-w-md pt-4">
                    <Form
                      layout="vertical"
                      onFinish={handleProfileUpdate}
                      initialValues={{
                        name: user.name,
                        email: user.email,
                        phone: user.phone || "+94 77 455 1200",
                        company: user.company || "Zenith Capital Residencies",
                        logo: user.logo,
                      }}
                    >
                      <Form.Item
                        label={<span className="text-xs font-bold text-neutral-600">Name</span>}
                        name="name"
                        rules={[{ required: true, message: "Required" }]}
                      >
                        <Input size="large" className="rounded-xl" />
                      </Form.Item>

                      <Form.Item
                        label={<span className="text-xs font-bold text-neutral-600">Company</span>}
                        name="company"
                        rules={[{ required: true, message: "Required" }]}
                      >
                        <Input size="large" className="rounded-xl" />
                      </Form.Item>

                      <Form.Item
                        label={<span className="text-xs font-bold text-neutral-600">Phone</span>}
                        name="phone"
                      >
                        <Input size="large" className="rounded-xl" />
                      </Form.Item>

                      <Form.Item
                        label={<span className="text-xs font-bold text-neutral-600">Photo URL</span>}
                        name="logo"
                      >
                        <Input size="large" className="rounded-xl" />
                      </Form.Item>

                      <Button
                        type="primary"
                        htmlType="submit"
                        size="large"
                        loading={savingProfile}
                        className="w-full bg-[#22577a] hover:bg-[#1a4460] font-semibold rounded-xl text-sm h-11"
                      >
                        Save
                      </Button>
                    </Form>
                  </div>
                ),
              },
              {
                key: "security",
                label: (
                  <span className="font-semibold px-2">
                    <SafetyCertificateOutlined className="mr-1" /> Security
                  </span>
                ),
                children: (
                  <div className="pt-4 max-w-sm space-y-4">
                    <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 text-xs space-y-2">
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Role:</span>
                        <span className="font-bold text-neutral-800 uppercase">{user.role}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-500">Status:</span>
                        <span className="font-bold text-emerald-600">Active</span>
                      </div>
                    </div>
                    <Button
                      danger
                      onClick={handleSignOut}
                      className="w-full rounded-xl text-xs font-semibold"
                    >
                      Logout
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
