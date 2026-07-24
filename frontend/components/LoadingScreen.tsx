"use client"

import React from 'react'

export const LoadingScreen: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#343541] text-[#ececf1] px-4 selection:bg-gray-500 selection:text-white">
      <div className="max-w-md w-full p-8 rounded-2xl bg-[#202123] border border-[#202123] shadow-xl flex flex-col items-center text-center space-y-6">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-inner animate-pulse overflow-hidden bg-[#1f242a]">
          <img src="/logo.png" alt="Serchi" className="w-full h-full object-contain p-1" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Loading model into memory...
          </h2>
          <p className="text-sm text-[#8e8e8e] leading-relaxed">
            Almost ready. Initializing hardware acceleration (MPS / GPU / CPU).
          </p>
        </div>

        {/* Spinner */}
        <div className="flex items-center justify-center space-x-2">
          <div className="w-8 h-8 border-3 border-gray-400 border-t-transparent rounded-full animate-spin" />
        </div>

        <div className="pt-2 border-t border-[#333333] w-full text-xs text-[#8e8e8e]">
          Preparing local inference session...
        </div>
      </div>
    </div>
  )
}
