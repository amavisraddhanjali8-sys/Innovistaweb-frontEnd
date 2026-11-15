import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  FiCheckCircle,
  FiHeadphones,
  FiPaperclip,
  FiRefreshCw,
  FiRotateCcw,
  FiSend,
  FiUserCheck,
} from "react-icons/fi";
import AxiosConfig from "../../Context/AxiosConfig";
import type {
  AdminStaffOption,
  ChatbotLeadRecord,
  ChatbotSessionRecord,
  LeadStage,
} from "./types";

interface LiveSupportLeadsTabProps {
  sessions: ChatbotSessionRecord[];
  leads: ChatbotLeadRecord[];
  staffList: AdminStaffOption[];
  onSessionsChange: (next: ChatbotSessionRecord[]) => void;
  onLeadsChange: (next: ChatbotLeadRecord[]) => void;
  onNotify: (msg: string) => void;
}

const SESSION_BADGE: Record<ChatbotSessionRecord["status"], string> = {
  WAITING_HUMAN: "bg-amber-50 border-amber-200 text-amber-800",
  IN_HUMAN_SUPPORT: "bg-emerald-50 border-emerald-200 text-emerald-700",
  ESCALATED: "bg-red-50 border-red-200 text-[#E60000]",
  OPEN: "bg-sky-50 border-sky-200 text-[#22577A]",
  CLOSED: "bg-slate-100 border-slate-200 text-slate-600",
};

export default function LiveSupportLeadsTab({
  sessions,
  leads,
  staffList,
  onSessionsChange,
  onLeadsChange,
  onNotify,
}: LiveSupportLeadsTabProps) {
  const [subView, setSubView] = useState<"inbox" | "leads">("inbox");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string>(sessions[0]?.sessionId || "");
  const [contactHistory, setContactHistory] = useState<
    Array<{
      sessionId: string;
      status: string;
      detectedIntent: string;
      lastActivityAt: string;
      messageCount: number;
    }>
  >([]);
  const [replyText, setReplyText] = useState("");
  const [noteText, setNoteText] = useState("");
  const [assignEmail, setAssignEmail] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const filteredSessions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sessions.filter((s) => {
      if (statusFilter !== "ALL" && s.status !== statusFilter) return false;
      if (!q) return true;
      return `${s.sessionId} ${s.customerName} ${s.customerEmail} ${s.customerPhone} ${s.detectedIntent}`
        .toLowerCase()
        .includes(q);
    });
  }, [sessions, statusFilter, search]);

  const selectedSession =
    sessions.find((s) => s.sessionId === selectedId) || filteredSessions[0] || null;

  useEffect(() => {
    if (!selectedSession?.sessionId) {
      setContactHistory([]);
      return;
    }
    let active = true;
    AxiosConfig.get<{
      session: ChatbotSessionRecord;
      contactHistory: typeof contactHistory;
    }>(`/api/chatbot/sessions/${encodeURIComponent(selectedSession.sessionId)}/history`, {
      headers: { "x-no-cache": "true" },
    })
      .then((res) => {
        if (!active) return;
        setContactHistory(res.data?.contactHistory || []);
      })
      .catch(() => null);
    return () => {
      active = false;
    };
  }, [selectedSession?.sessionId]);

  const replaceSessionInList = (updated: ChatbotSessionRecord) => {
    onSessionsChange(
      sessions.map((s) => (s.sessionId === updated.sessionId ? updated : s))
    );
  };

  const refreshSessions = async () => {
    const res = await AxiosConfig.get<{ sessions: ChatbotSessionRecord[] }>(
      "/api/chatbot/sessions",
      { headers: { "x-no-cache": "true" } }
    );
    if (Array.isArray(res.data?.sessions)) {
      onSessionsChange(res.data.sessions);
    }
  };

  const handleTakeover = async (sessionId: string) => {
    const res = await AxiosConfig.post<{ session: ChatbotSessionRecord }>(
      `/api/chatbot/sessions/${encodeURIComponent(sessionId)}/takeover`
    );
    if (res.data?.session) replaceSessionInList(res.data.session);
    onNotify("Takeover active — AI auto-replies paused for this customer.");
  };

  const handleSendAdminReply = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedSession || !replyText.trim() || sendingReply) return;
    setSendingReply(true);
    try {
      const res = await AxiosConfig.post<{ session: ChatbotSessionRecord }>(
        `/api/chatbot/sessions/${encodeURIComponent(selectedSession.sessionId)}/reply`,
        { message: replyText.trim() }
      );
      if (res.data?.session) replaceSessionInList(res.data.session);
      setReplyText("");
    } finally {
      setSendingReply(false);
    }
  };

  const handleReturnToAi = async (sessionId: string, markResolved = false) => {
    const res = await AxiosConfig.post<{ session: ChatbotSessionRecord }>(
      `/api/chatbot/sessions/${encodeURIComponent(sessionId)}/return-ai`,
      { markResolved }
    );
    if (res.data?.session) replaceSessionInList(res.data.session);
    onNotify(markResolved ? "Session resolved & closed." : "Conversation returned to AI mode.");
  };

  const handleAddNote = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedSession || !noteText.trim()) return;
    const res = await AxiosConfig.post<{ session: ChatbotSessionRecord }>(
      `/api/chatbot/sessions/${encodeURIComponent(selectedSession.sessionId)}/note`,
      { note: noteText.trim() }
    );
    if (res.data?.session) replaceSessionInList(res.data.session);
    setNoteText("");
    onNotify("Internal note added.");
  };

  const handleAssignStaff = async () => {
    if (!selectedSession || !assignEmail) return;
    const staff = staffList.find((s) => s.Admin_Email === assignEmail);
    const res = await AxiosConfig.post<{ session: ChatbotSessionRecord }>(
      `/api/chatbot/sessions/${encodeURIComponent(selectedSession.sessionId)}/assign`,
      {
        adminUserId: staff?.AdminId,
        adminName: staff?.Admin_Name || assignEmail,
        adminEmail: assignEmail,
      }
    );
    if (res.data?.session) replaceSessionInList(res.data.session);
    onNotify(`Conversation transferred to ${staff?.Admin_Name || assignEmail}.`);
  };

  const handleStatusChange = async (
    sessionId: string,
    status: ChatbotSessionRecord["status"]
  ) => {
    const res = await AxiosConfig.post<{ session: ChatbotSessionRecord }>(
      `/api/chatbot/sessions/${encodeURIComponent(sessionId)}/status`,
      { status }
    );
    if (res.data?.session) replaceSessionInList(res.data.session);
    onNotify(`Session status updated to ${status}.`);
  };

  const handleUpdateLeadStage = async (leadId: string, status: LeadStage) => {
    const res = await AxiosConfig.patch<{ leads: ChatbotLeadRecord[] }>(
      `/api/chatbot/leads/${encodeURIComponent(leadId)}`,
      { status }
    );
    if (res.data?.leads) onLeadsChange(res.data.leads);
    onNotify(`Lead ${leadId} marked ${status}.`);
  };

  const handleSyncLeadToRfq = async (leadId: string) => {
    const res = await AxiosConfig.post<{ leads: ChatbotLeadRecord[] }>(
      `/api/chatbot/leads/${encodeURIComponent(leadId)}/sync-rfq`
    );
    if (res.data?.leads) onLeadsChange(res.data.leads);
    onNotify(`Lead ${leadId} synced into Admin RFQs.`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSubView("inbox")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer border ${
              subView === "inbox"
                ? "bg-[#22577A] border-[#22577A] text-white"
                : "bg-white border-slate-200 text-slate-600"
            }`}
          >
            Live Support Inbox ({sessions.length})
          </button>
          <button
            type="button"
            onClick={() => setSubView("leads")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer border ${
              subView === "leads"
                ? "bg-[#22577A] border-[#22577A] text-white"
                : "bg-white border-slate-200 text-slate-600"
            }`}
          >
            Quotation & Sales Leads ({leads.length})
          </button>
        </div>

        <button
          type="button"
          onClick={refreshSessions}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 cursor-pointer"
        >
          <FiRefreshCw className="text-xs" />
          <span>Refresh Live</span>
        </button>
      </div>

      {subView === "inbox" && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          {/* Left Session Queue */}
          <div className="xl:col-span-4 space-y-2.5">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search customer, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold"
              >
                <option value="ALL">All</option>
                <option value="WAITING_HUMAN">Waiting Human</option>
                <option value="IN_HUMAN_SUPPORT">Live Support</option>
                <option value="ESCALATED">Escalated</option>
                <option value="OPEN">Open (AI)</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            <div className="space-y-1.5 max-h-[650px] overflow-y-auto pr-1">
              {filteredSessions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">
                  No conversations match this filter yet.
                </div>
              ) : (
                filteredSessions.map((s) => (
                  <div
                    key={s.sessionId}
                    onClick={() => setSelectedId(s.sessionId)}
                    className={`rounded-xl border p-3 cursor-pointer space-y-1 transition-colors ${
                      selectedSession?.sessionId === s.sessionId
                        ? "border-[#22577A] bg-sky-50/70"
                        : "border-slate-200 bg-white hover:border-[#3393B8]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#14171A] truncate">
                        {s.customerName || s.customerPhone || s.sessionId}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded border text-[9.5px] font-bold uppercase shrink-0 ${
                          SESSION_BADGE[s.status]
                        }`}
                      >
                        {s.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {s.messages[s.messages.length - 1]?.text || "No messages"}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>
                        {s.language.toUpperCase()} · {s.detectedIntent.replace(/_/g, " ")}
                      </span>
                      <span className="tabular-nums">
                        {new Date(s.lastActivityAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Transcript + Controls */}
          <div className="xl:col-span-8">
            {selectedSession ? (
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
                {/* Header Controls */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <div className="text-sm font-bold text-[#14171A]">
                      {selectedSession.customerName || "Anonymous Visitor"}{" "}
                      <span className="text-xs font-normal text-slate-500">
                        ({selectedSession.sessionId})
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {selectedSession.customerPhone || "No phone"} ·{" "}
                      {selectedSession.customerEmail || "No email"}
                      {selectedSession.assignedAdminName
                        ? ` · Assigned: ${selectedSession.assignedAdminName}`
                        : ""}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {selectedSession.mode !== "human" ? (
                      <button
                        type="button"
                        onClick={() => handleTakeover(selectedSession.sessionId)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold border-0 cursor-pointer"
                      >
                        <FiHeadphones />
                        <span>Take Over (Pause AI)</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleReturnToAi(selectedSession.sessionId, false)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#22577A] text-white text-xs font-bold border-0 cursor-pointer"
                      >
                        <FiRotateCcw />
                        <span>Return to AI Mode</span>
                      </button>
                    )}

                    <select
                      aria-label="Session status"
                      value={selectedSession.status}
                      onChange={(e) =>
                        handleStatusChange(
                          selectedSession.sessionId,
                          e.target.value as ChatbotSessionRecord["status"]
                        )
                      }
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold"
                    >
                      <option value="OPEN">Open</option>
                      <option value="WAITING_HUMAN">Waiting Human</option>
                      <option value="IN_HUMAN_SUPPORT">In Human Support</option>
                      <option value="ESCALATED">Escalated</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </div>
                </div>

                {/* Collected Lead Data & Attachments */}
                {Object.values(selectedSession.collectedLead || {}).some(Boolean) && (
                  <div className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-3 text-xs space-y-1">
                    <div className="text-[10.5px] font-bold text-slate-500 uppercase">
                      Captured Customer & Project Context
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Object.entries(selectedSession.collectedLead).map(([k, v]) =>
                        v ? (
                          <div key={k} className="truncate">
                            <span className="text-slate-500">{k}:</span>{" "}
                            <strong className="text-[#14171A]">{v}</strong>
                          </div>
                        ) : null
                      )}
                    </div>
                    {selectedSession.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {selectedSession.attachments.map((att) => (
                          <a
                            key={att.id}
                            href={att.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-slate-200 text-[#22577A] text-[11px] font-semibold no-underline"
                          >
                            <FiPaperclip />
                            <span>{att.fileName}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Transcript */}
                <div className="max-h-[300px] overflow-y-auto space-y-2 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                  {selectedSession.messages.map((m) => (
                    <div
                      key={m.id}
                      className={`rounded-xl px-3 py-2 text-xs ${
                        m.role === "user"
                          ? "bg-white border border-slate-200 ml-6"
                          : m.role === "admin"
                            ? "bg-emerald-50 border border-emerald-200 mr-6"
                            : m.role === "system"
                              ? "bg-slate-100 text-slate-600 text-center"
                              : "bg-sky-50 border border-sky-100 mr-6"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-[10px] font-bold text-slate-500 mb-0.5">
                        <span>
                          {m.role === "user"
                            ? selectedSession.customerName || "Customer"
                            : m.role === "admin"
                              ? `${m.senderName || "Admin"} (Human)`
                              : m.role === "system"
                                ? "System"
                                : `INNOASSIST (${m.source || "ai"})`}
                        </span>
                        <span className="tabular-nums">
                          {new Date(m.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="text-[#14171A] whitespace-pre-line">{m.text}</div>
                    </div>
                  ))}
                </div>

                {/* Send Live Admin Reply */}
                <form onSubmit={handleSendAdminReply} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Send live specialist reply (automatically pauses AI)..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                  <button
                    type="submit"
                    disabled={sendingReply || !replyText.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold border-0 cursor-pointer disabled:opacity-50"
                  >
                    <FiSend />
                    <span>Send Live</span>
                  </button>
                </form>

                {/* Transfer / Internal Notes / History */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-2 rounded-xl border border-slate-200 bg-[#F8FAFC] p-3">
                    <div className="text-[11px] font-bold text-slate-600 uppercase">
                      Assign / Transfer Staff
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={assignEmail}
                        onChange={(e) => setAssignEmail(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                      >
                        <option value="">Select staff member...</option>
                        {staffList.map((st) => (
                          <option key={st.AdminId} value={st.Admin_Email}>
                            {st.Admin_Name} ({st.role})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleAssignStaff}
                        disabled={!assignEmail}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#22577A] text-white text-xs font-bold border-0 cursor-pointer disabled:opacity-50"
                      >
                        <FiUserCheck />
                        <span>Assign</span>
                      </button>
                    </div>
                    {contactHistory.length > 0 && (
                      <div className="pt-1 text-[11px] text-slate-600">
                        <strong>Prior Customer Sessions ({contactHistory.length}):</strong>
                        <ul className="list-disc pl-4 mt-1 mb-0 space-y-0.5">
                          {contactHistory.slice(0, 3).map((h) => (
                            <li key={h.sessionId}>
                              {h.detectedIntent} · {h.status} ({h.messageCount} msgs)
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 rounded-xl border border-slate-200 bg-[#F8FAFC] p-3">
                    <div className="text-[11px] font-bold text-slate-600 uppercase">
                      Internal Staff Notes ({selectedSession.internalNotes.length})
                    </div>
                    <form onSubmit={handleAddNote} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add private internal note..."
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
                      >
                        Save
                      </button>
                    </form>
                    <div className="space-y-1 max-h-[90px] overflow-y-auto">
                      {selectedSession.internalNotes.map((n) => (
                        <div key={n.id} className="text-[11px] text-slate-600">
                          <strong>{n.authorName}:</strong> {n.note}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">
                Select a conversation on the left to inspect transcript or join live support.
              </div>
            )}
          </div>
        </div>
      )}

      {/* STRUCTURED LEADS & RFQ SYNC */}
      {subView === "leads" && (
        <div className="space-y-3">
          {leads.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-xs text-slate-500">
              No structured project leads captured yet. Leads auto-populate as INNOASSIST collects customer & project info.
            </div>
          ) : (
            leads.map((lead) => (
              <div
                key={lead.id}
                className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-[#22577A] tabular-nums">
                      {lead.id}
                    </span>
                    <span className="text-sm font-bold text-[#14171A]">
                      {lead.fields.name || "Unnamed Prospect"}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        lead.isQualified
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-800"
                      }`}
                    >
                      {lead.isQualified ? "Qualified Lead" : "Potential Lead"}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">
                      {lead.language.toUpperCase()} · {lead.sourceIntent.replace(/_/g, " ")}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      aria-label={`Lead status ${lead.id}`}
                      value={lead.status}
                      onChange={(e) =>
                        handleUpdateLeadStage(lead.id, e.target.value as LeadStage)
                      }
                      className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold"
                    >
                      <option value="POTENTIAL">Potential</option>
                      <option value="QUALIFIED">Qualified</option>
                      <option value="RFQ_SYNCED">RFQ Synced</option>
                      <option value="CONTACTED">Contacted</option>
                      <option value="WON">Won</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                    <button
                      type="button"
                      disabled={Boolean(lead.rfqId)}
                      onClick={() => handleSyncLeadToRfq(lead.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#22577A] text-white text-xs font-bold border-0 cursor-pointer disabled:opacity-50"
                    >
                      <FiCheckCircle />
                      <span>{lead.rfqId ? `Synced RFQ #${lead.rfqId}` : "Sync to RFQ"}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs text-slate-600">
                  <div>
                    <strong>Company:</strong> {lead.fields.company || "—"}
                  </div>
                  <div>
                    <strong>Phone:</strong> {lead.fields.contactNumber || "—"}
                  </div>
                  <div>
                    <strong>Email:</strong> {lead.fields.email || "—"}
                  </div>
                  <div>
                    <strong>Service:</strong> {lead.fields.requiredService || "—"}
                  </div>
                  <div>
                    <strong>Location:</strong> {lead.fields.projectLocation || "—"}
                  </div>
                  <div>
                    <strong>Dimensions / Qty:</strong>{" "}
                    {[lead.fields.dimensions, lead.fields.approximateQuantity]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </div>
                  <div>
                    <strong>Timeline:</strong> {lead.fields.expectedTimeline || "—"}
                  </div>
                  <div>
                    <strong>Session Ref:</strong> {lead.sessionId}
                  </div>
                </div>

                {lead.fields.projectDescription && (
                  <div className="text-xs text-slate-600">
                    <strong>Scope:</strong> {lead.fields.projectDescription}
                  </div>
                )}

                {lead.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {lead.attachments.map((att) => (
                      <a
                        key={att.id}
                        href={att.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-50 border border-sky-200 text-[#22577A] text-[11px] font-semibold no-underline"
                      >
                        <FiPaperclip />
                        <span>{att.fileName}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
