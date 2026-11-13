import { useState } from "react";
import { Form, Input, Button, message } from "antd";
import AxiosConfig from "../Context/AxiosConfig";

interface PasswordResetFormValues {
  password: string;
  confirm: string;
}

interface PasswordResetProps {
  onSuccess?: () => void;
}

function PasswordReset({ onSuccess }: PasswordResetProps) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const onFinish = async (values: PasswordResetFormValues) => {
    try {
      setSubmitting(true);
      await AxiosConfig.post(
        `/auth/forgot-password?newPassword=${encodeURIComponent(values.password)}`
      );
      message.success("Password updated successfully.");
      form.resetFields();
      onSuccess?.();
    } catch (error) {
      console.error("Password reset failed", error);
      message.error("Could not reset password. Please try again.");
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
        name="password"
        label="New Password"
        rules={[
          { required: true, message: "Please enter a new password." },
          { min: 6, message: "Password must be at least 6 characters." },
        ]}
        hasFeedback
      >
        <Input.Password placeholder="Enter new password" />
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
