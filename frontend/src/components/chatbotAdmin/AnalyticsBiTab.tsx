import { useState } from "react";
import { FiDownload, FiRefreshCw } from "react-icons/fi";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import AxiosConfig from "../../Context/AxiosConfig";
import type {
  ChatbotAnalyticsReport,
  ChatbotLeadRecord,
  ChatbotSessionRecord,
  UnansweredQuestionRecord,
} from "./types";

interface AnalyticsBiTabProps {
  analytics: ChatbotAnalyticsReport | null;
  sessions: ChatbotSessionRecord[];
  leads: ChatbotLeadRecord[];
  unanswered: UnansweredQuestionRecord[];
  onAnalyticsChange: (next: ChatbotAnalyticsReport) => void;
  onNotify: (msg: string) => void;
}

export default function AnalyticsBiTab({
  analytics,
  sessions,
  leads,
  unanswered,
  onAnalyticsChange,
  onNotify,
}: AnalyticsBiTabProps) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [langFilter, setLangFilter] = useState("all");
  const [loading, setLoading] = useState(false);

  const handleApplyFilter = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.set("fromDate", fromDate);
      if (toDate) params.set("toDate", toDate);
      if (langFilter !== "all") params.set("language", langFilter);
      const res = await AxiosConfig.get<{ analytics: ChatbotAnalyticsReport }>(
        `/api/chatbot/analytics?${params.toString()}`,
        { headers: { "x-no-cache": "true" } }
      );
      if (res.data?.analytics) onAnalyticsChange(res.data.analytics);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = async () => {
    const res = await AxiosConfig.get<Blob>("/api/chatbot/analytics/export.csv", {
      responseType: "blob",
      headers: { "x-no-cache": "true" },
    });
    saveAs(
      res.data,
      `innoassist-analytics-${new Date().toISOString().slice(0, 10)}.csv`
    );
    onNotify("Analytics CSV downloaded.");
  };

  const handleExportExcel = () => {
    if (!analytics) return;
    const wb = XLSX.utils.book_new();
    const summaryRows = [
      { Metric: "Total Conversations", Value: analytics.totalConversations },
      { Metric: "Potential Leads", Value: analytics.potentialLeadsCount },
      { Metric: "Qualified Leads", Value: analytics.qualifiedLeadsCount },
      { Metric: "Lead Conversion %", Value: `${analytics.leadConversionRatePct}%` },
      { Metric: "Unanswered Pending", Value: analytics.unansweredPendingCount },
      { Metric: "Avg CSAT Rating", Value: analytics.avgCsatRating ?? "N/A" },
      { Metric: "Handover Rate %", Value: `${analytics.handoverRatePct}%` },
      { Metric: "Avg Response Time (ms)", Value: analytics.avgResponseTimeMs },
      { Metric: "Gemini Calls Today", Value: analytics.aiUsage.geminiCallsToday },
      { Metric: "AI Cache Hits Today", Value: analytics.aiUsage.cacheHitsToday },
      { Metric: "Local 0-Credit Hits Today", Value: analytics.aiUsage.localZeroCreditHitsToday },
      { Metric: "Total Credits Saved All-Time", Value: analytics.aiUsage.totalCreditsSavedAllTime },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), "KPI Summary");
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        sessions.map((s) => ({
          SessionID: s.sessionId,
          Customer: s.customerName,
          Phone: s.customerPhone,
          Email: s.customerEmail,
          Language: s.language,
          Intent: s.detectedIntent,
          Status: s.status,
          Mode: s.mode,
          Rating: s.rating ?? "",
          AvgResponseMs: s.avgResponseTimeMs,
          LastActivity: s.lastActivityAt,
        }))
      ),
      "Conversations"
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        leads.map((l) => ({
          LeadID: l.id,
          SessionID: l.sessionId,
          Status: l.status,
          Qualified: l.isQualified ? "YES" : "NO",
          Name: l.fields.name || "",
          Company: l.fields.company || "",
          Phone: l.fields.contactNumber || "",
          Email: l.fields.email || "",
          Service: l.fields.requiredService || "",
          Location: l.fields.projectLocation || "",
          Dimensions: l.fields.dimensions || "",
        }))
      ),
      "Leads"
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        unanswered.map((u) => ({
          ID: u.id,
          Question: u.question,
          Count: u.occurrenceCount,
          Language: u.language,
          Category: u.suggestedCategory,
          Reason: u.reason,
          Status: u.status,
        }))
      ),
      "Unanswered Queue"
    );
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `innoassist-bi-report-${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    onNotify("Excel BI workbook downloaded.");
  };

  if (!analytics) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
        Loading real-time chatbot analytics...
      </div>
    );
  }

  const maxServiceCount = Math.max(
    1,
    ...analytics.topRequestedServices.map((s) => s.count)
  );
  const totalLang =
    analytics.languageDistribution.en +
    analytics.languageDistribution.si +
    analytics.languageDistribution.ta;

  return (
    <div className="space-y-5">
      {/* Filter & Export Bar */}
      <div className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            aria-label="From date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
          />
          <input
            type="date"
            aria-label="To date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
          />
          <select
            aria-label="Filter analytics by language"
            value={langFilter}
            onChange={(e) => setLangFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold"
          >
            <option value="all">All Languages</option>
            <option value="en">English</option>
            <option value="si">Sinhala</option>
            <option value="ta">Tamil</option>
          </select>
          <button
            type="button"
            onClick={handleApplyFilter}
            disabled={loading}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#22577A] text-white text-xs font-bold border-0 cursor-pointer"
          >
            <FiRefreshCw />
            <span>{loading ? "Loading..." : "Apply Filter"}</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 cursor-pointer"
          >
            <FiDownload />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold border-0 cursor-pointer"
          >
            <FiDownload />
            <span>Export Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Conversations", value: analytics.totalConversations },
          {
            label: "Qualified / Total Leads",
            value: `${analytics.qualifiedLeadsCount} / ${analytics.potentialLeadsCount}`,
          },
          { label: "Lead Conversion", value: `${analytics.leadConversionRatePct}%` },
          { label: "Unanswered Pending", value: analytics.unansweredPendingCount },
          {
            label: "Customer CSAT",
            value:
              analytics.avgCsatRating !== null
                ? `${analytics.avgCsatRating}/5 (${analytics.csatResponsesCount})`
                : "No ratings yet",
          },
          {
            label: "Human Handover Rate",
            value: `${analytics.handoverRatePct}% (${analytics.handoverCount})`,
          },
          { label: "Avg Response Time", value: `${analytics.avgResponseTimeMs} ms` },
          { label: "RFQs Synced", value: analytics.totalRfqsSynced },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1"
          >
            <div className="text-[10.5px] font-bold text-slate-500 uppercase">{kpi.label}</div>
            <div className="text-lg font-extrabold text-[#14171A] tabular-nums">{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* AI Credit Protection Meter */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold text-emerald-900 uppercase">
            AI Credit Protection &amp; Hybrid Engine Telemetry ({analytics.aiUsage.dateKey})
          </div>
          <div className="text-xs text-emerald-800 mt-1">
            Local KB/Workflow 0-Credit Hits Today:{" "}
            <strong>{analytics.aiUsage.localZeroCreditHitsToday}</strong> · Smart Cache Hits Today:{" "}
            <strong>{analytics.aiUsage.cacheHitsToday}</strong> · Gemini API Calls Today:{" "}
            <strong>{analytics.aiUsage.geminiCallsToday}</strong>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold uppercase text-emerald-700">
            Total AI Credits Saved
          </div>
          <div className="text-xl font-extrabold text-emerald-800 tabular-nums">
            {analytics.aiUsage.totalCreditsSavedAllTime}
          </div>
        </div>
      </div>

      {/* Detailed BI Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="text-xs font-bold text-[#14171A] uppercase">
            Top Requested Services
          </div>
          {analytics.topRequestedServices.length === 0 ? (
            <div className="text-xs text-slate-400">No service data recorded yet.</div>
          ) : (
            <div className="space-y-2">
              {analytics.topRequestedServices.map((row) => (
                <div key={row.service} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700 capitalize">{row.service}</span>
                    <span className="font-bold text-[#22577A] tabular-nums">{row.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-[#22577A] rounded-full"
                      style={{ width: `${Math.round((row.count / maxServiceCount) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="text-xs font-bold text-[#14171A] uppercase">
            Language Distribution &amp; Common Problems
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(["en", "si", "ta"] as const).map((code) => {
              const count = analytics.languageDistribution[code] || 0;
              const pct = totalLang > 0 ? Math.round((count / totalLang) * 100) : 0;
              return (
                <div key={code} className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-2.5 text-center">
                  <div className="text-[10px] font-bold uppercase text-slate-500">{code}</div>
                  <div className="text-sm font-extrabold text-[#14171A] tabular-nums">
                    {count} ({pct}%)
                  </div>
                </div>
              );
            })}
          </div>
          <div className="pt-1 space-y-1">
            <div className="text-[11px] font-bold text-slate-500 uppercase">
              Top Customer Challenges
            </div>
            {analytics.commonCustomerProblems.length === 0 ? (
              <div className="text-xs text-slate-400">None flagged yet.</div>
            ) : (
              analytics.commonCustomerProblems.map((p) => (
                <div key={p.topic} className="flex justify-between text-xs text-slate-700">
                  <span>{p.topic}</span>
                  <strong className="tabular-nums">{p.count}</strong>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5">
          <div className="text-xs font-bold text-[#14171A] uppercase">
            Most Frequently Asked Knowledge Items
          </div>
          {analytics.topAskedFaqs.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between gap-2 text-xs border-b border-slate-100 pb-1.5 last:border-0"
            >
              <span className="truncate text-slate-700">{f.question}</span>
              <span className="px-2 py-0.5 rounded bg-sky-50 text-[#22577A] font-bold tabular-nums shrink-0">
                {f.usageCount}
              </span>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5">
          <div className="text-xs font-bold text-[#14171A] uppercase">
            Daily Interaction Trend
          </div>
          {analytics.dailyInteractions.length === 0 ? (
            <div className="text-xs text-slate-400">No daily interaction history yet.</div>
          ) : (
            <div className="space-y-1.5">
              {analytics.dailyInteractions.slice(-8).map((d) => (
                <div key={d.date} className="flex justify-between text-xs text-slate-700 tabular-nums">
                  <span>{d.date}</span>
                  <strong>{d.count} msgs</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
