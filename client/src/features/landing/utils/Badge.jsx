const Badge = ({ children }) => {
  return (
    <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full">
      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
      {children}
    </span>
  );
};

export default Badge;
