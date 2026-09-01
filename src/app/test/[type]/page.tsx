"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MBTI_QUESTIONS, ENNEAGRAM_QUESTIONS, scoreMBTI, scoreEnneagram } from "@/lib/tests";

export default function TestPage({ params }: { params: Promise<{ type: string }> }) {
  const [type, setType] = useState<string>("");
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Set type from params
  useState(() => {
    params.then((p) => setType(p.type));
  });

  const questions = type === "enneagram" ? ENNEAGRAM_QUESTIONS : MBTI_QUESTIONS;
  const isEnneagram = type === "enneagram";
  const totalQuestions = questions.length;

  const handleAnswer = (qId: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
    if (step < totalQuestions - 1) {
      setStep((s) => s + 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    const scored = isEnneagram ? scoreEnneagram(answers) : scoreMBTI(answers);
    setResult(scored);

    // Save result
    try {
      await fetch("/api/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testType: type, result: scored, answers }),
      });
    } catch {}
    setLoading(false);
  };

  if (!type) {
    return (
      <div className="max-w-lg mx-auto py-12 space-y-4 text-center">
        <h1 className="text-xl font-bold text-[#e8ecf4]">Personality Tests</h1>
        <p className="text-sm text-[#7888a0]">Discover your personality type with our quick tests.</p>
        <div className="space-y-3 pt-4">
          <button
            onClick={() => setType("mbti")}
            className="block w-full px-4 py-3 rounded border border-[#1a2234] bg-[#0e1420] text-sm text-[#c8d0dc] hover:border-[#64ffda]/40 transition-colors"
          >
            MBTI Test — 16 questions
          </button>
          <button
            onClick={() => setType("enneagram")}
            className="block w-full px-4 py-3 rounded border border-[#1a2234] bg-[#0e1420] text-sm text-[#c8d0dc] hover:border-[#64ffda]/40 transition-colors"
          >
            Enneagram Test — 9 questions
          </button>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="max-w-lg mx-auto py-12 space-y-6 text-center">
        <h1 className="text-xl font-bold text-[#e8ecf4]">Your Result</h1>
        <div className="p-8 rounded-lg border border-[#64ffda]/30 bg-[#0e1420]">
          <div className="text-4xl font-bold text-[#64ffda] mb-2">{result}</div>
          <p className="text-sm text-[#7888a0]">
            {isEnneagram ? "Your Enneagram type" : "Your MBTI type"}
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => { setResult(null); setAnswers({}); setStep(0); }}
            className="px-4 py-2 text-sm rounded border border-[#1a2234] text-[#7888a0] hover:bg-[#1a2234]"
          >
            Retake
          </button>
          <button
            onClick={() => router.push(`/search?type=${result}&system=${type}`)}
            className="px-4 py-2 text-sm rounded bg-[#64ffda]/10 text-[#64ffda] border border-[#64ffda]/20 hover:bg-[#64ffda]/20"
          >
            Browse {result} profiles
          </button>
        </div>
      </div>
    );
  }

  const question = questions[step];
  const progress = ((step) / totalQuestions) * 100;

  return (
    <div className="max-w-lg mx-auto py-12 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-[#e8ecf4]">
          {isEnneagram ? "Enneagram" : "MBTI"} Test
        </h1>
        <span className="text-sm text-[#4a5a70]">{step + 1}/{totalQuestions}</span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-[#1a2234] rounded-full overflow-hidden">
        <div className="h-full bg-[#64ffda] transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
      </div>

      {/* Question */}
      <div className="p-6 rounded-lg border border-[#1a2234] bg-[#0e1420]">
        <p className="text-base text-[#e8ecf4] mb-6">{question.text}</p>
        <div className="space-y-2">
          {question.options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleAnswer(question.id, opt.value)}
              className={`w-full text-left px-4 py-3 rounded border text-sm transition-colors ${
                answers[question.id] === opt.value
                  ? "border-[#64ffda]/40 bg-[#64ffda]/10 text-[#64ffda]"
                  : "border-[#1a2234] bg-[#141c2b] text-[#c8d0dc] hover:border-[#2a3a4a]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="px-4 py-2 text-sm rounded border border-[#1a2234] text-[#7888a0] hover:bg-[#1a2234] disabled:opacity-30"
        >
          Back
        </button>
        {step === totalQuestions - 1 ? (
          <button
            onClick={handleSubmit}
            disabled={loading || Object.keys(answers).length < totalQuestions}
            className="px-4 py-2 text-sm rounded bg-[#64ffda]/10 text-[#64ffda] border border-[#64ffda]/20 hover:bg-[#64ffda]/20 disabled:opacity-30"
          >
            {loading ? "Calculating..." : "See Results"}
          </button>
        ) : (
          <button
            onClick={() => setStep(step + 1)}
            className="px-4 py-2 text-sm rounded bg-[#64ffda]/10 text-[#64ffda] border border-[#64ffda]/20 hover:bg-[#64ffda]/20"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}