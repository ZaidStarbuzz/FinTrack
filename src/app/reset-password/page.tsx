"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Loader2 } from "lucide-react";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const token = params?.get("token") || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    setLoading(false);
    if (res.ok) setDone(true);
  };

  if (!token)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Invalid reset link
      </div>
    );

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border rounded-2xl p-8 shadow-xl text-center">
          {!done ? (
            <>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-xl font-bold mb-2">Reset password</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password"
                  className="w-full px-3 py-2 rounded-lg border"
                />
                <button
                  disabled={loading}
                  className="w-full py-2 rounded-lg bg-primary text-white"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Set new password"
                  )}
                </button>
              </form>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold">Password updated</h3>
              <p className="text-sm text-muted-foreground mt-2">
                You can now sign in with your new password.
              </p>
              <button
                onClick={() => router.push("/login")}
                className="mt-4 inline-block text-primary"
              >
                Back to sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
