"use client";
import { useState, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/shared/DashboardLayout";
import {
  Sparkles, RefreshCw, ChevronDown, ChevronUp,
  TrendingUp, TrendingDown, Target, AlertTriangle,
  Brain, Zap, Calendar, DollarSign,
} from "lucide-react";
import { toast } from "sonner";

// Map section headers to icons and colors
const SECTION_META: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  "Financial Health Score": { icon: <DollarSign className="w-5 h-5" />, color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20" },
  "Spending Analysis": { icon: <TrendingDown className="w-5 h-5" />, color: "text-red-500", bg: "bg-red-500/10 border-red-500/20" },
  "Goals Strategy": { icon: <Target className="w-5 h-5" />, color: "text-purple-500", bg: "bg-purple-500/10 border-purple-500/20" },
  "Investment Recommendations": { icon: <TrendingUp className="w-5 h-5" />, color: "text-green-500", bg: "bg-green-500/10 border-green-500/20" },
  "Risk Alerts": { icon: <AlertTriangle className="w-5 h-5" />, color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20" },
  "30-Day Action Plan": { icon: <Calendar className="w-5 h-5" />, color: "text-indigo-500", bg: "bg-indigo-500/10 border-indigo-500/20" },
};

function getSectionMeta(title: string) {
  const key = Object.keys(SECTION_META).find((k) => title.includes(k));
  return key ? SECTION_META[key] : { icon: <Sparkles className="w-5 h-5" />, color: "text-primary", bg: "bg-primary/10 border-primary/20" };
}

interface Section { title: string; content: string }

function parseIntoSections(raw: string): Section[] {
  const lines = raw.split("\n");
  const sections: Section[] = [];
  let current: Section | null = null;

  for (const line of lines) {
    const headerMatch = line.match(/^##\s+(.+)/);
    if (headerMatch) {
      if (current) sections.push(current);
      current = { title: headerMatch[1].replace(/^[^\w]+/, "").trim(), content: "" };
    } else if (current) {
      current.content += line + "\n";
    }
  }
  if (current) sections.push(current);
  return sections;
}

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    // Bold
    line = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Inline code
    line = line.replace(/`(.+?)`/g, '<code class="bg-muted px-1 rounded text-xs font-mono">$1</code>');

    if (/^###\s/.test(line)) {
      return <h4 key={i} className="font-semibold text-sm mt-3 mb-1" dangerouslySetInnerHTML={{ __html: line.replace(/^###\s/, "") }} />;
    }
    if (/^- /.test(line) || /^\* /.test(line)) {
      return (
        <li key={i} className="flex gap-2 text-sm leading-relaxed ml-2">
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-current shrink-0 opacity-60" />
          <span dangerouslySetInnerHTML={{ __html: line.replace(/^[-*] /, "") }} />
        </li>
      );
    }
    if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\./)?.[1];
      return (
        <li key={i} className="flex gap-2 text-sm leading-relaxed ml-2">
          <span className="shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">{num}</span>
          <span dangerouslySetInnerHTML={{ __html: line.replace(/^\d+\.\s/, "") }} />
        </li>
      );
    }
    if (line.trim() === "") return <div key={i} className="h-2" />;
    return <p key={i} className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: line }} />;
  });
}

function SectionCard({ section, index }: { section: Section; index: number }) {
  const [open, setOpen] = useState(true);
  const meta = getSectionMeta(section.title);

  return (
    <div className={`rounded-xl border ${meta.bg} overflow-hidden`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span className={meta.color}>{meta.icon}</span>
          <h3 className="font-semibold text-sm">{section.title}</h3>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-1">
          <ul className="space-y-1">
            {renderMarkdown(section.content.trim())}
          </ul>
        </div>
      )}
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex gap-1 items-center py-2">
      {[0, 1, 2].map((i) => (
        <span key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  );
}

export default function AIPage() {
  const [loading, setLoading] = useState(false);
  const [raw, setRaw] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  const [streamDone, setStreamDone] = useState(false);
  const rawRef = useRef("");
  const abortRef = useRef<AbortController | null>(null);

  const run = async () => {
    if (loading) {
      abortRef.current?.abort();
      return;
    }
    setLoading(true);
    setRaw("");
    setSections([]);
    setStreamDone(false);
    rawRef.current = "";
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "full" }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error || "AI analysis failed");
        setLoading(false);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        rawRef.current += chunk;
        setRaw(rawRef.current);
        setSections(parseIntoSections(rawRef.current));
      }

      setStreamDone(true);
    } catch (e: any) {
      if (e.name !== "AbortError") toast.error("Analysis interrupted");
    } finally {
      setLoading(false);
    }
  };

  // Auto-run on first load
  useEffect(() => { run(); }, []);

  return (
    <DashboardLayout title="AI Financial Advisor">
      <div className="max-w-3xl space-y-4">

        {/* Header card */}
        <div className="rounded-xl border bg-gradient-to-br from-primary/10 via-purple-500/5 to-background p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                <Brain className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold">AI Financial Advisor</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Real-time analysis of your finances powered by Claude AI. Fully personalized to your actual spending, goals, and investments.
                </p>
              </div>
            </div>
            <button
              onClick={run}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-70 shrink-0"
            >
              {loading
                ? <RefreshCw className="w-4 h-4 animate-spin" />
                : <Zap className="w-4 h-4" />}
              {loading ? "Analyzing…" : "Refresh Analysis"}
            </button>
          </div>

          {/* Live stream indicator */}
          {loading && !streamDone && (
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <TypingDots />
              <span>Claude is analyzing your {["spending patterns", "investment opportunities", "goal timelines", "risk factors"][Math.floor(Date.now() / 3000) % 4]}…</span>
            </div>
          )}
          {streamDone && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-green-500">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Analysis complete · Based on your last 3 months of data
            </div>
          )}
        </div>

        {/* Streaming raw text while sections are building */}
        {loading && sections.length === 0 && raw && (
          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">{raw}</p>
          </div>
        )}

        {/* Rendered sections */}
        {sections.map((s, i) => (
          <SectionCard key={i} section={s} index={i} />
        ))}

        {/* Empty state */}
        {!loading && sections.length === 0 && !raw && (
          <div className="rounded-xl border bg-card p-12 text-center">
            <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
            <p className="text-muted-foreground text-sm">Click "Refresh Analysis" to get your personalized financial insights.</p>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center pb-4">
          AI analysis is for educational purposes. Consult a SEBI-registered advisor for investment decisions.
        </p>
      </div>
    </DashboardLayout>
  );
}
