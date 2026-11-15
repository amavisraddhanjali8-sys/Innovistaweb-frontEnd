import { useState } from "react";
import { App as AntdApp, Form, Input, Button } from "antd";
import AxiosConfig from "../Context/AxiosConfig";

interface PasswordResetFormValues {
  currentPassword: string;
  password: string;
  confirm: string;
}

interface PasswordResetProps {
  onSuccess?: () => void;
}

function PasswordReset({ onSuccess }: PasswordResetProps) {
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const onFinish = async (values: PasswordResetFormValues) => {
    try {
      setSubmitting(true);
      await AxiosConfig.post("/api/auth/change-password", {
        currentPassword: values.currentPassword,
        newPassword: values.password,
      });
      message.success("Password updated successfully.");
      form.resetFields();
      onSuccess?.();
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Could not update password. Check your current password and strength rules.";
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form
      layout="vertical"
      form={form}
      name="reset"
      onFinish={onFinish}
      style={{ maxWidth: 600 }}
      scrollToFirstError
    >
      <Form.Item
        name="currentPassword"
        label="Current Password"
        rules={[{ required: true, message: "Please enter your current password." }]}
      >
        <Input.Password placeholder="Enter current password" />
      </Form.Item>

      <Form.Item
        name="password"
        label="New Password"
        rules={[
          { required: true, message: "Please enter a new password." },
          { min: 8, message: "Password must be at least 8 characters with letters and numbers." },
        ]}
        hasFeedback
      >
        <Input.Password placeholder="Min 8 chars (letters + numbers)" />
      </Form.Item>

      <Form.Item
        name="confirm"
        label="Confirm Password"
        dependencies={["password"]}
        hasFeedback
        rules={[
          { required: true, message: "Please confirm your password." },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue("password") === value) {
                return Promise.resolve();
              }
              return Promise.reject(new Error("Passwords do not match."));
            },
          }),
        ]}
      >
        <Input.Password placeholder="Re-enter new password" />
      </Form.Item>

      <Form.Item className="mb-0">
        <Button
          type="primary"
          htmlType="submit"
          loading={submitting}
          block
          style={{
            background: "#22577A",
            borderColor: "#22577A",
            borderRadius: 10,
            height: 40,
            fontWeight: 600,
          }}
        >
          Update Password
        </Button>
      </Form.Item>
    </Form>
  );
}

export default PasswordReset;
