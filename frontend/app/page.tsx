"use client"

import React, { useState, useEffect, useRef } from 'react'
import { fetchModelStatus, streamChat } from '@/lib/api'
import { DownloadScreen } from '@/components/DownloadScreen'
import { LoadingScreen } from '@/components/LoadingScreen'
import { Sidebar, Conversation } from '@/components/Sidebar'
import { ChatWindow, Message } from '@/components/ChatWindow'

const LOCAL_STORAGE_KEY = 'mlplanner_conversations'

export default function Home() {
  const [modelStatus, setModelStatus] = useState<string>('downloading')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [input, setInput] = useState<string>('')
  const [isStreaming, setIsStreaming] = useState<boolean>(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // 1. Poll model status every 2s until ready
  useEffect(() => {
    let intervalId: NodeJS.Timeout

    const checkStatus = async () => {
      const status = await fetchModelStatus()
      setModelStatus(status)
      if (status === 'ready') {
        clearInterval(intervalId)
      }
    }

    checkStatus()
    intervalId = setInterval(checkStatus, 2000)

    return () => clearInterval(intervalId)
  }, [])

  // 2. Load conversations from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (saved) {
        const parsed: Conversation[] = JSON.parse(saved)
        setConversations(parsed)
        if (parsed.length > 0) {
          setActiveId(parsed[0].id)
        }
      }
    } catch (e) {
      console.error('Error loading conversations:', e)
    }
  }, [])

  // 3. Save conversations to localStorage on state change
  const saveConversationsToStorage = (updated: Conversation[]) => {
    setConversations(updated)
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated))
    } catch (e) {
      console.error('Error saving conversations:', e)
    }
  }

  // Get active conversation messages
  const activeConversation = conversations.find((c) => c.id === activeId)
  const messages: Message[] = activeConversation ? activeConversation.messages : []

  // Create New Chat
  const handleNewChat = () => {
    if (isStreaming) return
    const newConv: Conversation = {
      id: Date.now().toString(),
      title: 'New Conversation',
      messages: [],
      createdAt: Date.now(),
    }
    const updated = [newConv, ...conversations]
    setActiveId(newConv.id)
    saveConversationsToStorage(updated)
    setInput('')
  }

  // Select existing conversation
  const handleSelectConversation = (id: string) => {
    if (isStreaming) return
    setActiveId(id)
    setInput('')
  }

  // Delete conversation
  const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = conversations.filter((c) => c.id !== id)
    saveConversationsToStorage(updated)
    if (activeId === id) {
      setActiveId(updated.length > 0 ? updated[0].id : null)
    }
  }

  // Clear all conversations
  const handleClearAllChats = () => {
    if (isStreaming) return
    saveConversationsToStorage([])
    setActiveId(null)
  }

  // Send Message & Stream Response
  const handleSend = async (overridePrompt?: string) => {
    const textToSend = overridePrompt || input
    if (!textToSend.trim() || isStreaming) return

    let currentConvId = activeId
    let updatedConversations = [...conversations]

    if (!currentConvId || !conversations.some((c) => c.id === currentConvId)) {
      const newConv: Conversation = {
        id: Date.now().toString(),
        title: textToSend.slice(0, 30) + (textToSend.length > 30 ? '...' : ''),
        messages: [],
        createdAt: Date.now(),
      }
      currentConvId = newConv.id
      updatedConversations = [newConv, ...updatedConversations]
      setActiveId(currentConvId)
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
    }

    const assistantMessageId = (Date.now() + 1).toString()
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
    }

    const convIndex = updatedConversations.findIndex((c) => c.id === currentConvId)
    if (convIndex !== -1) {
      const existingConv = updatedConversations[convIndex]
      const isFirstMessage = existingConv.messages.length === 0
      const title = isFirstMessage
        ? textToSend.slice(0, 30) + (textToSend.length > 30 ? '...' : '')
        : existingConv.title

      updatedConversations[convIndex] = {
        ...existingConv,
        title,
        messages: [...existingConv.messages, userMessage, assistantMessage],
      }
    }

    saveConversationsToStorage(updatedConversations)
    if (!overridePrompt) setInput('')
    setIsStreaming(true)

    const targetConv = updatedConversations.find((c) => c.id === currentConvId)!
    const apiMessages = targetConv.messages
      .filter((m) => m.id !== assistantMessageId)
      .map((m) => ({ role: m.role, content: m.content }))

    abortControllerRef.current = new AbortController()

    try {
      await streamChat(
        apiMessages,
        (token: string) => {
          setConversations((prevConvs) => {
            const copy = [...prevConvs]
            const idx = copy.findIndex((c) => c.id === currentConvId)
            if (idx !== -1) {
              const target = copy[idx]
              const updatedMsgs = target.messages.map((m) =>
                m.id === assistantMessageId
                  ? { ...m, content: m.content + token }
                  : m
              )
              copy[idx] = { ...target, messages: updatedMsgs }
            }
            return copy
          })
        },
        abortControllerRef.current.signal
      )

      setConversations((latestConvs) => {
        const copy = [...latestConvs]
        const idx = copy.findIndex((c) => c.id === currentConvId)
        if (idx !== -1) {
          const target = copy[idx]
          const updatedMsgs = target.messages.map((m) => {
            if (m.id === assistantMessageId && !m.content.trim()) {
              return {
                ...m,
                content:
                  "I wasn't able to generate a complete response. Try rephrasing or adding more detail.",
              }
            }
            return m
          })
          copy[idx] = { ...target, messages: updatedMsgs }
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(copy))
        }
        return copy
      })
    } catch (err: any) {
      const isAborted = err.name === 'AbortError'
      const errorText = isAborted
        ? 'Response stopped.'
        : `Error: ${err.message || 'Failed to stream response.'}`

      setConversations((latestConvs) => {
        const copy = [...latestConvs]
        const idx = copy.findIndex((c) => c.id === currentConvId)
        if (idx !== -1) {
          const target = copy[idx]
          const updatedMsgs = target.messages.map((m) => {
            if (m.id === assistantMessageId) {
              return {
                ...m,
                content: m.content ? `${m.content}\n\n*${errorText}*` : errorText,
              }
            }
            return m
          })
          copy[idx] = { ...target, messages: updatedMsgs }
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(copy))
        }
        return copy
      })
    } finally {
      setIsStreaming(false)
      abortControllerRef.current = null
    }
  }

  // Stop Generation
  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }

  if (modelStatus === 'downloading') {
    return <DownloadScreen />
  }

  if (modelStatus === 'loading') {
    return <LoadingScreen />
  }

  if (modelStatus === 'offline') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f0f0f] text-white p-6">
        <div className="bg-[#171717] border border-amber-500/30 p-8 rounded-2xl max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-2xl mx-auto animate-pulse">
            🔌
          </div>
          <h2 className="text-xl font-bold text-amber-300">Backend Server Offline</h2>
          <p className="text-xs text-[#8e8e8e] leading-relaxed">
            The Python backend server on port 8000 is not running. Please start it by running <code className="bg-[#2a2a2a] text-indigo-300 px-1.5 py-0.5 rounded font-mono">./start.sh</code> in your terminal.
          </p>
          <button
            onClick={() => setModelStatus('downloading')}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-sm transition-colors shadow-lg"
          >
            Check Status Again
          </button>
        </div>
      </div>
    )
  }

  if (modelStatus === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f0f0f] text-white p-6">
        <div className="bg-[#171717] border border-red-500/30 p-8 rounded-2xl max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-xl font-bold text-red-400">Failed to load ML Model</h2>
          <p className="text-xs text-[#8e8e8e]">
            Make sure the Python backend is running on port 8000 and has internet access to download HuggingFace weights.
          </p>
          <button
            onClick={() => setModelStatus('downloading')}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-sm transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0f0f0f]">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        onClearAllChats={handleClearAllChats}
      />

      <ChatWindow
        messages={messages}
        input={input}
        setInput={setInput}
        onSend={handleSend}
        onStop={handleStop}
        isStreaming={isStreaming}
        modelReady={modelStatus === 'ready'}
      />
    </div>
  )
}
