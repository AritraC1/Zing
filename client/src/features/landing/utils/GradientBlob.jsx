const GradientBlob = ({ className }) => {
  return (
    <div
      className={`absolute rounded-full blur-3xl opacity-30 pointer-events-none ${className}`}
    />
  );
};

export default GradientBlob;
