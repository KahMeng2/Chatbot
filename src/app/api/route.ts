import { NextRequest, NextResponse } from 'next/server'

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface HuggingFaceResponse {
  choices: Array<{
    message: {
      content: string
      role: string
    }
    finish_reason: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  error?: string
}

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    // Check if HF_TOKEN is configured
    if (!process.env.HF_TOKEN) {
      return NextResponse.json(
        { error: 'Hugging Face API token not configured' },
        { status: 500 }
      )
    }

    // Call Hugging Face API
    const response = await fetch(
      "https://router.huggingface.co/v1/chat/completions",
      {
        headers: {
          Authorization: `Bearer ${process.env.HF_TOKEN}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({
          messages: messages,
          model: "openai/gpt-oss-120b:together", // You can make this configurable
          max_tokens: 1000, // Optional: limit response length
          temperature: 0.7, // Optional: control randomness
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Hugging Face API Error:', response.status, errorData)
      return NextResponse.json(
        { error: `API request failed: ${response.status}` },
        { status: response.status }
      )
    }

    const result: HuggingFaceResponse = await response.json()

    // Check if the response has an error
    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    // Extract the assistant's message
    const assistantMessage = result.choices?.[0]?.message?.content

    if (!assistantMessage) {
      return NextResponse.json(
        { error: 'No response generated' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: assistantMessage,
      usage: result.usage
    })

  } catch (error) {
    console.error('API Route Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}