import { useState, type FormEvent } from "react";
import { FiRefreshCw, FiSave, FiSend } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import AxiosConfig from "../../Context/AxiosConfig";
import type {
  AiOperatingMode,
  ChatbotConfig,
  PersonalityTone,
  ResponseLengthMode,
  SupportedLanguage,
} from "../../../../shared/chatbotHelpers";
import type { AiUsageLedger, ConfigHistoryEntry } from "./types";

interface SetupAndSecurityTabProps {
  config: ChatbotConfig;
  configHistory: ConfigHistoryEntry[];
  aiUsage: AiUsageLedger | null;
  onConfigChange: (next: ChatbotConfig) => void;
  onHistoryChange: (next: ConfigHistoryEntry[]) => void;
  onNotify: (msg: string) => void;
}

export default function SetupAndSecurityTab({
  config,
  configHistory,
  aiUsage,
  onConfigChange,
  onHistoryChange,
  onNotify,
}: SetupAndSecurityTabProps) {
  const [quickPromptsText, setQuickPromptsText] = useState(
    config.quickPrompts.join(", ")
  );
  const [restrictedTopicsText, setRestrictedTopicsText] = useState(
    config.restrictedTopics.join(", ")
  );
  const [changeSummary, setChangeSummary] = useState("");
  const [saving, setSaving] = useState(false);

  // Live Simulator State
  const [testInput, setTestInput] = useState("");
  const [testLang, setTestLang] = useState<SupportedLanguage>("en");
  const [testResult, setTestResult] = useState<{
    reply: string;
    source?: string;
    intent?: string;
    confidence?: number;
    creditSaved?: boolean;
    whatsappUrl?: string;
  } | null>(null);
  const [testing, setTesting] = useState(false);

  const toggleLanguage = (code: SupportedLanguage) => {
    const exists = config.supportedLanguages.includes(code);
    const next = exists
      ? config.supportedLanguages.filter((l) => l !== code)
      : [...config.supportedLanguages, code];
    if (next.length === 0) return;
    onConfigChange({ ...config, supportedLanguages: next });
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...config,
        quickPrompts: quickPromptsText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        restrictedTopics: restrictedTopicsText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        changeSummary: changeSummary.trim() || "Updated INNOASSIST configuration",
      };
      const res = await AxiosConfig.put<{
        config: ChatbotConfig;
        configHistory: ConfigHistoryEntry[];
      }>("/api/chatbot/config", payload);
      if (res.data?.config) onConfigChange(res.data.config);
      if (res.data?.configHistory) onHistoryChange(res.data.configHistory);
      setChangeSummary("");
      onNotify("Chatbot AI, credit guard & security settings saved.");
    } finally {
      setSaving(false);
    }
  };

  const handleClearCache = async () => {
    await AxiosConfig.post("/api/chatbot/ai-cache/clear");
    onNotify("AI response cache cleared.");
  };

  const handleTest = async (e: FormEvent) => {
    e.preventDefault();
    if (!testInput.trim()) return;
    setTesting(true);
    try {
      const res = await AxiosConfig.post("/api/chatbot/ask", {
        message: testInput.trim(),
        language: testLang,
      });
      setTestResult(res.data);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
      <form onSubmit={handleSave} className="xl:col-span-7 space-y-4">
        {/* Visibility & Core Identity */}
        <div className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#14171A] uppercase">
              Widget, Tone &amp; Languages
            </span>
            <button
              type="button"
              onClick={() => onConfigChange({ ...config, enabled: !config.enabled })}
              className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer border ${
                config.enabled
                  ? "bg-emerald-600 border-emerald-600 text-white"
                  : "bg-white border-slate-300 text-slate-600"
              }`}
            >
              {config.enabled ? "Widget Live" : "Widget Paused"}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10.5px] font-bold text-slate-500 mb-1">
                Assistant Name
              </label>
              <input
                type="text"
                value={config.assistantName}
                onChange={(e) =>
                  onConfigChange({ ...config, assistantName: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
              />
            </div>
            <div>
              <label className="block text-[10.5px] font-bold text-slate-500 mb-1">
                Personality Tone
              </label>
              <select
                value={config.personalityTone}
                onChange={(e) =>
                  onConfigChange({
                    ...config,
                    personalityTone: e.target.value as PersonalityTone,
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold"
              >
                <option value="professional">Professional</option>
                <option value="friendly">Warm &amp; Friendly</option>
                <option value="technical">Engineering / Technical</option>
                <option value="concise">Ultra Concise</option>
              </select>
            </div>
            <div>
              <label className="block text-[10.5px] font-bold text-slate-500 mb-1">
                Response Length
              </label>
              <select
                value={config.responseLength}
                onChange={(e) =>
                  onConfigChange({
                    ...config,
                    responseLength: e.target.value as ResponseLengthMode,
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold"
              >
                <option value="short">Short (1-2 sentences)</option>
                <option value="balanced">Balanced (2-3 sentences)</option>
                <option value="detailed">Detailed (3-5 sentences)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-[10.5px] font-bold text-slate-500 mb-1">
                Accent Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.accentColor || "#0A74C9"}
                  onChange={(e) =>
                    onConfigChange({ ...config, accentColor: e.target.value })
                  }
                  className="h-9 w-12 rounded border border-slate-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={config.accentColor || "#0A74C9"}
                  onChange={(e) =>
                    onConfigChange({ ...config, accentColor: e.target.value })
                  }
                  className="flex-1 px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs tabular-nums"
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <div className="text-[10.5px] font-bold text-slate-500 mb-1">
                Supported Languages
              </div>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { code: "en", label: "English" },
                    { code: "si", label: "Sinhala (සිංහල)" },
                    { code: "ta", label: "Tamil (தமிழ்)" },
                  ] as const
                ).map((item) => (
                  <label
                    key={item.code}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={config.supportedLanguages.includes(item.code)}
                      onChange={() => toggleLanguage(item.code)}
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="WhatsApp Button Label"
              value={config.whatsappTriggerLabel}
              onChange={(e) =>
                onConfigChange({ ...config, whatsappTriggerLabel: e.target.value })
              }
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
            />
            <input
              type="text"
              placeholder="WhatsApp Prefill Prefix"
              value={config.defaultWhatsappPrefix}
              onChange={(e) =>
                onConfigChange({ ...config, defaultWhatsappPrefix: e.target.value })
              }
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
            />
          </div>

          <div>
            <label className="block text-[10.5px] font-bold text-slate-500 mb-1">
              Quick Prompts (comma-separated)
            </label>
            <input
              type="text"
              value={quickPromptsText}
              onChange={(e) => setQuickPromptsText(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
            />
          </div>

          <div>
            <label className="block text-[10.5px] font-bold text-slate-500 mb-1">
              System Instructions (Guardrails &amp; Brand Rules)
            </label>
            <textarea
              rows={3}
              value={config.systemInstructions}
              onChange={(e) =>
                onConfigChange({ ...config, systemInstructions: e.target.value })
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs resize-y"
            />
          </div>
        </div>

        {/* Multilingual Welcome & Fallback Messages */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5">
          <div className="text-xs font-bold text-[#14171A] uppercase">
            Localized Welcome &amp; Fallback Messages
          </div>
          {(["en", "si", "ta"] as const).map((lang) => (
            <div key={lang} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder={`Welcome (${lang.toUpperCase()})`}
                value={config.localizedWelcome?.[lang] || ""}
                onChange={(e) =>
                  onConfigChange({
                    ...config,
                    welcomeMessage:
                      lang === "en" ? e.target.value : config.welcomeMessage,
                    localizedWelcome: {
                      ...config.localizedWelcome,
                      [lang]: e.target.value,
                    },
                  })
                }
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
              />
              <input
                type="text"
                placeholder={`Fallback (${lang.toUpperCase()})`}
                value={config.localizedFallback?.[lang] || ""}
                onChange={(e) =>
                  onConfigChange({
                    ...config,
                    localizedFallback: {
                      ...config.localizedFallback,
                      [lang]: e.target.value,
                    },
                  })
                }
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
              />
            </div>
          ))}
        </div>

        {/* AI Credit Protection & Thresholds */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-emerald-900 uppercase">
              AI Credit Protection &amp; Retrieval Thresholds
            </span>
            <button
              type="button"
              onClick={handleClearCache}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-emerald-300 bg-white text-[11px] font-bold text-emerald-800 cursor-pointer"
            >
              <FiRefreshCw className="text-[11px]" />
              <span>Clear AI Cache</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10.5px] font-bold text-slate-600 mb-1">
                AI Operating Mode
              </label>
              <select
                value={config.aiMode}
                onChange={(e) =>
                  onConfigChange({ ...config, aiMode: e.target.value as AiOperatingMode })
                }
                className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold"
              >
                <option value="hybrid_credit_saver">Hybrid Credit Saver (Recommended)</option>
                <option value="local_only">Local Only (0 AI Credits Used)</option>
                <option value="ai_first">AI Assisted Priority</option>
              </select>
            </div>
            <div>
              <label className="block text-[10.5px] font-bold text-slate-600 mb-1">
                Daily AI Call Budget
              </label>
              <input
                type="number"
                min={0}
                max={5000}
                value={config.dailyAiCallLimit}
                onChange={(e) =>
                  onConfigChange({
                    ...config,
                    dailyAiCallLimit: Number(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[10.5px] font-bold text-slate-600 mb-1">
                Session AI Cooldown (sec)
              </label>
              <input
                type="number"
                min={0}
                max={120}
                value={config.aiCooldownSeconds}
                onChange={(e) =>
                  onConfigChange({
                    ...config,
                    aiCooldownSeconds: Number(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10.5px] font-bold text-slate-600 mb-1">
                KB Match Score
              </label>
              <input
                type="number"
                step={0.2}
                min={1}
                max={10}
                value={config.knowledgeMatchThreshold}
                onChange={(e) =>
                  onConfigChange({
                    ...config,
                    knowledgeMatchThreshold: Number(e.target.value) || 3.4,
                  })
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[10.5px] font-bold text-slate-600 mb-1">
                AI Confidence Min
              </label>
              <input
                type="number"
                step={0.05}
                min={0.1}
                max={0.95}
                value={config.aiConfidenceThreshold}
                onChange={(e) =>
                  onConfigChange({
                    ...config,
                    aiConfidenceThreshold: Number(e.target.value) || 0.55,
                  })
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[10.5px] font-bold text-slate-600 mb-1">
                Cache TTL (min)
              </label>
              <input
                type="number"
                min={5}
                max={10080}
                value={config.cacheTtlMinutes}
                onChange={(e) =>
                  onConfigChange({
                    ...config,
                    cacheTtlMinutes: Number(e.target.value) || 720,
                  })
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[10.5px] font-bold text-slate-600 mb-1">
                Memory Turns
              </label>
              <input
                type="number"
                min={2}
                max={20}
                value={config.memoryWindowTurns}
                onChange={(e) =>
                  onConfigChange({
                    ...config,
                    memoryWindowTurns: Number(e.target.value) || 8,
                  })
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs tabular-nums"
              />
            </div>
          </div>

          {aiUsage && (
            <div className="text-[11px] text-emerald-800">
              Today&apos;s meter: <strong>{aiUsage.geminiCallsToday}</strong> /{" "}
              {config.dailyAiCallLimit} AI calls · <strong>{aiUsage.cacheHitsToday}</strong> cache
              hits · <strong>{aiUsage.localZeroCreditHitsToday}</strong> local hits
            </div>
          )}
        </div>

        {/* Security, Handover, Retention & Notifications */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="text-xs font-bold text-[#14171A] uppercase">
            Lead Rules, Handover, Security &amp; Retention
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-slate-700">
            {[
              { key: "leadCollectionEnabled", label: "Auto Lead Capture" },
              { key: "handoverEnabled", label: "Human Handover" },
              { key: "enableResponseCache", label: "Smart AI Cache" },
              { key: "enableFileUploads", label: "Customer File Uploads" },
              { key: "enableFeedbackRating", label: "CSAT Star Rating" },
              { key: "notifyOnHandover", label: "Notify on Handover" },
              { key: "notifyOnLead", label: "Notify on Qualified Lead" },
              { key: "notifyOnUnanswered", label: "Notify on Unanswered" },
            ].map((toggle) => (
              <label key={toggle.key} className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(config[toggle.key as keyof ChatbotConfig])}
                  onChange={(e) =>
                    onConfigChange({
                      ...config,
                      [toggle.key]: e.target.checked,
                    })
                  }
                />
                <span>{toggle.label}</span>
              </label>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10.5px] font-bold text-slate-500 mb-1">
                Auto-Escalate After Unanswered Count
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={config.autoEscalateAfterFallbacks}
                onChange={(e) =>
                  onConfigChange({
                    ...config,
                    autoEscalateAfterFallbacks: Number(e.target.value) || 2,
                  })
                }
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[10.5px] font-bold text-slate-500 mb-1">
                Session Retention (Days)
              </label>
              <input
                type="number"
                min={7}
                max={3650}
                value={config.retentionDays}
                onChange={(e) =>
                  onConfigChange({
                    ...config,
                    retentionDays: Number(e.target.value) || 90,
                  })
                }
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10.5px] font-bold text-slate-500 mb-1">
              Restricted Topics (comma-separated — blocked before AI runs)
            </label>
            <input
              type="text"
              value={restrictedTopicsText}
              onChange={(e) => setRestrictedTopicsText(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <input
              type="text"
              placeholder="Optional change note for audit history..."
              value={changeSummary}
              onChange={(e) => setChangeSummary(e.target.value)}
              className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border border-slate-200 text-xs"
            />
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#22577A] hover:bg-[#19435E] text-white text-xs font-bold border-0 cursor-pointer"
            >
              <FiSave />
              <span>{saving ? "Saving..." : "Save Configuration"}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Right: Live Simulator & Config Audit History */}
      <div className="xl:col-span-5 space-y-4">
        <div className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-4 space-y-3">
          <div className="text-xs font-bold text-[#14171A] uppercase tracking-wider">
            Live Engine Simulator
          </div>
          <form onSubmit={handleTest} className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ask with typos, multi-questions, Sinhala/Tamil..."
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs"
              />
              <select
                value={testLang}
                onChange={(e) => setTestLang(e.target.value as SupportedLanguage)}
                className="px-2 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold"
              >
                <option value="en">EN</option>
                <option value="si">SI</option>
                <option value="ta">TA</option>
              </select>
              <button
                type="submit"
                disabled={testing}
                aria-label="Send test"
                className="px-3.5 py-2 rounded-lg bg-[#22577A] text-white text-xs font-bold cursor-pointer border-0"
              >
                <FiSend />
              </button>
            </div>
          </form>

          {testResult && (
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2 text-xs text-slate-800">
              <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
                <span className="px-2 py-0.5 rounded bg-sky-50 text-[#22577A]">
                  Source: {testResult.source}
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                  Intent: {testResult.intent}
                </span>
                <span
                  className={`px-2 py-0.5 rounded ${
                    testResult.creditSaved
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-800"
                  }`}
                >
                  {testResult.creditSaved ? "0 AI Credits Used" : "Gemini AI Used"}
                </span>
              </div>
              <div className="whitespace-pre-line leading-relaxed">{testResult.reply}</div>
              {testResult.whatsappUrl && (
                <a
                  href={testResult.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-anim-fx inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold no-underline"
                >
                  <FaWhatsapp />
                  <span>WhatsApp</span>
                </a>
              )}
            </div>
          )}
        </div>

        {/* Configuration Change History */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5">
          <div className="text-xs font-bold text-[#14171A] uppercase tracking-wider">
            Configuration History ({configHistory.length})
          </div>
          {configHistory.length === 0 ? (
            <div className="text-xs text-slate-400">No configuration edits recorded yet.</div>
          ) : (
            <div className="space-y-2 max-h-[360px] overflow-y-auto">
              {configHistory.slice(0, 12).map((h) => (
                <div
                  key={h.id}
                  className="rounded-lg border border-slate-100 bg-[#F8FAFC] px-3 py-2 text-[11px] space-y-0.5"
                >
                  <div className="font-bold text-[#14171A]">{h.summary}</div>
                  <div className="text-slate-500">
                    {h.changedBy} · {new Date(h.changedAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
