import { Btn, PageTitle, Sheet, Typed } from "@/components/dossier";
import { ENNEAGRAM_QUESTIONS, MBTI_QUESTIONS } from "@/lib/tests";

const TESTS = [
  { slug: "mbti", name: "MBTI", questions: MBTI_QUESTIONS.length, minutes: "two to three minutes", line: "Four letters, as in INFP or ENTJ." },
  { slug: "enneagram", name: "Enneagram", questions: ENNEAGRAM_QUESTIONS.length, minutes: "one to two minutes", line: "A core type with its wing, as in 4w5 or 7w8." },
];

export default function TestIndexPage() {
  return (
    <div className="pb-10">
      <PageTitle title="Tests" aside="Quick, free, no account needed." />
      <div className="max-w-[720px]">
        <Sheet className="flex flex-col gap-[14px]">
          {TESTS.map((t) => (
            <div key={t.slug} className="row-fill flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-1">
                <span className="font-display text-[33px] font-extrabold uppercase leading-none">{t.name}</span>
                <Typed className="text-[14px]">
                  {t.questions} questions, {t.minutes}. {t.line}
                </Typed>
              </div>
              <Btn href={`/test/${t.slug}`} className="shrink-0">Take the test</Btn>
            </div>
          ))}
        </Sheet>
      </div>
    </div>
  );
}
