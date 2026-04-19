// "use client";
// import { useState } from "react";
// import { createClient } from "@/lib/supabase/client";
// import { useRouter } from "next/navigation";
// import Link from "next/link";
// import { CircleDollarSign, Mail, Lock, User, Loader2 } from "lucide-react";

// export default function RegisterPage() {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [fullName, setFullName] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");
//   const [success, setSuccess] = useState(false);
//   const router = useRouter();
//   const supabase = createClient();

//   const handleRegister = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setLoading(true);
//     setError("");
//     const result = await supabase.auth.signUp({
//       email,
//       password,
//       options: {
//         data: { full_name: fullName },
//         emailRedirectTo: `${window.location.origin}/dashboard`,
//       },
//     });
//     console.log(result);
//     setLoading(false);
//     // if (error) setError(error.message);
//     // else setSuccess(true);
//   };

//   if (success)
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-background p-4">
//         <div className="text-center max-w-sm">
//           <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
//             <Mail className="w-8 h-8 text-green-500" />
//           </div>
//           <h2 className="text-xl font-bold mb-2">Check your email</h2>
//           <p className="text-muted-foreground text-sm">
//             We sent a confirmation link to <strong>{email}</strong>. Click it to
//             activate your account.
//           </p>
//           <Link
//             href="/login"
//             className="mt-6 inline-block text-primary font-medium hover:underline"
//           >
//             Back to Sign In
//           </Link>
//         </div>
//       </div>
//     );

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-background p-4">
//       <div className="w-full max-w-md">
//         <div className="flex flex-col items-center mb-8">
//           <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mb-4 shadow-lg shadow-primary/30">
//             <CircleDollarSign className="w-8 h-8 text-white" />
//           </div>
//           <h1 className="text-2xl font-bold">Create account</h1>
//           <p className="text-muted-foreground text-sm mt-1">
//             Start managing your finances
//           </p>
//         </div>

//         <div className="bg-card border rounded-2xl p-8 shadow-xl">
//           <form onSubmit={handleRegister} className="space-y-4">
//             <div>
//               <label className="block text-sm font-medium mb-1.5">
//                 Full Name
//               </label>
//               <div className="relative">
//                 <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
//                 <input
//                   type="text"
//                   value={fullName}
//                   onChange={(e) => setFullName(e.target.value)}
//                   required
//                   placeholder="Ravi Kumar"
//                   className="w-full pl-10 pr-4 py-3 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
//                 />
//               </div>
//             </div>
//             <div>
//               <label className="block text-sm font-medium mb-1.5">Email</label>
//               <div className="relative">
//                 <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
//                 <input
//                   type="email"
//                   value={email}
//                   onChange={(e) => setEmail(e.target.value)}
//                   required
//                   placeholder="you@example.com"
//                   className="w-full pl-10 pr-4 py-3 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
//                 />
//               </div>
//             </div>
//             <div>
//               <label className="block text-sm font-medium mb-1.5">
//                 Password
//               </label>
//               <div className="relative">
//                 <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
//                 <input
//                   type="password"
//                   value={password}
//                   onChange={(e) => setPassword(e.target.value)}
//                   required
//                   minLength={8}
//                   placeholder="Min 8 characters"
//                   className="w-full pl-10 pr-4 py-3 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
//                 />
//               </div>
//             </div>

//             {error && (
//               <p className="text-sm text-red-500 bg-red-500/10 px-3 py-2 rounded-lg">
//                 {error}
//               </p>
//             )}

//             <button
//               type="submit"
//               disabled={loading}
//               className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
//             >
//               {loading && <Loader2 className="w-4 h-4 animate-spin" />}
//               {loading ? "Creating account..." : "Create Account"}
//             </button>
//           </form>

//           <p className="text-center text-sm text-muted-foreground mt-6">
//             Already have an account?{" "}
//             <Link
//               href="/login"
//               className="text-primary font-medium hover:underline"
//             >
//               Sign in
//             </Link>
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// }

"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CircleDollarSign, Mail, Lock, User, Loader2 } from "lucide-react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

    setLoading(false);

    if (error) {
      if (error.message.includes("User already registered")) {
        setError("This email is already registered. Try signing in instead.");
      } else {
        setError(error.message);
      }
    } else {
      setSuccess(true);
      setFullName("");
      setEmail("");
      setPassword("");
    }
  };

  // ✅ SUCCESS SCREEN
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-sm bg-card border rounded-2xl p-8 shadow-xl">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-green-500" />
          </div>

          <h2 className="text-xl font-bold mb-2">Check your email</h2>

          <p className="text-muted-foreground text-sm mb-4">
            We’ve sent a verification link to:
          </p>

          <p className="font-medium text-sm break-all mb-4">{email}</p>

          <p className="text-muted-foreground text-xs mb-6">
            Click the link in your email to activate your account. Once
            verified, you’ll be able to access your dashboard.
          </p>

          <Link
            href="/login"
            className="inline-block w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition"
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  // ✅ REGISTER FORM
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* HEADER */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mb-4 shadow-lg shadow-primary/30">
            <CircleDollarSign className="w-8 h-8 text-white" />
          </div>

          <h1 className="text-2xl font-bold">Create account</h1>

          <p className="text-muted-foreground text-sm mt-1 text-center">
            Start managing your finances in a simple way
          </p>
        </div>

        {/* FORM CARD */}
        <div className="bg-card border rounded-2xl p-8 shadow-xl">
          <form onSubmit={handleRegister} className="space-y-4">
            {/* NAME */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="Ravi Kumar"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                />
              </div>
            </div>

            {/* EMAIL */}
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  disabled={loading}
                  placeholder="Minimum 8 characters"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Use at least 8 characters for security
              </p>
            </div>

            {/* ERROR */}
            {error && (
              <div className="text-sm text-red-500 bg-red-500/10 px-3 py-2 rounded-lg">
                {error}
              </div>
            )}

            {/* INFO MESSAGE */}
            {!error && (
              <p className="text-xs text-muted-foreground">
                After signing up, you’ll need to verify your email before
                logging in.
              </p>
            )}

            {/* BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Creating your account..." : "Create Account"}
            </button>
          </form>

          {/* FOOTER */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-primary font-medium hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
