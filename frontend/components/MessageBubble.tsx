"use client"

import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface MessageBubbleProps {
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
}

// Clean up model hallucinations, fake error strings, and format emoji numbers into clean markdown lists
function sanitizeContent(raw: string): string {
  if (!raw) return ''

  let text = raw

  // Remove fake error lines generated in code or text
  text = text.replace(/^\*?Error:\s*[\w\s-]+\*?$/gm, '')
  text = text.replace(/\*Error:\s*[\w\s-]+\*/gi, '')

  // Remove weird dataset tag brackets like [[Tag]] or <<Tag>>
  text = text.replace(/\[\[.*?\]\]/g, '')
  text = text.replace(/<<.*?>>/g, '')

  // Fix model hallucinating steps broken across multiple lines like "*Step \n\n Title*"
  text = text.replace(/\*Step\s*\n+\s*([^*]+)\*/gi, '**Step:** $1')
  
  // Ensure if steps are generated on the same line, they get split to a new line
  text = text.replace(/([a-z>])\s+(?=\*?Step\s*\d*)/gi, '$1\n\n')

  // Fix model hallucinating missing numbers like F\ncore -> F1-score
  text = text.replace(/F\s*\n\s*core/g, 'F1-score')

  return text.trim()
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  role,
  content,
  isStreaming = false,
}) => {
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null)

  const handleCopyCode = (codeText: string, index: number) => {
    navigator.clipboard.writeText(codeText)
    setCopiedCodeIndex(index)
    setTimeout(() => setCopiedCodeIndex(null), 2000)
  }

  if (role === 'user') {
    return (
      <div className="flex justify-end mb-6">
        <div className="bg-[#444654] text-[#ececf1] px-5 py-3.5 rounded-2xl rounded-tr-sm max-w-[75%] shadow-md text-sm leading-relaxed whitespace-pre-wrap break-words border border-transparent">
          {content}
        </div>
      </div>
    )
  }

  const cleanedContent = sanitizeContent(content)

  return (
    <div className="flex items-start space-x-3 mb-6">
      {/* Serchi Avatar */}
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-1 shadow-sm overflow-hidden bg-[#1f242a]">
        <img src="/logo.png" alt="Serchi" className="w-full h-full object-contain p-0.5" />
      </div>

      {/* Assistant Message Card */}
      <div className="bg-[#2a2b32] border border-[#3a3b42] text-[#ececf1] p-5 rounded-2xl rounded-tl-sm max-w-[85%] min-w-[120px] shadow-md">
        {cleanedContent.trim() === '' && isStreaming ? (
          /* Typing indicator (3 pulsing dots) */
          <div className="flex items-center space-x-1.5 py-2 px-1">
            <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]" />
            <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]" />
            <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" />
          </div>
        ) : (
          <div className={`prose prose-invert max-w-none text-sm leading-relaxed ${isStreaming ? 'blinking-cursor' : ''}`}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkBreaks]}
              components={{
                code({ node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '')
                  let codeStr = String(children).replace(/\n$/, '')
                  
                  // Filter out fake error lines inside code blocks
                  codeStr = codeStr
                    .split('\n')
                    .filter((line) => !/^\*?Error:\s*/i.test(line.trim()))
                    .join('\n')
                    .trim()

                  const isMultiLine = codeStr.includes('\n')
                  const codeIndex = Math.random()

                  if (!inline || isMultiLine) {
                    const lang = match ? match[1] : 'text'
                    return (
                      <div className="relative group my-4 rounded-xl overflow-hidden border border-[#2a2b32] bg-[#202123]">
                        <div className="flex items-center justify-between px-4 py-2 bg-[#343541] border-b border-[#2a2b32] text-xs text-[#ececf1] font-mono">
                          <span>{lang}</span>
                          <button
                            className="px-2.5 py-1 text-xs text-gray-300 hover:text-white bg-[#2a2a2a] hover:bg-[#383838] rounded-md transition-colors border border-white/10"
                            onClick={() => handleCopyCode(codeStr, codeIndex)}
                          >
                            {copiedCodeIndex === codeIndex ? '✓ Copied' : 'Copy'}
                          </button>
                        </div>
                        <SyntaxHighlighter
                          style={oneDark}
                          language={lang}
                          PreTag="div"
                          customStyle={{
                            margin: 0,
                            padding: '1rem',
                            background: '#000000',
                            fontSize: '0.85rem',
                            lineHeight: '1.5',
                          }}
                        >
                          {codeStr}
                        </SyntaxHighlighter>
                      </div>
                    )
                  }

                  return (
                    <code className="bg-[#2a2a2a] text-indigo-300 px-1.5 py-0.5 rounded text-xs font-mono border border-white/5">
                      {children}
                    </code>
                  )
                },
                table: ({ children }) => (
                  <div className="overflow-x-auto my-4 rounded-xl border border-[#333333] shadow-inner bg-[#141414]">
                    <table className="border-collapse border border-[#333333] w-full text-xs text-left">
                      {children}
                    </table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="border border-[#333333] bg-[#222222] px-3.5 py-2.5 font-semibold text-indigo-200">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border border-[#333333] px-3.5 py-2 text-[#d1d5db]">
                    {children}
                  </td>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-outside space-y-2 my-3 pl-6 text-[#e4e2e1]">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-outside space-y-2 my-3 pl-6 text-[#e4e2e1]">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="pl-1 leading-relaxed">{children}</li>
                ),
                p: ({ children }) => (
                  <p className="my-3 leading-relaxed text-[#e4e2e1]">{children}</p>
                ),
                h1: ({ children }) => (
                  <h1 className="text-lg font-bold text-white my-3 border-b border-[#333] pb-1">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-base font-semibold text-white my-2.5">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-sm font-semibold text-indigo-300 my-2">{children}</h3>
                ),
              }}
            >
              {cleanedContent}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}
