import { useCallback, useEffect, useRef, useState } from "react";
import { App as AntdApp, Button, Popconfirm, Space, Table, Tooltip } from "antd";
import { FiEdit2, FiImage, FiTrash2 } from "react-icons/fi";
import AxiosConfig from "../../Context/AxiosConfig";
import SafeImage from "../../components/SafeImage";
import { formatCurrencyLkr } from "../../utils/adminPortalHelpers";
import {
  MAX_PROJECT_IMAGES,
  sanitizeProjectImages,
} from "../../../../shared/projectValidation";
import {
  getProjectStatus,
  type ProjectShowcaseItem,
} from "../../utils/projectShowcaseHelpers";

interface ViewallProjectsProps {
  refreshTrigger?: number;
  onStatsChange?: (stats: { total: number; budget: number }) => void;
  onEditProject?: (project: ProjectShowcaseItem) => void;
}

function ViewallProjects({
  refreshTrigger = 0,
  onStatsChange,
  onEditProject,
}: ViewallProjectsProps) {
  const { message } = AntdApp.useApp();
  const [allProjects, setAllProjects] = useState<ProjectShowcaseItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const pageRef = useRef({ page: 1, limit: 10 });
  const onStatsChangeRef = useRef(onStatsChange);
  useEffect(() => {
    onStatsChangeRef.current = onStatsChange;
  }, [onStatsChange]);

  const fetchProjects = useCallback(
    async (page = 1, limit = 10) => {
      try {
        setLoading(true);
        const response = await AxiosConfig.get("/projects/getAllProjects", {
          params: { page, limit },
        });
        const list: ProjectShowcaseItem[] = response.data.data || [];
        const reportedTotal = response.data.total ?? list.length;
        const nextPage = response.data.page || page;
        const nextLimit = response.data.limit || limit;

        pageRef.current = { page: nextPage, limit: nextLimit };
        setAllProjects(list);
        setTotal(reportedTotal);
        setCurrentPage(nextPage);
        setPageSize(nextLimit);

        const budget = list.reduce((sum, p) => sum + (Number(p.Budget) || 0), 0);
        onStatsChangeRef.current?.({ total: reportedTotal, budget });
      } catch (err) {
        console.error(err);
        message.error("Failed to load projects.");
      } finally {
        setLoading(false);
      }
    },
    [message]
  );

  useEffect(() => {
    fetchProjects(pageRef.current.page, pageRef.current.limit);
  }, [fetchProjects, refreshTrigger]);

  const deleteProject = async (id: number) => {
    try {
      await AxiosConfig.delete("/projects/deleteProject", {
        params: { ProjectID: id },
      });
      message.success("Project deleted.");
      fetchProjects(currentPage, pageSize);
    } catch (err) {
      console.error(err);
      message.error("Failed to delete project.");
    }
  };

  const columns = [
    {
      title: "Project",
      dataIndex: "Project_Title",
      key: "Project_Title",
      render: (title: string, record: ProjectShowcaseItem) => {
        const imgs = sanitizeProjectImages(record.Project_Images);
        const status = getProjectStatus(record);
        return (
          <div className="flex items-center gap-3">
            {imgs[0] ? (
              <SafeImage
                src={imgs[0]}
                alt={title}
                width={52}
                height={52}
                style={{ objectFit: "cover", borderRadius: 8 }}
              />
            ) : (
              <div className="w-[52px] h-[52px] rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                <FiImage className="text-base" />
              </div>
            )}
            <div className="min-w-0 max-w-[260px]">
              <div className="text-xs font-semibold text-slate-900 line-clamp-1">
                {title}
              </div>
              <Tooltip
                title={record.Project_Description}
                open={hoveredRow === record.ProjectID}
                placement="topLeft"
              >
                <div className="text-[11px] text-slate-500 line-clamp-1">
                  {record.Project_Description}
                </div>
              </Tooltip>
              <div className="flex items-center gap-2 mt-1 text-[10px] font-semibold">
                <span
                  className={
                    status === "completed" ? "text-emerald-700" : "text-[#22577A]"
                  }
                >
                  {status === "completed" ? "Completed" : "Ongoing"}
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500 tabular-nums">
                  {imgs.length}/{MAX_PROJECT_IMAGES} Photos
                </span>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      title: "Location",
      dataIndex: "Location",
      key: "Location",
      render: (loc: string) => (
        <span className="text-xs text-slate-700">{loc}</span>
      ),
    },
    {
      title: "Client",
      dataIndex: "Client_Name",
      key: "Client_Name",
      render: (name: string, record: ProjectShowcaseItem) => (
        <div>
          <div className="text-xs font-medium text-slate-900">
            {record.Client_Company || name}
          </div>
          <div className="text-[11px] text-slate-400">
            {record.Client_Company ? name : record.Client_Email}
          </div>
        </div>
      ),
    },
    {
      title: "Budget",
      dataIndex: "Budget",
      key: "Budget",
      align: "right" as const,
      render: (value: number) => (
        <span className="text-xs font-semibold text-slate-900 tabular-nums whitespace-nowrap">
          {formatCurrencyLkr(value)}
        </span>
      ),
    },
    {
      title: "Action",
      key: "actions",
      align: "right" as const,
      render: (_: unknown, record: ProjectShowcaseItem) => (
        <Space size="small">
          <Button
            size="small"
            icon={<FiEdit2 className="text-[12px]" />}
            data-testid={`edit-project-btn-${record.ProjectID}`}
            onClick={() => onEditProject?.(record)}
            style={{
              borderColor: "#22577A",
              color: "#22577A",
            }}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete this project?"
            onConfirm={() => deleteProject(record.ProjectID)}
            okText="Delete"
            cancelText="Cancel"
          >
            <Button
              size="small"
              danger
              icon={<FiTrash2 className="text-[12px]" />}
              data-testid={`delete-project-btn-${record.ProjectID}`}
            >
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={allProjects}
      loading={loading}
      rowKey="ProjectID"
      size="middle"
      scroll={{ x: 740 }}
      onRow={(record) => ({
        onMouseEnter: () => setHoveredRow(record.ProjectID),
        onMouseLeave: () => setHoveredRow(null),
      })}
      pagination={{
        current: currentPage,
        pageSize: pageSize,
        total: total,
        responsive: true,
        showSizeChanger: true,
        pageSizeOptions: ["5", "10", "20", "50"],
        onChange: (page, limit) => {
          fetchProjects(page, limit);
        },
      }}
    />
  );
}

export default ViewallProjects;
