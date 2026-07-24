"use client"

import React, { useRef, useEffect } from 'react'
import { MessageBubble } from './MessageBubble'
import { InputBar } from './InputBar'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface ChatWindowProps {
  messages: Message[]
  input: string
  setInput: (val: string) => void
  onSend: (overridePrompt?: string) => void
  onStop: () => void
  isStreaming: boolean
  modelReady: boolean
}

const EXAMPLE_PROMPTS = [
  "Create a 3-month timeline & dataset pipeline for training an LLM on domain data",
  "How do I choose between LoRA fine-tuning vs Full Fine-Tuning for a 7B model?",
  "Design an MLOps pipeline for computer vision model deployment & monitoring",
]

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  input,
  setInput,
  onSend,
  onStop,
  isStreaming,
  modelReady,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new tokens or messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  return (
    <div className="flex-1 flex flex-col h-screen bg-[#343541] overflow-hidden relative">
      {/* Top Bar Header */}
      <header className="h-16 px-6 border-b border-[#2a2b32] bg-[#343541]/90 backdrop-blur-md flex items-center justify-between shrink-0 z-10">
        <div className="flex flex-col">
          <div className="flex items-center space-x-2.5">
            <h2 className="text-sm font-semibold text-white tracking-tight">
              Xen0pp/SmolLM-ML-Planner-500-V3
            </h2>
          </div>
          <p className="text-[11px] text-[#8e8e8e] truncate max-w-xl">
            Optimized for ML planning — timelines, architecture, datasets, MLOps.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-xs text-[#8e8e8e] font-mono hidden md:block">
            Status: <span className={modelReady ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"}>
              {modelReady ? "Ready" : "Loading..."}
            </span>
          </div>
        </div>
      </header>

      {/* Main Message Thread Viewport */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-2">
          {messages.length === 0 ? (
            /* Empty State View */
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 px-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-3xl shadow-xl">
                🚀
              </div>
              <div className="space-y-2 max-w-md">
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Ask me anything about your ML project
                </h3>
                <p className="text-xs text-[#8e8e8e] leading-relaxed">
                  SmolLM2 fine-tuned to assist data scientists and engineers with architecture selection, data pipelines, training schedules, and troubleshooting.
                </p>
              </div>

              {/* Example Prompt Chips */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-3xl pt-2">
                {EXAMPLE_PROMPTS.map((promptText, i) => (
                  <button
                    key={i}
                    onClick={() => onSend(promptText)}
                    disabled={!modelReady || isStreaming}
                    className="p-4 rounded-xl bg-[#171717] hover:bg-[#222222] border border-[#333333] hover:border-indigo-500/50 text-left transition-all duration-150 group flex flex-col justify-between space-y-2 shadow-sm disabled:opacity-50"
                  >
                    <span className="text-xs text-[#e4e2e1] group-hover:text-indigo-300 transition-colors line-clamp-3">
                      "{promptText}"
                    </span>
                    <span className="text-[10px] text-indigo-400 font-medium group-hover:translate-x-0.5 transition-transform flex items-center">
                      Ask this →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Message Thread */
            messages.map((msg, index) => (
              <MessageBubble
                key={msg.id || index}
                role={msg.role}
                content={msg.content}
                isStreaming={isStreaming && index === messages.length - 1 && msg.role === 'assistant'}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Bottom Input Section */}
      <footer className="shrink-0 bg-gradient-to-t from-[#343541] via-[#343541]/90 to-transparent">
        <InputBar
          input={input}
          setInput={setInput}
          onSend={() => onSend()}
          onStop={onStop}
          isStreaming={isStreaming}
          disabled={!modelReady}
        />
      </footer>
    </div>
  )
}
