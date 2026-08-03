"use client"

import React, { useRef, useEffect } from 'react'

interface InputBarProps {
  input: string
  setInput: (value: string) => void
  onSend: () => void
  onStop: () => void
  isStreaming: boolean
  disabled?: boolean
}

export const InputBar: React.FC<InputBarProps> = ({
  input,
  setInput,
  onSend,
  onStop,
  isStreaming,
  disabled = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea up to 6 lines (~144px)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const newHeight = Math.min(textareaRef.current.scrollHeight, 144)
      textareaRef.current.style.height = `${newHeight}px`
    }
  }, [input])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!isStreaming && input.trim() && !disabled) {
        onSend()
      }
    }
  }

  const charCount = input.length
  const isOverLimit = charCount > 1000

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-6 pt-2">
      <div className="relative bg-[#40414f] border border-[#40414f] focus-within:border-gray-500 rounded-2xl shadow-xl transition-all duration-200">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your ML project..."
          disabled={disabled}
          rows={1}
          className="w-full bg-transparent text-[#e4e2e1] placeholder-[#666666] px-4 pt-3.5 pb-10 text-sm focus:outline-none resize-none min-h-[52px] max-h-[144px] leading-relaxed disabled:opacity-50"
        />

        {/* Bottom Bar Tools: Char Counter & Action Buttons */}
        <div className="absolute bottom-2.5 left-4 right-3 flex items-center justify-between pointer-events-none">
          {/* Character counter warning */}
          <div className="text-[11px] font-mono select-none pointer-events-auto">
            {charCount > 0 && (
              <span className={isOverLimit ? 'text-red-400 font-semibold' : 'text-[#666666]'}>
                {charCount} / 2000 chars {isOverLimit && '(long prompt)'}
              </span>
            )}
          </div>

          {/* Action Button: Send or Stop */}
          <div className="pointer-events-auto flex items-center space-x-2">
            {isStreaming ? (
              <button
                onClick={onStop}
                className="p-2 bg-transparent hover:bg-gray-100/10 text-white rounded-xl transition-all flex items-center justify-center space-x-1.5 text-xs font-medium active:scale-95"
                title="Stop response generation"
              >
                <span className="w-2.5 h-2.5 bg-white rounded-sm" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                onClick={onSend}
                disabled={!input.trim() || disabled}
                className="p-2 bg-white hover:bg-gray-200 disabled:bg-[#2a2a2a] disabled:text-[#555555] text-black rounded-xl transition-all shadow-sm flex items-center justify-center disabled:shadow-none active:scale-95 disabled:active:scale-100"
                title="Send message (Enter)"
              >
                <svg
                  className="w-4 h-4 transform rotate-90"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M12 19V5m0 0l-7 7m7-7l7 7"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
      
      <p className="text-center text-[11px] text-[#666666] mt-2">
        Always verify critical architecture & code choices.
      </p>
    </div>
  )
}
