import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Table, Button, Popconfirm, message, Tag } from "antd";
import { FiBriefcase, FiLayers, FiSliders, FiStar } from "react-icons/fi";
import axios from "axios";
import AxiosConfig from "../../Context/AxiosConfig";
import AdminPortalShell from "../../components/AdminPortalShell";
import SafeImage from "../../components/SafeImage";
import { computeFeedbackMetrics } from "../../utils/adminPortalHelpers";

type Feedback = {
  Feed_backId: number;
  Customer: {
    Cus_Name: string;
    Cus_CompanyName: string;
  };
  Rating: number;
  Feed_back_comment: string;
  Feed_Back_Images: string[];
  Design: {
    Design_Name: string;
  };
};

function AdminFeedback() {
  const navigate = useNavigate();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const fetchFeedbacks = useCallback(async (page = 1, limit = 10) => {
    try {
      setLoading(true);
      const response = await axios.get("/feedback/allFeedbacks", {
        params: { page, limit },
      });
      setFeedbacks(response.data.data || []);
      setTotal(response.data.total ?? (response.data.data?.length || 0));
      setCurrentPage(response.data.page || page);
      setPageSize(response.data.limit || limit);
    } catch (error) {
      console.error("Error fetching feedbacks:", error);
      message.error("Failed to load feedbacks");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDelete = async (id: number) => {
    try {
      await AxiosConfig.delete(`/feedback/deleteFeedback?feedbackId=${id}`);
      message.success("Feedback deleted successfully");
      fetchFeedbacks(currentPage, pageSize);
    } catch (error) {
      console.error("Error deleting feedback:", error);
      message.error("Failed to delete feedback");
    }
  };

  useEffect(() => {
    fetchFeedbacks(1, 10);
  }, [fetchFeedbacks]);

  const fbMetrics = computeFeedbackMetrics(feedbacks, total);

  const columns = [
    {
      title: "Client",
      dataIndex: ["Customer", "Cus_Name"],
      key: "Cus_Name",
      render: (name: string, record: Feedback) => (
        <div>
          <div className="text-xs font-semibold text-slate-900">{name}</div>
          <div className="text-[11px] text-slate-500">
            {record.Customer?.Cus_CompanyName}
          </div>
        </div>
      ),
    },
    {
      title: "Design",
      dataIndex: ["Design", "Design_Name"],
      key: "Design_Name",
      render: (name: string) => (
        <span className="text-xs font-medium text-[#22577A]">{name}</span>
      ),
    },
    {
      title: "Rating",
      dataIndex: "Rating",
      key: "Rating",
      render: (rating: number) => (
        <Tag color={rating >= 4 ? "green" : "red"} style={{ fontWeight: 600 }}>
          {rating} / 5
        </Tag>
      ),
    },
    {
      title: "Comment",
      dataIndex: "Feed_back_comment",
      key: "Feed_back_comment",
      render: (comment: string) => (
        <p className="text-xs text-slate-600 max-w-[260px] line-clamp-2 m-0">
          {comment}
        </p>
      ),
    },
    {
      title: "Photos",
      dataIndex: "Feed_Back_Images",
      key: "Feed_Back_Images",
      render: (images: string[]) => (
        <div className="flex items-center gap-1.5">
          {images?.map((img, index) => (
            <SafeImage
              key={index}
              src={img}
              alt={`Feedback photo ${index + 1}`}
              width={44}
              height={44}
              style={{ objectFit: "cover", borderRadius: 8 }}
            />
          ))}
        </div>
      ),
    },
    {
      title: "Action",
      key: "action",
      align: "right" as const,
      render: (_: unknown, record: Feedback) => (
        <Popconfirm
          title="Delete this review?"
          onConfirm={() => handleDelete(record.Feed_backId)}
          okText="Delete"
          cancelText="Cancel"
        >
          <Button size="small" danger>
            Delete
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <AdminPortalShell
      sectionCode="Client Reviews"
      sectionTitle="Customer Feedback"
      sectionSubtitle="Inspect product testimonials, star ratings, and installation photos."
      bannerLeftLines={[
        { label: "Total Reviews", value: String(fbMetrics.total) },
        { label: "Average Rating", value: `${fbMetrics.averageRating} / 5.0` },
        { label: "5-Star Reviews", value: String(fbMetrics.fiveStarCount) },
      ]}
      headerAction={{
        label: "About Testimonials",
        icon: <FiSliders className="text-[13px]" />,
        onClick: () => navigate("/EditVisionMission?tab=feedbacks"),
      }}
      railTopAction={{
        label: "Manage About Reviews",
        icon: <FiStar className="text-[13px]" />,
        onClick: () => navigate("/EditVisionMission?tab=feedbacks"),
      }}
      kpiLabel="Average Rating"
      kpiValue={`${fbMetrics.averageRating} / 5`}
      kpiNote={`${fbMetrics.total} reviews`}
      kpiStatusText={`${fbMetrics.fiveStarCount} five-star submissions`}
      kpiStatusTone="green"
      railSecondaryLeft={{
        label: "All Designs",
        icon: <FiLayers className="text-[13px]" />,
        onClick: () => navigate("/ViewAllDesigns"),
      }}
      railSecondaryRight={{
        label: "Projects",
        icon: <FiBriefcase className="text-[13px]" />,
        onClick: () => navigate("/AddProjects"),
      }}
      railPrimaryAction={{
        label: "Edit About Feedbacks",
        icon: <FiSliders className="text-[14px]" />,
        onClick: () => navigate("/EditVisionMission?tab=feedbacks"),
      }}
    >
      <Table
        rowKey="Feed_backId"
        dataSource={feedbacks}
        columns={columns}
        loading={loading}
        size="middle"
        scroll={{ x: 680 }}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: total,
          showSizeChanger: true,
          pageSizeOptions: ["5", "10", "20", "50"],
          onChange: (page, limit) => {
            fetchFeedbacks(page, limit);
          },
        }}
      />
    </AdminPortalShell>
  );
}

export default AdminFeedback;
