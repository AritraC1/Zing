const Step = ({ number, text }) => {
  return (
    <div className="flex items-start gap-4">
      <div className="min-w-8 h-8 flex items-center justify-center rounded-full bg-blue-600 text-white text-sm font-semibold">
        {number}
      </div>
      <div className="text-gray-700 text-[15px]">{text}</div>
    </div>
  );
};

export default Step;