import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button, Input, Modal, Rate, Select, message } from "antd";
import { FiArrowUpRight, FiEdit3, FiStar } from "react-icons/fi";
import AxiosConfig from "../Context/AxiosConfig";
import styles from "../cssModules/CustomerFeedback.module.css";
import SimpleScrollStack, { ScrollStackItem } from "./SimpleScrollStack";
import MainHeading from "./MainHeading";
import TactileActionButton from "./TactileActionButton";
import {
  DEFAULT_CUSTOMER_FEEDBACKS,
  DEFAULT_FEEDBACK_AVATAR,
  buildCustomerFeedbackPayload,
  resolveHomeFeedbackCards,
  validateCustomerFeedbackForm,
  type CustomerFeedbackRecord,
  type HomeFeedbackCard,
} from "../utils/customerFeedbackHelpers";

interface CatalogDesignOption {
  DesignID: number | string;
  Design_Name: string;
}

function CustomerFeedback() {
  const [cards, setCards] = useState<HomeFeedbackCard[]>(() =>
    resolveHomeFeedbackCards(DEFAULT_CUSTOMER_FEEDBACKS)
  );
  const [loadedFromServer, setLoadedFromServer] = useState(false);
  const [failedAvatars, setFailedAvatars] = useState<Record<string, boolean>>({});

  // Public feedback submission modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [designOptions, setDesignOptions] = useState<CatalogDesignOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerRole, setCustomerRole] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [selectedDesignId, setSelectedDesignId] = useState<string>("");
  const [customDesignName, setCustomDesignName] = useState("");
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState("");

  const fetchHomeFeedbacks = useCallback(async () => {
    try {
      const response = await AxiosConfig.get<{ data?: CustomerFeedbackRecord[] }>(
        "/feedback/allFeedbacks",
        { params: { homeOnly: true, limit: 25 } }
      );
      if (Array.isArray(response.data?.data)) {
        setCards(resolveHomeFeedbackCards(response.data.data));
        setLoadedFromServer(true);
      }
    } catch {
      // Keep default seeded cards cleanly if backend is temporarily unreachable
    }
  }, []);

  useEffect(() => {
    fetchHomeFeedbacks();
  }, [fetchHomeFeedbacks]);

  useEffect(() => {
    if (!reviewModalOpen || designOptions.length > 0) return;
    AxiosConfig.get<{ data?: CatalogDesignOption[] }>("/designs/all", {
      params: { limit: 100 },
    })
      .then((res) => {
        if (Array.isArray(res.data?.data)) {
          setDesignOptions(res.data.data);
        }
      })
      .catch(() => {
        // Optional dropdown enhancement
      });
  }, [reviewModalOpen, designOptions.length]);

  const handleSubmitReview = async () => {
    const matchedDesign = designOptions.find(
      (d) => String(d.DesignID) === selectedDesignId
    );
    const resolvedDesignName =
      matchedDesign?.Design_Name ||
      customDesignName.trim() ||
      "Custom Architectural Aluminium System";

    const payloadInput = {
      customerName,
      customerRole,
      companyName,
      designName: resolvedDesignName,
      designId: matchedDesign ? String(matchedDesign.DesignID) : undefined,
      rating,
      comment,
      showOnHome: true,
    };

    const validationError = validateCustomerFeedbackForm(payloadInput);
    if (validationError) {
      message.warning(validationError);
      return;
    }

    try {
      setSubmitting(true);
      const payload = buildCustomerFeedbackPayload(payloadInput, 0);
      await AxiosConfig.post("/feedback/createFeedback", payload);
      message.success("Thank you! Your customer feedback has been published.");
      setReviewModalOpen(false);
      setCustomerName("");
      setCustomerRole("");
      setCompanyName("");
      setSelectedDesignId("");
      setCustomDesignName("");
      setRating(5);
      setComment("");
      await fetchHomeFeedbacks();
    } catch {
      message.error("Could not submit feedback right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadedFromServer && cards.length === 0) {
    return null;
  }

  return (
    <section className={styles.container} aria-label="Client Testimonials">
      <div className="w-full max-w-[1640px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
        <MainHeading
          heading="What Our Clients Say"
          description="Verified project partners across residential developments, commercial towers, and hospitality pavilions."
        />

        <SimpleScrollStack>
          {cards.map((item) => {
            const avatarSrc = failedAvatars[item.id]
              ? DEFAULT_FEEDBACK_AVATAR
              : item.avatar || DEFAULT_FEEDBACK_AVATAR;
            const productHref = item.designId
              ? `/products/${item.designId}`
              : item.designName
              ? `/products?q=${encodeURIComponent(item.designName)}`
              : "/products";

            return (
              <ScrollStackItem key={item.id}>
                <div className={styles.card}>
                  <div className={styles.avatar}>
                    <img
                      src={avatarSrc}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      loading="eager"
                      decoding="async"
                      onError={() =>
                        setFailedAvatars((prev) => ({ ...prev, [item.id]: true }))
                      }
                    />
                  </div>
                  <h3 className={styles.designation}>{item.name}</h3>
                  <div className={styles.role}>{item.role}</div>

                  <div
                    className="flex items-center justify-center gap-1 mb-3 text-amber-500"
                    aria-label={`${item.rating} out of 5 stars`}
                  >
                    {Array.from({ length: item.rating }).map((_, idx) => (
                      <FiStar
                        key={idx}
                        className="w-3.5 h-3.5 fill-amber-400 text-amber-500"
                      />
                    ))}
                  </div>

                  <p className={styles.feedback}>&ldquo;{item.quote}&rdquo;</p>

                  {item.designName && (
                    <Link
                      to={productHref}
                      className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#22577A] hover:text-[#173f5b] transition-colors no-underline"
                    >
                      <span>{item.designName}</span>
                      <FiArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </ScrollStackItem>
            );
          })}
        </SimpleScrollStack>

        <div className="mt-4 flex justify-center">
          <TactileActionButton
            tone="emerald"
            size="md"
            icon={<FiEdit3 className="w-3.5 h-3.5" />}
            onClick={() => setReviewModalOpen(true)}
          >
            Share Your Feedback
          </TactileActionButton>
        </div>
      </div>

      <Modal
        open={reviewModalOpen}
        onCancel={() => setReviewModalOpen(false)}
        footer={null}
        title="Share Your Experience with Innovista"
        centered
      >
        <div className="space-y-3.5 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Your Name *
              </label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g., Kavinda De Silva"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Role / Title
              </label>
              <Input
                value={customerRole}
                onChange={(e) => setCustomerRole(e.target.value)}
                placeholder="e.g., Principal Architect"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Company / Project
              </label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g., Horizon Hospitality"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rating
              </label>
              <div className="pt-1">
                <Rate value={rating} onChange={(val) => setRating(val || 5)} />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Product / System Installed
            </label>
            {designOptions.length > 0 ? (
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="Select a product system (optional)"
                style={{ width: "100%" }}
                value={selectedDesignId || undefined}
                onChange={(val) => setSelectedDesignId(val || "")}
                options={designOptions.map((d) => ({
                  value: String(d.DesignID),
                  label: d.Design_Name,
                }))}
              />
            ) : (
              <Input
                value={customDesignName}
                onChange={(e) => setCustomDesignName(e.target.value)}
                placeholder="e.g., Minimalist Slimline Sliding Door System"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Your Review *
            </label>
            <Input.TextArea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share how Innovista's architectural aluminium or glazing systems performed on your project..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button onClick={() => setReviewModalOpen(false)}>Cancel</Button>
            <Button
              type="primary"
              loading={submitting}
              onClick={handleSubmitReview}
              style={{ backgroundColor: "#22577A" }}
            >
              Publish Feedback
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}

export default CustomerFeedback;
