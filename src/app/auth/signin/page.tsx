"use client";
import { useState } from "react";

export default function SignInPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const doRegister = async () => {
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });
    const data = await res.json();
    if (res.ok) {
      setSuccess("Account created! Sign in below.");
      setMode("signin");
      setUsername("");
      setPassword("");
    } else {
      setError(data.error || "Registration failed");
    }
  };

  const doLogin = async () => {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      window.location.href = "/";
    } else {
      const data = await res.json();
      setError(data.error || "Sign in failed");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      if (mode === "signup") {
        await doRegister();
      } else {
        await doLogin();
      }
    } catch {
      setError("Network error — check your connection");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m: "signin" | "signup") => {
    setMode(m);
    setError("");
    setSuccess("");
  };

  return (
    <div className="max-w-sm mx-auto py-16 space-y-6">
      <h1 className="text-xl font-bold text-[#e8ecf4] text-center">
        {mode === "signin" ? "Sign in" : "Create Account"}
      </h1>
      <p className="text-sm text-[#7888a0] text-center">
        {mode === "signin"
          ? "Sign in to vote, comment, and create profiles."
          : "Join the community."}
      </p>

      {error && (
        <div className="p-3 rounded border border-[#ff6b6b]/40 bg-[#ff6b6b]/10 text-sm text-[#ff6b6b]">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 rounded border border-[#64ffda]/40 bg-[#64ffda]/10 text-sm text-[#64ffda]">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === "signup" && (
          <div>
            <label className="block text-xs text-[#7888a0] mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
              required
              maxLength={30}
              className="w-full px-3 py-2 text-sm bg-[#141c2b] border border-[#1a2234] rounded text-[#c8d0dc] placeholder-[#4a5a70] focus:outline-none focus:border-[#64ffda]/40"
            />
          </div>
        )}
        <div>
          <label className="block text-xs text-[#7888a0] mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full px-3 py-2 text-sm bg-[#141c2b] border border-[#1a2234] rounded text-[#c8d0dc] placeholder-[#4a5a70] focus:outline-none focus:border-[#64ffda]/40"
          />
        </div>
        <div>
          <label className="block text-xs text-[#7888a0] mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
            required
            minLength={6}
            className="w-full px-3 py-2 text-sm bg-[#141c2b] border border-[#1a2234] rounded text-[#c8d0dc] placeholder-[#4a5a70] focus:outline-none focus:border-[#64ffda]/40"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2.5 text-sm rounded bg-[#64ffda]/10 text-[#64ffda] border border-[#64ffda]/20 hover:bg-[#64ffda]/20 disabled:opacity-30 transition-colors"
        >
          {loading ? "..." : mode === "signin" ? "Sign in" : "Create Account"}
        </button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#1a2234]" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-2 bg-[#0a0e17] text-[#4a5a70]">or</span>
        </div>
      </div>

      <div className="space-y-2">
        <a
          href="/api/auth/signin/google"
          className="block w-full text-center px-4 py-2.5 rounded border border-[#1a2234] bg-[#141c2b] text-sm text-[#c8d0dc] hover:border-[#64ffda]/40 transition-colors"
        >
          Sign in with Google
        </a>
        <a
          href="/api/auth/signin/discord"
          className="block w-full text-center px-4 py-2.5 rounded border border-[#1a2234] bg-[#141c2b] text-sm text-[#c8d0dc] hover:border-[#64ffda]/40 transition-colors"
        >
          Sign in with Discord
        </a>
      </div>

      <p className="text-xs text-[#4a5a70] text-center">
        {mode === "signin" ? (
          <>
            Don&apos;t have an account?{" "}
            <button onClick={() => switchMode("signup")} className="text-[#64ffda] hover:underline">
              Sign up
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button onClick={() => switchMode("signin")} className="text-[#64ffda] hover:underline">
              Sign in
            </button>
          </>
        )}
      </p>
    </div>
  );
}