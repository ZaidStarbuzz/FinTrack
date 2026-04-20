"use client";
import { useState } from "react";
import Link from "next/link";
import { Mail, Loader2 } from "lucide-react";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border rounded-2xl p-8 shadow-xl text-center">
          {!sent ? (
            <>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-xl font-bold mb-2">Forgot your password?</h2>
              <p className="text-muted-foreground text-sm mb-4">
                Enter your email and we’ll send a reset link.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2 rounded-lg border"
                />
                <button
                  disabled={loading}
                  className="w-full py-2 rounded-lg bg-primary text-white"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Send reset link"
                  )}
                </button>
              </form>
              <p className="text-sm mt-4">
                Remembered?{" "}
                <Link href="/login" className="text-primary">
                  Sign in
                </Link>
              </p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold">Check your email</h3>
              <p className="text-sm text-muted-foreground mt-2">
                If an account exists with that email, you’ll receive a reset
                link shortly.
              </p>
              <Link href="/login" className="mt-4 inline-block text-primary">
                Back to sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
