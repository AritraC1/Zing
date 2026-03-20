import React from 'react'

const LoadingPage = () => {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-gray-100">
      
      <div className="flex flex-col items-center space-y-6">
        
        {/* Chat Bubble Animation */}
        <div className="flex space-x-2">
          <div className="w-4 h-4 bg-blue-500 rounded-full animate-bounce"></div>
          <div className="w-4 h-4 bg-blue-500 rounded-full animate-bounce delay-150"></div>
          <div className="w-4 h-4 bg-blue-500 rounded-full animate-bounce delay-300"></div>
        </div>

        {/* Loading Text */}
        <p className="text-gray-600 text-lg font-medium animate-pulse">
          Loading chats & calls
        </p>

      </div>

    </div>
  );
}

export default LoadingPage