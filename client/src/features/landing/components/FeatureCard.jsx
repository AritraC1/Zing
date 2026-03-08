const FeatureCard = ({ icon, title, desc, delay }) => {
  return (
    <div
      className="group bg-white rounded-3xl p-7 border border-slate-100 hover:border-emerald-200 hover:shadow-xl transition-all duration-500 hover:-translate-y-1"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-5 bg-linear-to-br from-emerald-50 to-teal-50 border border-emerald-100 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3
        className="font-bold text-slate-900 text-lg mb-2"
        style={{ fontFamily: "Syne, sans-serif" }}
      >
        {title}
      </h3>
      <p
        className="text-slate-500 text-sm leading-relaxed"
        style={{ fontFamily: "Instrument Sans, sans-serif" }}
      >
        {desc}
      </p>
    </div>
  );
};

export default FeatureCard;
