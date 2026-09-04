"use client";
import { use, useState } from "react";
import { MBTI_QUESTIONS, ENNEAGRAM_QUESTIONS, scoreMBTI, scoreEnneagram } from "@/lib/tests";
import { TYPING_SYSTEMS } from "@/lib/typing-systems";
import { Btn, PageTitle, Sheet, Stamp, Typed } from "@/components/dossier";

const NAMES: Record<string, string> = { mbti: "MBTI", enneagram: "Enneagram" };

/** The result's name and description from the system definitions ("INTJ, The Architect"; an Enneagram wing result looks up its core type). */
function describeResult(type: string, result: string): { title: string; text: string } | null {
  const sys = TYPING_SYSTEMS.find((s) => s.slug === type);
  const value = type === "enneagram" ? result.split("w")[0] : result;
  const t = sys?.types?.find((x) => x.value === value);
  if (!t) return null;
  return { title: t.label.replace(" — ", ", "), text: t.description ?? "" };
}

export default function TestPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = use(params);
  const known = type === "mbti" || type === "enneagram";
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isEnneagram = type === "enneagram";
  const questions = isEnneagram ? ENNEAGRAM_QUESTIONS : MBTI_QUESTIONS;
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

  if (!known) {
    return (
      <div className="pb-10">
        <PageTitle title="Tests" aside="No such test on file." />
        <div className="max-w-[560px]">
          <Sheet className="flex flex-col gap-4">
            <Typed className="text-[14px]">Two tests are on file.</Typed>
            <div className="flex flex-wrap gap-3">
              <Btn href="/test/mbti">MBTI test</Btn>
              <Btn href="/test/enneagram">Enneagram test</Btn>
            </div>
          </Sheet>
        </div>
      </div>
    );
  }

  if (result) {
    const described = describeResult(type, result);
    return (
      <div className="pb-10">
        <PageTitle title={`${NAMES[type]} test`} aside="Your result" />
        <div className="max-w-[720px]">
          <Sheet className="flex flex-col gap-6">
            <div className="flex justify-center py-6">
              <Stamp code={result} line="YOUR RESULT" className="relative left-0 top-0" />
            </div>
            {described && (
              <div className="flex flex-col gap-1 border-t-2 border-ink pt-4">
                <span className="lab">{described.title}</span>
                <Typed className="text-[15px] leading-[1.5]">{described.text}</Typed>
              </div>
            )}
            <div className="flex flex-col-reverse gap-3 border-t-2 border-ink pt-[18px] sm:flex-row sm:justify-end">
              <Btn onClick={() => { setResult(null); setAnswers({}); setStep(0); }}>Retake</Btn>
              <Btn variant="primary" href={`/search?type=${encodeURIComponent(result)}&system=${type}`}>
                Browse {result} files
              </Btn>
            </div>
          </Sheet>
        </div>
      </div>
    );
  }

  const question = questions[step];
  const answered = Object.keys(answers).length;
  const left = totalQuestions - answered;

  return (
    <div className="pb-10">
      <PageTitle title={`${NAMES[type]} test`} aside={`Question ${step + 1} of ${totalQuestions}`} />
      <div className="max-w-[720px]">
        <Sheet className="flex flex-col gap-5">
          <div className="h-1 w-full bg-paper-2" aria-hidden="true">
            <div className="h-1 bg-blue" style={{ width: `${(step / totalQuestions) * 100}%` }} />
          </div>
          <h2 className="font-display text-[28px] font-extrabold uppercase leading-[1.05] md:text-[33px]">{question.text}</h2>
          <fieldset className="flex flex-col gap-2">
            <legend className="sr-only">Your answer</legend>
            {question.options.map((opt) => {
              const on = answers[question.id] === opt.value;
              return (
                <label key={opt.value} className={`flex min-h-[44px] cursor-pointer items-center gap-3 px-4 py-[10px] text-[15px] ${on ? "bg-navy text-paper" : "row-fill hover:bg-steel/40"}`}>
                  <input type="radio" name={`question-${question.id}`} value={opt.value} checked={on} onChange={() => handleAnswer(question.id, opt.value)} className="h-4 w-4 accent-blue" />
                  {opt.label}
                </label>
              );
            })}
          </fieldset>
          <div className="flex flex-col-reverse gap-3 border-t-2 border-ink pt-[18px] sm:flex-row sm:justify-between">
            <Btn onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>Back</Btn>
            {step === totalQuestions - 1 ? (
              <Btn variant="primary" onClick={handleSubmit} disabled={loading || answered < totalQuestions}>
                {loading ? "Scoring" : "See the result"}
              </Btn>
            ) : (
              <Btn variant="primary" onClick={() => setStep(step + 1)}>Next</Btn>
            )}
          </div>
          {step === totalQuestions - 1 && left > 0 && (
            <Typed>
              {left} {left === 1 ? "question is" : "questions are"} still unanswered. Go back and answer {left === 1 ? "it" : "them"} to score the test.
            </Typed>
          )}
        </Sheet>
      </div>
    </div>
  );
}
