"use client"

import React from 'react'

export const DownloadScreen: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#343541] text-[#ececf1] px-4 selection:bg-gray-500 selection:text-white">
      <div className="max-w-md w-full p-8 rounded-2xl bg-[#202123] border border-[#202123] shadow-xl flex flex-col items-center text-center space-y-6 animate-fade-in">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-inner overflow-hidden bg-[#1f242a] animate-pulse">
          <img src="/logo.png" alt="Serchi" className="w-full h-full object-contain p-1" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Downloading Serchi Model
          </h2>
          <p className="text-sm text-[#8e8e8e] leading-relaxed">
            ~720MB · This only happens once. Subsequent starts are instant.
          </p>
        </div>

        {/* Animated Indeterminate Progress Bar */}
        <div className="w-full bg-[#333333] h-2.5 rounded-full overflow-hidden relative">
          <div className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-gray-500 via-gray-400 to-gray-500 h-full rounded-full animate-[pulse_1.5s_infinite_ease-in-out] w-3/4 shadow-sm" />
          <div className="absolute top-0 bottom-0 left-0 right-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_2s_infinite]" />
        </div>

        <div className="pt-2 border-t border-[#333333] w-full text-xs text-[#8e8e8e]">
          Model: <span className="font-mono text-[#ececf1]">Xen0pp/SmolLM-ML-Planner-500-V3</span>
        </div>
      </div>
    </div>
  )
}
