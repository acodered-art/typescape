import CompareForm from "./compare-form";

export default async function ComparePage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-xl font-bold text-[#e8ecf4]">Type Comparison</h1>
        <p className="text-sm text-[#7888a0] mt-1">
          Compare two personality types side by side. See shared characters and compatibility insights.
        </p>
      </div>
      <CompareForm />
    </div>
  );
}