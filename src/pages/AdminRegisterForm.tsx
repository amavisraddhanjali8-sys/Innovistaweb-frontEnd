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
      const res = await fetch("/api/upload", {
        method: "POST",
        body: data,
      });

      const uploadData = await res.json();
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
    Admin_Email: string;
    Admin_Phone: string;
    Admin_Profile: string;
  };

  const onFinish = async (values: AdminValues) => {
    try {
      setSubmitting(true);
      await AxiosConfig.post("/auth/register", {
        Admin_Name: values.Admin_Name,
        Admin_Email: values.Admin_Email,
        Admin_Phone: values.Admin_Phone,
        Admin_Profile: imageUrl,
      });

      message.success("Admin registered successfully.");
      form.resetFields();
      setImageUrl(null);
      onSuccess?.();
    } catch {
      message.error("Registration failed.");
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
          label="Admin Name"
          rules={[{ required: true, message: "Please input Admin Name." }]}
        >
          <Input placeholder="Enter full name" />
        </Form.Item>

        <Form.Item
          name="Admin_Phone"
          label="Phone Number"
          rules={[{ required: true, message: "Please input Admin Phone." }]}
        >
          <Input placeholder="+94 77 000 0000" />
        </Form.Item>
      </div>

      <Form.Item
        name="Admin_Email"
        label="Admin Email"
        rules={[
          { type: "email", message: "Invalid email format." },
          { required: true, message: "Please input Admin Email." },
        ]}
      >
        <Input placeholder="operator@innovista.com" />
      </Form.Item>

      <Form.Item label="Profile Avatar">
        <div className="flex items-center gap-4 flex-wrap">
          <Upload
            beforeUpload={(file) => {
              uploadImageToCloudinary(file);
              return false;
            }}
            showUploadList={false}
          >
            <Button icon={<UploadOutlined />} loading={uploading}>
              {uploading ? "Uploading..." : "Upload Photo"}
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
          Register Admin
        </Button>
      </Form.Item>
    </Form>
  );
};

export default AdminRegisterForm;
