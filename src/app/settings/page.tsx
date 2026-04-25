"use client";
import { DashboardLayout } from "@/components/shared/DashboardLayout";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUser } from "@/lib/session";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  User,
  Bell,
  Palette,
  Shield,
  Database,
  LogOut,
  Save,
  KeyRound,
  Eye,
  EyeOff,
  Loader2,
  Smartphone,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react";

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SGD", "AUD"];

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasPassword, setHasPassword] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [settingPassword, setSettingPassword] = useState(false);
  const [smsToken, setSmsToken] = useState<string | null>(null);
  const [smsTokenLoading, setSmsTokenLoading] = useState(false);
  const [smsTokenCopied, setSmsTokenCopied] = useState(false);
  const [smsLogs, setSmsLogs] = useState<any[]>([]);
  const [smsLogsLoading, setSmsLogsLoading] = useState(false);
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const user = await getCurrentUser();
      if (user) {
        setHasPassword(user.has_password ?? true);
        const { data: p } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        setProfile(p ?? { email: user.email, full_name: user.full_name });
      }
      setLoading(false);
      // Load existing SMS token
      const tokenRes = await fetch("/api/sms-token");
      if (tokenRes.ok) {
        const j = await tokenRes.json();
        setSmsToken(j.token);
        if (j.token) fetchSmsLogs(j.token);
      }
    })();
  }, []);

  const generateSmsToken = async () => {
    setSmsTokenLoading(true);
    const res = await fetch("/api/sms-token", { method: "POST" });
    const j = await res.json();
    setSmsTokenLoading(false);
    if (res.ok) {
      setSmsToken(j.token);
      toast.success("New webhook token generated");
    } else {
      toast.error(j.error || "Failed to generate token");
    }
  };

  const fetchSmsLogs = async (token: string) => {
    setSmsLogsLoading(true);
    try {
      const res = await fetch(`/api/sms-webhook?token=${token}`);
      const j = await res.json();
      setSmsLogs(j.recent_sms_transactions ?? []);
    } catch {
      toast.error("Failed to fetch logs");
    } finally {
      setSmsLogsLoading(false);
    }
  };

  const copySmsToken = async () => {
    if (!smsToken) return;
    const appUrl = window.location.origin;
    const webhookUrl = `${appUrl}/api/sms-webhook?token=${smsToken}`;
    await navigator.clipboard.writeText(webhookUrl);
    setSmsTokenCopied(true);
    setTimeout(() => setSmsTokenCopied(false), 2000);
  };

  const handleSetPassword = async () => {
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setSettingPassword(true);
    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to set password");
      } else {
        toast.success("Password set! You can now sign in with email too.");
        setHasPassword(true);
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSettingPassword(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name,
        currency: profile.currency,
      })
      .eq("id", profile.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profile saved");
  };

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  if (loading)
    return (
      <DashboardLayout title="Settings">
        <div className="flex justify-center py-20">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );

  return (
    <DashboardLayout title="Settings">
      <div className="max-w-2xl space-y-6">
        {/* Profile */}
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <User className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Profile</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Full Name
              </label>
              <input
                value={profile?.full_name || ""}
                onChange={(e) =>
                  setProfile({ ...profile, full_name: e.target.value })
                }
                className="w-full px-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                value={profile?.email || ""}
                disabled
                className="w-full px-3 py-2.5 rounded-lg border bg-muted text-muted-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Base Currency
              </label>
              <select
                value={profile?.currency || "INR"}
                onChange={(e) =>
                  setProfile({ ...profile, currency: e.target.value })
                }
                className="w-full px-3 py-2.5 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={saveProfile}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        {/* Appearance */}
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <Palette className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Appearance</h2>
          </div>
          <div>
            <label className="block text-sm font-medium mb-3">Theme</label>
            <div className="flex gap-3">
              {["light", "dark", "system"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`flex-1 py-3 rounded-lg border capitalize text-sm font-medium transition-colors ${theme === t ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"}`}
                >
                  {t === "light" ? "☀️" : t === "dark" ? "🌙" : "🖥️"} {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <Bell className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Notifications</h2>
          </div>
          <div className="space-y-4">
            {[
              {
                label: "Budget Alerts",
                desc: "Get notified when spending approaches budget limits",
              },
              {
                label: "Unusual Spending",
                desc: "Alert for transactions above your average",
              },
              {
                label: "Recurring Reminders",
                desc: "Reminder before recurring payments",
              },
              {
                label: "Weekly Summary",
                desc: "Weekly financial health digest",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <button className="relative w-11 h-6 rounded-full bg-primary transition-colors">
                  <span className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Set Password — only shown for Google-only accounts */}
        {!hasPassword && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6">
            <div className="flex items-center gap-3 mb-2">
              <KeyRound className="w-5 h-5 text-amber-500" />
              <h2 className="font-semibold">Set a Password</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              You signed in with Google. Set a password to also be able to sign
              in with your email.
            </p>
            <div className="space-y-3">
              <div className="relative">
                <input
                  type={showNewPwd ? "text" : "password"}
                  placeholder="New password (min 8 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2.5 pr-10 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPwd(!showNewPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showConfirmPwd ? "text" : "password"}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2.5 pr-10 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                onClick={handleSetPassword}
                disabled={settingPassword || !newPassword || !confirmPassword}
                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {settingPassword ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <KeyRound className="w-4 h-4" />
                )}
                {settingPassword ? "Setting password..." : "Set Password"}
              </button>
            </div>
          </div>
        )}

        {/* Security */}
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Security</h2>
          </div>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              All data is protected with Row-Level Security in Supabase. Only
              you can access your financial data.
            </p>
            <div className="flex gap-3 flex-wrap">
              <span className="text-xs bg-green-500/10 text-green-500 px-2.5 py-1.5 rounded-full font-medium">
                ✓ RLS Enabled
              </span>
              <span className="text-xs bg-green-500/10 text-green-500 px-2.5 py-1.5 rounded-full font-medium">
                ✓ Encrypted Transit
              </span>
              <span className="text-xs bg-green-500/10 text-green-500 px-2.5 py-1.5 rounded-full font-medium">
                ✓ Zod Validation
              </span>
            </div>
          </div>
        </div>

        {/* Data */}
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-3 mb-5">
            <Database className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Data Management</h2>
          </div>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Export all your data or delete your account.
            </p>
            <div className="flex gap-3">
              <button className="px-4 py-2 rounded-lg border text-sm hover:bg-muted transition-colors">
                Export All Data
              </button>
              <button className="px-4 py-2 rounded-lg border border-red-500/50 text-red-500 text-sm hover:bg-red-500/10 transition-colors">
                Delete Account
              </button>
            </div>
          </div>
        </div>

        {/* SMS Automation */}
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-3 mb-2">
            <Smartphone className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">iPhone SMS Automation</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            Auto-track bank transactions from SMS using the iPhone{" "}
            <strong>Shortcuts</strong> app. Every bank SMS triggers a shortcut
            that sends the message to FinTrack.
          </p>

          {/* Webhook URL */}
          <div className="space-y-3">
            {smsToken ? (
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Your webhook URL
                </label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={`${typeof window !== "undefined" ? window.location.origin : ""}/api/sms-webhook?token=${smsToken}`}
                    className="flex-1 px-3 py-2 rounded-lg border bg-muted text-xs font-mono text-muted-foreground truncate"
                  />
                  <button
                    onClick={copySmsToken}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border bg-background hover:bg-muted transition-colors text-sm font-medium shrink-0"
                  >
                    {smsTokenCopied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    {smsTokenCopied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No webhook token yet. Generate one to get started.
              </p>
            )}

            <button
              onClick={generateSmsToken}
              disabled={smsTokenLoading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border bg-background hover:bg-muted transition-colors text-sm font-medium disabled:opacity-50"
            >
              {smsTokenLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {smsToken ? "Regenerate Token" : "Generate Token"}
            </button>

            {smsToken && (
              <div className="rounded-lg bg-muted/50 border p-4 space-y-3 text-sm">
                <p className="font-medium">iPhone Shortcuts setup (3 steps):</p>
                <ol className="space-y-2 text-muted-foreground list-decimal list-inside leading-relaxed">
                  <li>
                    Open <strong>Shortcuts</strong> app → <strong>Automation</strong> tab → tap <strong>+</strong>
                  </li>
                  <li>
                    Choose <strong>Message</strong> → set sender filter to your bank names
                    (e.g. <em>HDFCBK, SBIINB, ICICIB</em>) → enable <strong>Run Immediately</strong>
                  </li>
                  <li>
                    Add action: <strong>Get Contents of URL</strong> → paste the webhook URL above →
                    set Method to <strong>POST</strong> → add JSON body:
                    <pre className="mt-2 p-2 rounded bg-muted text-xs overflow-x-auto whitespace-pre-wrap">{`{
  "message": "Shortcut Input",
  "sender": "Shortcut Input Sender"
}`}</pre>
                    <span className="text-xs">(Use the <em>Message Content</em> and <em>Sender</em> variables from the shortcut input)</span>
                  </li>
                </ol>
                <p className="text-xs text-muted-foreground border-t pt-3">
                  Transactions are deduplicated automatically — the same SMS will never be inserted twice. Make sure each bank account has its <strong>last 4 digits</strong> filled in under Accounts.
                </p>
              </div>
            )}

            {/* Live log */}
            {smsToken && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Recent SMS transactions</p>
                  <button
                    onClick={() => fetchSmsLogs(smsToken)}
                    disabled={smsLogsLoading}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <RefreshCw className={`w-3 h-3 ${smsLogsLoading ? "animate-spin" : ""}`} />
                    Refresh
                  </button>
                </div>
                {smsLogsLoading ? (
                  <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Checking...
                  </div>
                ) : smsLogs.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                    No SMS transactions yet. Send a bank SMS and it will appear here.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {smsLogs.map((t: any) => (
                      <div key={t.id} className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2.5 text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`shrink-0 w-2 h-2 rounded-full ${t.type === "expense" ? "bg-red-500" : "bg-green-500"}`} />
                          <span className="truncate text-muted-foreground text-xs">
                            {t.merchant || t.description?.slice(0, 40) || "Unknown"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-2">
                          <span className={`font-semibold text-xs ${t.type === "expense" ? "text-red-500" : "text-green-500"}`}>
                            {t.type === "expense" ? "-" : "+"}₹{Number(t.amount).toLocaleString("en-IN")}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(t.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors font-medium"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </DashboardLayout>
  );
}
