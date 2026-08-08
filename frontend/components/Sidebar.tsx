"use client"

import React from 'react'

export interface Conversation {
  id: string
  title: string
  messages: { id: string; role: 'user' | 'assistant'; content: string }[]
  createdAt: number
}

interface SidebarProps {
  conversations: Conversation[]
  activeId: string | null
  onSelectConversation: (id: string) => void
  onNewChat: () => void
  onDeleteConversation: (id: string, e: React.MouseEvent) => void
  onClearAllChats?: () => void
  modelStatus?: string
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onClearAllChats,
  modelStatus = 'ready',
}) => {
  // Global Keyboard Shortcut: Cmd/Ctrl + K for New Chat
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        onNewChat()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onNewChat])

  return (
    <aside className="w-[260px] h-screen bg-[#202123] flex flex-col justify-between shrink-0 select-none z-20">
      {/* Top Header & New Chat */}
      <div className="p-4 space-y-4">
        <div className="flex items-center space-x-3 px-1">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shadow-sm overflow-hidden bg-[#1f242a]">
            <img src="/logo.png" alt="Serchi Logo" className="w-full h-full object-contain p-0.5" />
          </div>
          <div>
            <h1 className="font-semibold text-white tracking-tight text-base leading-tight">
              Serchi
            </h1>
            <p className="text-[11px] text-[#8e8e8e] font-mono"></p>
          </div>
        </div>

        <button
          onClick={onNewChat}
          className="w-full py-2.5 px-3.5 bg-[#343541] hover:bg-[#40414f] text-white font-medium text-sm rounded-xl transition-all duration-150 flex items-center justify-between shadow-sm active:scale-[0.98] group"
          title="Start a new chat (Cmd + K / Ctrl + K)"
        >
          <div className="flex items-center space-x-2">
            <span className="text-lg leading-none">＋</span>
            <span>New Chat</span>
          </div>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-[#8e8e8e] group-hover:text-white bg-[#202123] rounded border border-[#4a4b57] transition-colors">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Conversation History List */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1 py-2">
        <div className="flex items-center justify-between px-2 pb-1 text-[11px] font-semibold tracking-wider text-[#8e8e8e] uppercase font-mono">
          <span>Recent Conversations</span>
          {conversations.length > 0 && onClearAllChats && (
            <button
              onClick={onClearAllChats}
              className="text-[10px] text-red-400 hover:text-red-300 transition-colors lowercase"
              title="Clear all local chat history"
            >
              clear all
            </button>
          )}
        </div>

        {conversations.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-[#666666]">
            No previous chats. Start a new topic!
          </div>
        ) : (
          conversations.map((conv) => {
            const isActive = conv.id === activeId
            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-sm transition-all duration-150 ${isActive
                    ? 'bg-[#343541] text-white font-medium shadow-sm'
                    : 'text-[#c7c4d7] hover:bg-[#2a2b32] hover:text-white'
                  }`}
              >

                <div className="flex items-center space-x-2 min-w-0 pr-2">
                  <span className="text-xs text-[#8e8e8e]">💬</span>
                  <span className="truncate text-xs font-normal">
                    {conv.title || 'New Conversation'}
                  </span>
                </div>

                <button
                  onClick={(e) => onDeleteConversation(conv.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-[#8e8e8e] hover:text-red-400 rounded transition-opacity text-xs"
                  title="Delete chat"
                >
                  ✕
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* Bottom Pinned Footer */}
      <div className="p-3 bg-[#202123]">
        <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-[#2a2b32] text-xs">
          <div className="flex items-center space-x-2 min-w-0">
            <span className={`w-2 h-2 rounded-full animate-pulse ${
              modelStatus === 'ready' ? 'bg-emerald-500' :
              modelStatus === 'offline' ? 'bg-red-500' :
              modelStatus === 'downloading' ? 'bg-amber-500' :
              modelStatus === 'loading' ? 'bg-indigo-500' : 'bg-gray-400'
            }`} />
            <span className="text-[11px] text-[#c8c6c5] truncate font-medium">
              {modelStatus === 'ready' ? 'Powered by Serchi' :
               modelStatus === 'offline' ? 'Serchi (Offline Mode)' :
               modelStatus === 'downloading' ? 'Serchi (Downloading...)' :
               modelStatus === 'loading' ? 'Serchi (Loading...)' : 'Powered by Serchi'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}
