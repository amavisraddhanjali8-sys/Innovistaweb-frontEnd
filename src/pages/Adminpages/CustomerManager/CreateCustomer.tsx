import { App as AntdApp, Form, Input, Button, Select } from "antd";
import AxiosConfig from "../../../Context/AxiosConfig";

interface CreateCustomerProps {
  onSuccess?: () => void;
}

function CreateCustomer({ onSuccess }: CreateCustomerProps) {
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm();

  interface CustomerFormValues {
    name: string;
    email: string;
    phone: string;
    company: string;
    logo: string;
    password: string;
    goods: string[];
  }

  interface CustomerData {
    CustomerId: number;
    Cus_Name: string;
    Cus_Email: string;
    Cus_PhoneNumber: string;
    Cus_CompanyName: string;
    Cus_Logo: string;
    Cus_Password: string;
    Purchase_Goods: string[];
  }

  const onFinish = async (values: CustomerFormValues): Promise<void> => {
    try {
      const customerData: CustomerData = {
        CustomerId: 1,
        Cus_Name: values.name,
        Cus_Email: values.email,
        Cus_PhoneNumber: values.phone,
        Cus_CompanyName: values.company,
        Cus_Logo: values.logo,
        Cus_Password: values.password,
        Purchase_Goods: values.goods,
      };

      const res = await AxiosConfig.post(
        "/customer/Customer_register",
        customerData
      );

      if (
        res.data &&
        res.data.message ===
          "Customer registered successfully. Check your email for verification."
      ) {
        message.success("Customer registered successfully.");
        form.resetFields();
        onSuccess?.();
      } else {
        message.error("Failed to register customer");
      }
    } catch {
      message.error("An error occurred while registering the customer");
    }
  };

  return (
    <Form form={form} layout="vertical" onFinish={onFinish}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
        <Form.Item
          label="Contact Name"
          name="name"
          rules={[{ required: true, message: "Please enter customer name" }]}
        >
          <Input placeholder="John Doe" />
        </Form.Item>

        <Form.Item
          label="Email Address"
          name="email"
          rules={[
            {
              type: "email",
              required: true,
              message: "Please enter valid email",
            },
          ]}
        >
          <Input placeholder="example@company.com" />
        </Form.Item>

        <Form.Item
          label="Phone Number"
          name="phone"
          rules={[{ required: true, message: "Please enter phone number" }]}
        >
          <Input placeholder="+94 77 123 4567" />
        </Form.Item>

        <Form.Item
          label="Company Name"
          name="company"
          rules={[{ required: true, message: "Please enter company name" }]}
        >
          <Input placeholder="Innovista Partner Ltd." />
        </Form.Item>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
        <Form.Item
          label="Company Logo URL"
          name="logo"
          rules={[{ required: true, message: "Please provide logo URL" }]}
        >
          <Input placeholder="https://example.com/logo.png" />
        </Form.Item>

        <Form.Item
          label="Account Password"
          name="password"
          rules={[{ required: true, message: "Please enter password" }]}
        >
          <Input.Password placeholder="Enter secure password" />
        </Form.Item>
      </div>

      <Form.Item
        label="Purchased Goods"
        name="goods"
        rules={[{ required: true, message: "Please select purchased goods" }]}
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
          Register Customer
        </Button>
      </Form.Item>
    </Form>
  );
}

export default CreateCustomer;
