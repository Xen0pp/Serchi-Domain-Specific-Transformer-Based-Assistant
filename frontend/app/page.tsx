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
  const checkStatus = async () => {
    const status = await fetchModelStatus()
    setModelStatus(status)
  }

  useEffect(() => {
    let intervalId: NodeJS.Timeout

    const poll = async () => {
      const status = await fetchModelStatus()
      setModelStatus(status)
      if (status === 'ready') {
        clearInterval(intervalId)
      }
    }

    poll()
    intervalId = setInterval(poll, 2000)

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
    let offlineNotice = ''
    if (modelStatus === 'offline') {
      offlineNotice = "🔌 **Backend Server Offline**: The Python backend server on port 8000 is not running. Start it by running `./start.sh` in your terminal or configure `BACKEND_URL` to enable live AI responses."
    } else if (modelStatus === 'downloading') {
      offlineNotice = "⏳ **Model Downloading**: Serchi is currently downloading model weights (~720MB). Please wait a moment until the status changes to Ready."
    } else if (modelStatus === 'loading') {
      offlineNotice = "🚀 **Model Loading**: Model parameters are initializing in memory. Please wait a moment until the status shows Ready."
    } else if (modelStatus === 'error') {
      offlineNotice = "⚠️ **Model Load Error**: Failed to load HuggingFace model weights. Check backend logs and network connection."
    }

    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: offlineNotice,
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

    // If model is not ready, do not attempt to stream chat backend call
    if (modelStatus !== 'ready') {
      return
    }

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

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#343541]">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        onClearAllChats={handleClearAllChats}
        modelStatus={modelStatus}
      />

      <ChatWindow
        messages={messages}
        input={input}
        setInput={setInput}
        onSend={handleSend}
        onStop={handleStop}
        isStreaming={isStreaming}
        modelReady={modelStatus === 'ready'}
        modelStatus={modelStatus}
        onRetryConnection={checkStatus}
      />
    </div>
  )
}
