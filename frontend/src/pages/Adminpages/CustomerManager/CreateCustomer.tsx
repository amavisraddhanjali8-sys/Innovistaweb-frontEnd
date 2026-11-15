import { App as AntdApp, Form, Input, Button, Select, Switch } from "antd";
import AxiosConfig from "../../../Context/AxiosConfig";

interface CreateCustomerProps {
  onSuccess?: () => void;
}

function CreateCustomer({ onSuccess }: CreateCustomerProps) {
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm();

  interface CustomerFormValues {
    name: string;
    username?: string;
    email: string;
    phone: string;
    company: string;
    logo?: string;
    password: string;
    goods: string[];
    verifyImmediately?: boolean;
  }

  const onFinish = async (values: CustomerFormValues): Promise<void> => {
    try {
      const customerData = {
        Cus_Name: values.name,
        Cus_Username: values.username?.trim() || undefined,
        Cus_Email: values.email,
        Cus_PhoneNumber: values.phone,
        Cus_CompanyName: values.company,
        Cus_Logo: values.logo || "/assets/logos/client-zenith.svg",
        Cus_Password: values.password,
        Purchase_Goods: values.goods || [],
        Verify_State: Boolean(values.verifyImmediately),
      };

      const res = await AxiosConfig.post(
        "/customer/Customer_register",
        customerData
      );

      if (res.data?.customer || res.data?.data) {
        message.success("Customer registered successfully.");
        form.resetFields();
        onSuccess?.();
      } else {
        message.error(res.data?.message || "Failed to register customer");
      }
    } catch (err: unknown) {
      const serverMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      message.error(serverMsg || "An error occurred while registering the customer");
    }
  };

  return (
    <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ verifyImmediately: true }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
        <Form.Item
          label="Name"
          name="name"
          rules={[{ required: true, message: "Please enter customer name" }]}
        >
          <Input placeholder="Contact full name" />
        </Form.Item>

        <Form.Item
          label="Username"
          name="username"
          rules={[
            {
              pattern: /^[a-zA-Z0-9._-]{3,32}$/,
              message: "3-32 letters, numbers, ., _, or -",
            },
          ]}
        >
          <Input placeholder="e.g. client.username" />
        </Form.Item>

        <Form.Item
          label="Email"
          name="email"
          rules={[
            {
              type: "email",
              required: true,
              message: "Please enter valid email",
            },
          ]}
        >
          <Input placeholder="client@company.com" />
        </Form.Item>

        <Form.Item
          label="Phone"
          name="phone"
          rules={[{ required: true, message: "Please enter phone number" }]}
        >
          <Input placeholder="+94 77 123 4567" />
        </Form.Item>

        <Form.Item
          label="Company"
          name="company"
          rules={[{ required: true, message: "Please enter company name" }]}
        >
          <Input placeholder="Partner Company Ltd." />
        </Form.Item>

        <Form.Item
          label="Logo"
          name="logo"
        >
          <Input placeholder="/assets/logos/client-zenith.svg" />
        </Form.Item>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
        <Form.Item
          label="Password"
          name="password"
          rules={[
            { required: true, message: "Please enter password" },
            { min: 8, message: "Minimum 8 characters required" },
            {
              pattern: /(?=.*[A-Za-z])(?=.*\d)/,
              message: "Must contain letters and numbers",
            },
          ]}
        >
          <Input.Password placeholder="At least 8 chars (letters & numbers)" />
        </Form.Item>

        <Form.Item
          label="Verify"
          name="verifyImmediately"
          valuePropName="checked"
        >
          <Switch checkedChildren="Verified" unCheckedChildren="Pending" />
        </Form.Item>
      </div>

      <Form.Item
        label="Goods"
        name="goods"
      >
        <Select mode="tags" placeholder="Select or add purchased suites">
          <Select.Option value="Sliding Doors">Sliding Doors</Select.Option>
          <Select.Option value="Window Systems">Window Systems</Select.Option>
          <Select.Option value="Acoustic Partitions">
            Acoustic Partitions
          </Select.Option>
          <Select.Option value="Glass Balustrades">Glass Balustrades</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item className="mb-0 pt-2">
        <Button
          type="primary"
          htmlType="submit"
          style={{
            background: "#22577A",
            borderColor: "#22577A",
            borderRadius: 10,
            height: 40,
            fontWeight: 600,
          }}
        >
          Register
        </Button>
      </Form.Item>
    </Form>
  );
}

export default CreateCustomer;
