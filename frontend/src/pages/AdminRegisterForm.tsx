import React, { useState } from "react";
import { App as AntdApp, Button, Form, Input, Upload } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import AxiosConfig from "../Context/AxiosConfig";

interface AdminRegisterFormProps {
  onSuccess?: () => void;
}

const AdminRegisterForm: React.FC<AdminRegisterFormProps> = ({ onSuccess }) => {
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const uploadImageToCloudinary = async (file: File) => {
    const data = new FormData();
    data.append("file", file);
    data.append("upload_preset", "InnovistaImage");
    data.append("cloud_name", "dqabfysqj");

    try {
      setUploading(true);
      const res = await AxiosConfig.post("/api/upload", data);

      const uploadData = res.data || {};
      if (uploadData.url || uploadData.secure_url) {
        const finalUrl = uploadData.secure_url || uploadData.url;
        setImageUrl(finalUrl);
        message.success("Image uploaded successfully.");
        form.setFieldsValue({ Admin_Profile: finalUrl });
      } else {
        throw new Error("Image upload failed");
      }
    } catch {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          const finalUrl = e.target.result as string;
          setImageUrl(finalUrl);
          message.success("Image loaded.");
          form.setFieldsValue({ Admin_Profile: finalUrl });
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setUploading(false);
    }
  };

  type AdminValues = {
    Admin_Name: string;
    Admin_Username?: string;
    Admin_Email: string;
    Admin_Phone: string;
    Admin_Password: string;
    Admin_Profile: string;
  };

  const onFinish = async (values: AdminValues) => {
    try {
      setSubmitting(true);
      await AxiosConfig.post("/auth/register", {
        Admin_Name: values.Admin_Name,
        Admin_Username: values.Admin_Username?.trim() || undefined,
        Admin_Email: values.Admin_Email,
        Admin_Phone: values.Admin_Phone,
        Admin_Password: values.Admin_Password,
        Admin_Profile: imageUrl,
      });

      message.success("Admin registered successfully.");
      form.resetFields();
      setImageUrl(null);
      onSuccess?.();
    } catch (err: unknown) {
      const serverMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      message.error(serverMsg || "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      autoComplete="off"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
        <Form.Item
          name="Admin_Name"
          label="Name"
          rules={[{ required: true, message: "Please input Admin Name." }]}
        >
          <Input placeholder="Enter full name" />
        </Form.Item>

        <Form.Item
          name="Admin_Username"
          label="Username"
          rules={[
            {
              pattern: /^[a-zA-Z0-9._-]{3,32}$/,
              message: "3-32 letters, numbers, ., _, or -",
            },
          ]}
        >
          <Input placeholder="e.g. chief.admin" />
        </Form.Item>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
        <Form.Item
          name="Admin_Email"
          label="Email"
          rules={[
            { type: "email", message: "Invalid email format." },
            { required: true, message: "Please input Admin Email." },
          ]}
        >
          <Input placeholder="operator@innovista.com" />
        </Form.Item>

        <Form.Item
          name="Admin_Phone"
          label="Phone"
          rules={[{ required: true, message: "Please input Admin Phone." }]}
        >
          <Input placeholder="+94 77 000 0000" />
        </Form.Item>
      </div>

      <Form.Item
        name="Admin_Password"
        label="Password"
        rules={[
          { required: true, message: "Please input a strong password." },
          { min: 8, message: "Must be at least 8 characters." },
          {
            pattern: /(?=.*[A-Za-z])(?=.*\d)/,
            message: "Must include both letters and numbers.",
          },
        ]}
      >
        <Input.Password placeholder="At least 8 characters with letters & numbers" />
      </Form.Item>

      <Form.Item label="Avatar">
        <div className="flex items-center gap-4 flex-wrap">
          <Upload
            beforeUpload={(file) => {
              uploadImageToCloudinary(file);
              return false;
            }}
            showUploadList={false}
          >
            <Button icon={<UploadOutlined />} loading={uploading}>
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </Upload>

          {imageUrl && (
            <img
              src={imageUrl}
              alt="Admin avatar preview"
              className="w-12 h-12 rounded-full object-cover border border-slate-200"
            />
          )}
        </div>
      </Form.Item>

      <Form.Item name="Admin_Profile" hidden>
        <Input />
      </Form.Item>

      <Form.Item className="mb-0 pt-2">
        <Button
          type="primary"
          htmlType="submit"
          loading={submitting}
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
};

export default AdminRegisterForm;
