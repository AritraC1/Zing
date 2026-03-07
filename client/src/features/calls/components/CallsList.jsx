const CallsList = () => {
  const calls = [];

  return (
    <div className="w-80 border-r bg-white flex flex-col">
      <div className="px-5 pt-4 pb-3">
        <h1 className="font-semibold text-2xl">Calls</h1>
      </div>

      {calls.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-400 text-sm">No calls yet</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4">
          {calls.map((call) => (
            <div key={call.id}>{call.name}</div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CallsList;