const Stat = ({ value, label }) => {
  return (
    <div className="text-center">
      <div
        className="text-4xl font-black text-slate-900 tabular-nums"
        style={{ fontFamily: "Syne, sans-serif" }}
      >
        {value}
      </div>
      <div
        className="text-slate-500 text-sm mt-1"
        style={{ fontFamily: "Instrument Sans, sans-serif" }}
      >
        {label}
      </div>
    </div>
  );
};

export default Stat;
