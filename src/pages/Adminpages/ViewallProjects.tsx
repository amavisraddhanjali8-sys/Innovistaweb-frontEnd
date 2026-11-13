import { useCallback, useEffect, useRef, useState } from "react";
import { Table, Button, Popconfirm, message, Tooltip } from "antd";
import AxiosConfig from "../../Context/AxiosConfig";
import SafeImage from "../../components/SafeImage";
import { formatCurrencyLkr } from "../../utils/adminPortalHelpers";

type Project = {
  ProjectID: number;
  Project_Title: string;
  Project_Description: string;
  Project_Images: string[];
  Location: string;
  Client_Name: string;
  Client_Email: string;
  Budget: number;
};

interface ViewallProjectsProps {
  refreshTrigger?: number;
  onStatsChange?: (stats: { total: number; budget: number }) => void;
}

function ViewallProjects({
  refreshTrigger = 0,
  onStatsChange,
}: ViewallProjectsProps) {
  const [allProjects, setAllProjects] = useState<Project[]>([]);
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

  const fetchProjects = useCallback(async (page = 1, limit = 10) => {
    try {
      setLoading(true);
      const response = await AxiosConfig.get("/projects/getAllProjects", {
        params: { page, limit },
      });
      const list: Project[] = response.data.data || [];
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
  }, []);

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
      render: (title: string, record: Project) => (
        <div className="flex items-center gap-3">
          {record.Project_Images?.[0] ? (
            <SafeImage
              src={record.Project_Images[0]}
              alt={title}
              width={48}
              height={48}
              style={{ objectFit: "cover", borderRadius: 8 }}
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 shrink-0" />
          )}
          <div className="min-w-0 max-w-[230px]">
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
          </div>
        </div>
      ),
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
      render: (name: string, record: Project) => (
        <div>
          <div className="text-xs font-medium text-slate-900">{name}</div>
          <div className="text-[11px] text-slate-400">{record.Client_Email}</div>
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
      render: (_: unknown, record: Project) => (
        <Popconfirm
          title="Delete this project?"
          onConfirm={() => deleteProject(record.ProjectID)}
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
    <Table
      columns={columns}
      dataSource={allProjects}
      loading={loading}
      rowKey="ProjectID"
      size="middle"
      scroll={{ x: 680 }}
      onRow={(record) => ({
        onMouseEnter: () => setHoveredRow(record.ProjectID),
        onMouseLeave: () => setHoveredRow(null),
      })}
      pagination={{
        current: currentPage,
        pageSize: pageSize,
        total: total,
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
