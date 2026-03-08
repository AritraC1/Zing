const StatSection = () => {
  return (
    <section className="py-16 bg-linear-to-r from-emerald-500 to-teal-500">
      <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
        {[
          { value: "50M+", label: "Active Users" },
          { value: "99.9%", label: "Uptime SLA" },
          { value: "<100ms", label: "Avg Latency" },
          { value: "190+", label: "Countries" },
        ].map((s) => (
          <div key={s.label} className="text-center">
            <div
              className="text-3xl sm:text-4xl font-black text-white"
              style={{ fontFamily: "Syne, sans-serif" }}
            >
              {s.value}
            </div>
            <div className="text-emerald-100 text-sm mt-1">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default StatSection;
