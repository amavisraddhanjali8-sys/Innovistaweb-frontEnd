import { useState, type FormEvent } from "react";
import { FiArrowDown, FiArrowUp, FiEdit2, FiPlus, FiSave, FiTrash2 } from "react-icons/fi";
import AxiosConfig from "../../Context/AxiosConfig";
import type {
  LeadDataFields,
  RichChatIntent,
  WorkflowStep,
  WorkflowStepInputType,
} from "../../../../shared/chatbotHelpers";
import type { ChatbotWorkflow } from "./types";

interface WorkflowsTabProps {
  workflows: ChatbotWorkflow[];
  onWorkflowsChange: (next: ChatbotWorkflow[]) => void;
  onNotify: (msg: string) => void;
}

const INTENT_OPTIONS: RichChatIntent[] = [
  "general_inquiry",
  "service_discovery",
  "aluminium_fabrication",
  "glass_solutions",
  "steel_fabrication",
  "construction_inquiry",
  "quotation_request",
  "project_inquiry",
  "technical_inquiry",
  "supplier_registration",
  "customer_complaint",
  "consultation_request",
  "human_assistance",
  "site_visit",
];

const FIELD_KEY_OPTIONS: Array<{ value: keyof LeadDataFields | "custom_note"; label: string }> = [
  { value: "name", label: "Customer Name" },
  { value: "company", label: "Company" },
  { value: "contactNumber", label: "Contact Number" },
  { value: "email", label: "Email" },
  { value: "requiredService", label: "Required Service" },
  { value: "projectDescription", label: "Project Description" },
  { value: "projectLocation", label: "Project Location" },
  { value: "approximateQuantity", label: "Approximate Quantity" },
  { value: "dimensions", label: "Dimensions" },
  { value: "availableDrawings", label: "Available Drawings" },
  { value: "expectedTimeline", label: "Expected Timeline" },
  { value: "additionalRequirements", label: "Additional Requirements" },
  { value: "custom_note", label: "Custom Note" },
];

export default function WorkflowsTab({
  workflows,
  onWorkflowsChange,
  onNotify,
}: WorkflowsTabProps) {
  const [selectedId, setSelectedId] = useState<string>(workflows[0]?.id || "");
  const [draft, setDraft] = useState<ChatbotWorkflow | null>(() =>
    workflows[0] ? { ...workflows[0], steps: workflows[0].steps.map((s) => ({ ...s })) } : null
  );
  const [saving, setSaving] = useState(false);

  const selectWorkflow = (wf: ChatbotWorkflow) => {
    setSelectedId(wf.id);
    setDraft({
      ...wf,
      triggerKeywords: [...wf.triggerKeywords],
      steps: wf.steps.map((s) => ({
        ...s,
        quickReplies: [...(s.quickReplies || [])],
        branchRules: [...(s.branchRules || [])],
      })),
    });
  };

  const handleNewWorkflow = () => {
    const newWf: ChatbotWorkflow = {
      id: `wf-custom-${Date.now().toString(36)}`,
      name: "New Custom Workflow",
      intent: "general_inquiry",
      category: "Custom",
      description: "",
      enabled: true,
      priority: 6,
      triggerKeywords: ["custom"],
      steps: [
        {
          id: `step-${Date.now().toString(36)}`,
          fieldKey: "requiredService",
          label: "Required Service",
          prompt: "How can we assist with your project?",
          inputType: "text",
          required: true,
          quickReplies: [],
          skipIfCollected: true,
        },
      ],
      completionAction: "create_lead",
      completionMessage: "Thank you! Your inquiry details have been recorded for our team.",
      updatedAt: new Date().toISOString(),
    };
    setSelectedId(newWf.id);
    setDraft(newWf);
  };

  const handleToggleEnabled = async (wf: ChatbotWorkflow) => {
    const res = await AxiosConfig.post<{ workflows: ChatbotWorkflow[] }>(
      "/api/chatbot/workflows",
      { ...wf, enabled: !wf.enabled }
    );
    onWorkflowsChange(res.data.workflows || []);
    if (draft && draft.id === wf.id) {
      setDraft({ ...draft, enabled: !wf.enabled });
    }
    onNotify(`Workflow "${wf.name}" ${!wf.enabled ? "enabled" : "paused"}.`);
  };

  const handleSaveWorkflow = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft || !draft.name.trim()) return;
    setSaving(true);
    try {
      const res = await AxiosConfig.post<{ workflows: ChatbotWorkflow[] }>(
        "/api/chatbot/workflows",
        draft
      );
      onWorkflowsChange(res.data.workflows || []);
      onNotify(`Workflow "${draft.name}" saved.`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWorkflow = async (id: string) => {
    const res = await AxiosConfig.delete<{ workflows: ChatbotWorkflow[] }>(
      `/api/chatbot/workflows/${encodeURIComponent(id)}`
    );
    const next = res.data.workflows || [];
    onWorkflowsChange(next);
    if (next[0]) selectWorkflow(next[0]);
    else setDraft(null);
    onNotify("Workflow deleted.");
  };

  const updateStep = (idx: number, patch: Partial<WorkflowStep>) => {
    if (!draft) return;
    const nextSteps = draft.steps.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    setDraft({ ...draft, steps: nextSteps });
  };

  const moveStep = (idx: number, dir: -1 | 1) => {
    if (!draft) return;
    const target = idx + dir;
    if (target < 0 || target >= draft.steps.length) return;
    const nextSteps = [...draft.steps];
    const [removed] = nextSteps.splice(idx, 1);
    nextSteps.splice(target, 0, removed);
    setDraft({ ...draft, steps: nextSteps });
  };

  const addStep = () => {
    if (!draft) return;
    setDraft({
      ...draft,
      steps: [
        ...draft.steps,
        {
          id: `step-${Date.now().toString(36)}`,
          fieldKey: "additionalRequirements",
          label: "New Question",
          prompt: "Please share any additional requirements.",
          inputType: "text",
          required: false,
          quickReplies: [],
          skipIfCollected: true,
        },
      ],
    });
  };

  const removeStep = (idx: number) => {
    if (!draft) return;
    setDraft({
      ...draft,
      steps: draft.steps.filter((_, i) => i !== idx),
    });
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
      {/* Workflow List */}
      <div className="xl:col-span-4 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-bold text-[#14171A] uppercase tracking-wider">
            Configured Workflows ({workflows.length})
          </div>
          <button
            type="button"
            onClick={handleNewWorkflow}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#22577A] text-white text-[11px] font-bold border-0 cursor-pointer"
          >
            <FiPlus />
            <span>New</span>
          </button>
        </div>

        <div className="space-y-1.5 max-h-[680px] overflow-y-auto pr-1">
          {workflows.map((wf) => (
            <div
              key={wf.id}
              onClick={() => selectWorkflow(wf)}
              className={`rounded-xl border p-3 cursor-pointer transition-colors space-y-1 ${
                selectedId === wf.id
                  ? "border-[#22577A] bg-sky-50/70"
                  : "border-slate-200 bg-white hover:border-[#3393B8]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#14171A] truncate">{wf.name}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleEnabled(wf);
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer shrink-0 ${
                    wf.enabled
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-slate-100 border-slate-200 text-slate-500"
                  }`}
                >
                  {wf.enabled ? "Active" : "Off"}
                </button>
              </div>
              <div className="text-[10.5px] text-slate-500 flex items-center justify-between gap-2">
                <span>
                  {wf.category} · {wf.steps.length} steps
                </span>
                <span className="text-[#22577A] font-semibold">{wf.completionAction}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Workflow Editor */}
      <div className="xl:col-span-8">
        {draft ? (
          <form
            onSubmit={handleSaveWorkflow}
            className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#14171A] uppercase tracking-wider">
                <FiEdit2 className="text-[#22577A]" />
                <span>Edit Workflow Without Code</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDeleteWorkflow(draft.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-[#E60000] text-[11px] font-bold text-slate-600 hover:text-[#E60000] cursor-pointer"
                >
                  <FiTrash2 />
                  <span>Delete</span>
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#22577A] text-white text-xs font-bold border-0 cursor-pointer"
                >
                  <FiSave />
                  <span>{saving ? "Saving..." : "Save Workflow"}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10.5px] font-bold text-slate-500 mb-1">
                  Workflow Name
                </label>
                <input
                  type="text"
                  required
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10.5px] font-bold text-slate-500 mb-1">
                  Mapped Intent
                </label>
                <select
                  value={draft.intent}
                  onChange={(e) =>
                    setDraft({ ...draft, intent: e.target.value as RichChatIntent })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                >
                  {INTENT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10.5px] font-bold text-slate-500 mb-1">
                  Completion Action
                </label>
                <select
                  value={draft.completionAction}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      completionAction: e.target.value as ChatbotWorkflow["completionAction"],
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                >
                  <option value="create_lead">Create Lead</option>
                  <option value="create_rfq">Create Lead & Sync RFQ</option>
                  <option value="request_handover">Request Human Handover</option>
                  <option value="book_visit">Prompt Site Visit Booking</option>
                  <option value="summary_only">Summary Reply Only</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10.5px] font-bold text-slate-500 mb-1">
                  Trigger Keywords (comma-separated)
                </label>
                <input
                  type="text"
                  value={draft.triggerKeywords.join(", ")}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      triggerKeywords: e.target.value
                        .split(",")
                        .map((k) => k.trim())
                        .filter(Boolean),
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-[10.5px] font-bold text-slate-500 mb-1">
                  Priority (1-10)
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={draft.priority}
                  onChange={(e) =>
                    setDraft({ ...draft, priority: Number(e.target.value) || 5 })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold tabular-nums"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10.5px] font-bold text-slate-500 mb-1">
                Completion Confirmation Message
              </label>
              <textarea
                rows={2}
                value={draft.completionMessage}
                onChange={(e) => setDraft({ ...draft, completionMessage: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs resize-none"
              />
            </div>

            {/* Steps Builder */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] font-bold text-slate-600 uppercase">
                  Question Steps & Validation ({draft.steps.length})
                </div>
                <button
                  type="button"
                  onClick={addStep}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#22577A] text-[#22577A] text-[11px] font-bold bg-white cursor-pointer"
                >
                  <FiPlus />
                  <span>Add Step</span>
                </button>
              </div>

              {draft.steps.map((step, idx) => (
                <div
                  key={step.id}
                  className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-3 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-[#22577A]">
                      Step {idx + 1}: {step.label}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveStep(idx, -1)}
                        disabled={idx === 0}
                        className="p-1 rounded border border-slate-200 bg-white text-slate-600 cursor-pointer disabled:opacity-40"
                      >
                        <FiArrowUp className="text-[11px]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveStep(idx, 1)}
                        disabled={idx === draft.steps.length - 1}
                        className="p-1 rounded border border-slate-200 bg-white text-slate-600 cursor-pointer disabled:opacity-40"
                      >
                        <FiArrowDown className="text-[11px]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeStep(idx)}
                        className="p-1 rounded border border-slate-200 bg-white text-slate-500 hover:text-[#E60000] cursor-pointer"
                      >
                        <FiTrash2 className="text-[11px]" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <select
                      value={step.fieldKey}
                      onChange={(e) =>
                        updateStep(idx, {
                          fieldKey: e.target.value as keyof LeadDataFields | "custom_note",
                        })
                      }
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold"
                    >
                      {FIELD_KEY_OPTIONS.map((fk) => (
                        <option key={fk.value} value={fk.value}>
                          {fk.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Field label"
                      value={step.label}
                      onChange={(e) => updateStep(idx, { label: e.target.value })}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                    />
                    <select
                      value={step.inputType}
                      onChange={(e) =>
                        updateStep(idx, { inputType: e.target.value as WorkflowStepInputType })
                      }
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold"
                    >
                      <option value="text">Text</option>
                      <option value="choice">Choice / Quick Replies</option>
                      <option value="phone">Phone Validation</option>
                      <option value="email">Email Validation</option>
                      <option value="number">Number Validation</option>
                      <option value="multiline">Multiline Description</option>
                      <option value="file">File Upload</option>
                    </select>
                  </div>

                  <input
                    type="text"
                    placeholder="Question prompt shown to customer..."
                    value={step.prompt}
                    onChange={(e) => updateStep(idx, { prompt: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Quick reply buttons (comma-separated)"
                      value={(step.quickReplies || []).join(", ")}
                      onChange={(e) =>
                        updateStep(idx, {
                          quickReplies: e.target.value
                            .split(",")
                            .map((r) => r.trim())
                            .filter(Boolean),
                        })
                      }
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                    />
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
                      <label className="inline-flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={step.required}
                          onChange={(e) => updateStep(idx, { required: e.target.checked })}
                        />
                        <span>Required</span>
                      </label>
                      <label className="inline-flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={step.skipIfCollected}
                          onChange={(e) =>
                            updateStep(idx, { skipIfCollected: e.target.checked })
                          }
                        />
                        <span>Skip if already collected</span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </form>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">
            Select a workflow on the left or click New to create one.
          </div>
        )}
      </div>
    </div>
  );
}
