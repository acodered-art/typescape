"use client";
import { useState } from "react";
import { Btn, FolderTab, Sheet, TabStrip, Typed } from "@/components/dossier";
import { FormNote } from "@/components/dossier/modal";

const FIELD = "w-full border-0 border-b border-steel bg-transparent px-0 py-1 font-typed text-[16px] text-ink outline-none placeholder:text-steel-2 focus:border-blue";

/** Sign in or open a reader file: two folder tabs over one sheet, fields as typed values on a rule, one primary button, the OAuth providers under a typed "or". */
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
      setSuccess("Your reader file is open. Sign in below.");
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
      setError("Network error. Check your connection.");
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
    <div className="mx-auto max-w-[560px] pb-10">
      <TabStrip>
        <FolderTab active={mode === "signin"} onClick={() => switchMode("signin")}>Sign in</FolderTab>
        <FolderTab active={mode === "signup"} onClick={() => switchMode("signup")}>New reader</FolderTab>
      </TabStrip>
      <Sheet className="flex flex-col gap-6">
        <Typed className="text-[14px]">{mode === "signin" ? "Sign in to vote, file notes, and open files." : "Open a reader file and start reading."}</Typed>

        <form onSubmit={handleSubmit} className="grid grid-cols-[96px_minmax(0,1fr)] items-baseline gap-x-3 gap-y-5">
          {mode === "signup" && (
            <>
              <label htmlFor="username" className="lab">Handle</label>
              <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Letters, digits, dashes" required maxLength={30} className={FIELD} />
            </>
          )}
          <label htmlFor="email" className="lab">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className={FIELD} />
          <label htmlFor="password" className="lab">Password</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === "signup" ? "At least 6 characters" : "Your password"} required minLength={6} className={FIELD} />
          <div className="col-span-2 flex flex-col gap-3 pt-2">
            {error && <FormNote error>{error}</FormNote>}
            {success && <FormNote>{success}</FormNote>}
            <Btn type="submit" variant="primary" disabled={loading} className="w-full sm:w-auto sm:self-end">
              {loading ? "One moment" : mode === "signin" ? "Sign in" : "Open a reader file"}
            </Btn>
          </div>
        </form>

        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-steel" />
          <Typed>or</Typed>
          <span className="h-px flex-1 bg-steel" />
        </div>

        {/* OAuth starts with a full navigation to the auth route handler, which a client-side Link would prefetch and break. */}
        <div className="flex flex-col gap-3 sm:flex-row">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/api/auth/signin/google" className="btn justify-center sm:flex-1">Sign in with Google</a>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/api/auth/signin/discord" className="btn justify-center sm:flex-1">Sign in with Discord</a>
        </div>

        <Typed className="text-[14px]">
          {mode === "signin" ? (
            <>
              New here?{" "}
              <button type="button" onClick={() => switchMode("signup")} className="text-blue underline hover:text-navy">Create an account</button>.
            </>
          ) : (
            <>
              Already a reader?{" "}
              <button type="button" onClick={() => switchMode("signin")} className="text-blue underline hover:text-navy">Sign in</button>.
            </>
          )}
        </Typed>
      </Sheet>
    </div>
  );
}
