"use client"

import { useEffect, useRef, useState } from "react"
import { DefaultChatTransport, type ToolUIPart } from "ai"
import { useChat } from "@ai-sdk/react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input"
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message"
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool"

export function ProjectChat({
  projectId,
  pinnedSkill,
  onStateChanged,
}: {
  projectId: string
  pinnedSkill: string | null
  onStateChanged: () => void
}) {
  const [input, setInput] = useState<string>("")

  // The pinned skill must be read fresh on every request, not captured once
  // when the transport is built. A plain object body would freeze the pin at
  // its first value with no type error and no runtime error — only wrong
  // behavior. Keeping it in a ref and passing a function as `body` (resolved
  // per-request by DefaultChatTransport) keeps it live.
  const pinnedRef = useRef(pinnedSkill)
  useEffect(() => {
    pinnedRef.current = pinnedSkill
  }, [pinnedSkill])

  // `body` is invoked by DefaultChatTransport at request-send time, never
  // during this render; the nested closure only reads pinnedRef.current when
  // the AI SDK calls it. react-hooks/refs cannot see across that boundary.
  /* eslint-disable react-hooks/refs */
  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: `/api/kessel-run/projects/${projectId}/chat`,
        body: () => ({ pinnedSkill: pinnedRef.current }),
      }),
  )
  /* eslint-enable react-hooks/refs */

  const { messages, setMessages, sendMessage, status } = useChat({
    transport,
    onFinish: () => onStateChanged(),
  })

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/kessel-run/projects/${projectId}/chat`)
      if (!res.ok) return
      setMessages([...(await res.json())])
    }
    load()
  }, [projectId, setMessages])

  const handleSubmit = async () => {
    if (!input.trim()) return

    sendMessage({ text: input })
    setInput("")
  }

  return (
    <div className="flex h-full min-w-0 flex-col">
      <Conversation className="h-full min-w-0">
        <ConversationContent>
          {messages.map((message) => (
            <div key={message.id} className="min-w-0">
              {message.parts?.map((part, i) => {
                if (part.type === "text") {
                  return (
                    <Message key={`${message.id}-${i}`} from={message.role}>
                      <MessageContent>
                        <MessageResponse>{part.text}</MessageResponse>
                      </MessageContent>
                    </Message>
                  )
                }

                if (part.type?.startsWith("tool-")) {
                  return (
                    <Tool key={`${message.id}-${i}`} className="min-w-0">
                      <ToolHeader
                        type={(part as ToolUIPart).type}
                        state={(part as ToolUIPart).state || "output-available"}
                        className="cursor-pointer"
                      />
                      <ToolContent className="min-w-0">
                        <ToolInput
                          input={(part as ToolUIPart).input || {}}
                          className="min-w-0 overflow-x-auto"
                        />
                        <ToolOutput
                          output={(part as ToolUIPart).output}
                          errorText={(part as ToolUIPart).errorText}
                          className="min-w-0 overflow-x-auto"
                        />
                      </ToolContent>
                    </Tool>
                  )
                }

                return null
              })}
            </div>
          ))}
          <ConversationScrollButton />
        </ConversationContent>
      </Conversation>

      {status === "error" ? (
        <Alert variant="destructive" className="mt-4">
          <AlertTitle>That turn failed</AlertTitle>
          <AlertDescription>
            Something went wrong sending your message. Try again.
          </AlertDescription>
        </Alert>
      ) : null}

      <PromptInput onSubmit={handleSubmit} className="mt-4">
        <PromptInputBody>
          <PromptInputTextarea
            onChange={(e) => setInput(e.target.value)}
            className="md:leading-10"
            value={input}
            placeholder="Type your message..."
            disabled={status !== "ready"}
          />
        </PromptInputBody>
      </PromptInput>
    </div>
  )
}
