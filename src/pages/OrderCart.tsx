import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { App as AntdApp, Empty, Form, Input, Modal } from "antd";
import { FiArrowRight, FiShoppingBag, FiTrash2 } from "react-icons/fi";
import AxiosConfig from "../Context/AxiosConfig";
import { useAuth } from "../Context/AuthContext";
import PageMetadata from "../components/PageMetadata";
import { buildSignupRedirectUrl } from "../utils/authHelpers";
import { formatCurrencyLkr } from "../utils/adminPortalHelpers";

interface DesignDetails {
  DesignID: number;
  Design_Name: string;
  Design_Image: string[];
  Design_Description: string;
  price?: number;
}

function OrderCart() {
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuth();
  const [cart, setCart] = useState<number[]>([]);
  const [cardDetails, setCardDetails] = useState<DesignDetails[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (!isLoggedIn && !sessionStorage.getItem("accessToken")) {
      navigate(buildSignupRedirectUrl("/OrderCart", "cart"), { replace: true });
    }
  }, [isLoggedIn, navigate]);

  const loadCart = () => {
    try {
      const cartData = JSON.parse(localStorage.getItem("cart") || "[]");
      setCart(Array.isArray(cartData) ? cartData : []);
    } catch {
      setCart([]);
    }
  };

  const fetchCardDetails = useCallback(
    async (idsList: number[]) => {
      try {
        const ids = idsList.join(",");
        const { data } = await AxiosConfig.get(`/designs/DesignDetails?ids=${ids}`);
        setCardDetails(Array.isArray(data) ? data : []);
      } catch {
        message.error("Failed to load cart items");
      }
    },
    [message]
  );

  useEffect(() => {
    loadCart();
  }, []);

  useEffect(() => {
    if (cart.length > 0) {
      fetchCardDetails(cart);
    } else {
      setCardDetails([]);
    }
  }, [cart, fetchCardDetails]);

  const removeDesign = (id: number) => {
    const updatedCart = cart.filter((item) => item !== id);
    localStorage.setItem("cart", JSON.stringify(updatedCart));
    setCart(updatedCart);
    window.dispatchEvent(new Event("innovista-cart-updated"));
    message.success("Item removed from quotation cart");
  };

  const openOrderDialog = () => {
    if (!cart.length) {
      message.warning("Your quotation cart is empty!");
      return;
    }
    form.setFieldsValue({
      name: user?.name || "",
      email: user?.email || "",
    });
    setIsModalOpen(true);
  };

  const createOrder = async (values: { name: string; email: string; phone: string }) => {
    const payload = {
      Order_Status: "PENDING",
      Client_Name: values.name,
      Client_Email: values.email,
      Client_Number: values.phone,
      Designs: cart.map((id) => ({ DesignID: id })),
    };

    try {
      setSubmitting(true);
      await AxiosConfig.post("/order/createOrder", payload);
      message.success("Quotation order submitted successfully!");
      localStorage.removeItem("cart");
      setCart([]);
      window.dispatchEvent(new Event("innovista-cart-updated"));
      setIsModalOpen(false);
      form.resetFields();
    } catch {
      message.error("Failed to create order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[75vh] w-full bg-[#F8FAFC] text-[#14171A] pb-24 md:pb-12">
      <PageMetadata
        title="Quotation Cart"
        description="Review your selected aluminium door, window, and glazing designs and submit a consolidated quotation order."
        canonicalPath="/ordercart"
        noIndex
      />

      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#3393B8]">
              Order Selections
            </span>
            <h1
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              className="mt-1 text-2xl sm:text-3xl font-extrabold text-[#14171A] tracking-tight m-0"
            >
              Quotation Cart
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[#5F6672] m-0">
              Review your shortlisted architectural systems and submit a consolidated quotation inquiry.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/products"
              className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:border-[#22577A] text-xs font-semibold text-slate-700 no-underline transition-colors"
            >
              <FiShoppingBag />
              <span>Browse Catalog</span>
            </Link>
            {cardDetails.length > 0 && (
              <button
                type="button"
                onClick={openOrderDialog}
                className="min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#22577A] via-[#3393B8] to-[#5CB6D2] hover:brightness-105 text-white text-xs sm:text-sm font-bold border-0 cursor-pointer shadow-sm transition-all"
              >
                <span>Submit Quotation Order ({cardDetails.length})</span>
                <FiArrowRight />
              </button>
            )}
          </div>
        </div>

        {cardDetails.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 sm:p-14 text-center space-y-4">
            <Empty description="No items in your quotation cart yet" />
            <div className="pt-2">
              <Link
                to="/products"
                className="min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#22577A] text-white text-xs sm:text-sm font-semibold no-underline"
              >
                <span>Explore Architectural Systems</span>
                <FiArrowRight />
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {cardDetails.map((design) => (
              <article
                key={design.DesignID}
                className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col shadow-[0_8px_24px_-18px_rgba(15,23,42,0.18)]"
              >
                <div className="aspect-[4/3] w-full bg-slate-100 overflow-hidden">
                  <img
                    src={design.Design_Image?.[0] || "/assets/products/door.jpg"}
                    alt={design.Design_Name}
                    className="w-full h-full object-cover block"
                  />
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-[#14171A] leading-snug m-0">
                      {design.Design_Name}
                    </h2>
                    <p className="mt-1.5 text-xs text-[#5F6672] line-clamp-3 leading-relaxed m-0">
                      {design.Design_Description}
                    </p>
                    {design.price ? (
                      <div className="mt-2.5 text-xs font-bold text-[#22577A] tabular-nums">
                        Est. {formatCurrencyLkr(design.price)}
                      </div>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeDesign(design.DesignID)}
                    className="min-h-[44px] w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 bg-red-50/70 hover:bg-red-100 text-xs font-semibold text-[#e60000] cursor-pointer transition-colors"
                  >
                    <FiTrash2 />
                    <span>Remove from Cart</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Order Modal */}
      <Modal
        title="Submit Quotation Order"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        centered
        width="min(500px, calc(100vw - 24px))"
      >
        <Form layout="vertical" form={form} onFinish={createOrder} className="pt-2">
          <Form.Item
            label="Client Name"
            name="name"
            rules={[{ required: true, message: "Please enter your name" }]}
          >
            <Input placeholder="Enter client name" size="large" />
          </Form.Item>

          <Form.Item
            label="Client Email"
            name="email"
            rules={[
              { required: true, message: "Please enter your email" },
              { type: "email", message: "Enter a valid email" },
            ]}
          >
            <Input placeholder="Enter client email" size="large" />
          </Form.Item>

          <Form.Item
            label="Phone Number"
            name="phone"
            rules={[{ required: true, message: "Enter phone number" }]}
          >
            <Input placeholder="Enter phone number (+94...)" size="large" />
          </Form.Item>

          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[44px] rounded-xl bg-gradient-to-r from-[#22577A] via-[#3393B8] to-[#5CB6D2] text-white text-sm font-bold border-0 cursor-pointer disabled:opacity-60"
          >
            {submitting ? "Submitting Order..." : "Confirm & Submit Order"}
          </button>
        </Form>
      </Modal>
    </div>
  );
}

export default OrderCart;