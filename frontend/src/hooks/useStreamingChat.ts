import { useState, useCallback } from 'react';

interface ThinkingStep {
  content: string;
  step: number;
  timestamp: number;
}

interface StreamingState {
  isThinking: boolean;
  thinkingSteps: ThinkingStep[];
  thinkingComplete: boolean;
  thinkingDuration?: number;
  response: string;
  error?: string;
}

export const useStreamingChat = () => {
  const [streamState, setStreamState] = useState<StreamingState>({
    isThinking: false,
    thinkingSteps: [],
    thinkingComplete: false,
    response: ''
  });

  const sendMessage = useCallback(async (message: string, conversationId?: string) => {
    // Reset state
    setStreamState({
      isThinking: false,
      thinkingSteps: [],
      thinkingComplete: false,
      response: ''
    });

    try {
      const response = await fetch('http://localhost:5001/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ message, conversation_id: conversationId })
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No reader available');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;

            try {
              const event = JSON.parse(data);

              switch (event.type) {
                case 'thinking_start':
                  setStreamState(prev => ({
                    ...prev,
                    isThinking: true
                  }));
                  break;

                case 'thinking_step':
                  setStreamState(prev => ({
                    ...prev,
                    thinkingSteps: [...prev.thinkingSteps, {
                      content: event.content,
                      step: event.step,
                      timestamp: event.timestamp
                    }]
                  }));
                  break;

                case 'thinking_complete':
                  setStreamState(prev => ({
                    ...prev,
                    isThinking: false,
                    thinkingComplete: true,
                    thinkingDuration: event.duration
                  }));
                  break;

                case 'response':
                  setStreamState(prev => ({
                    ...prev,
                    response: event.content
                  }));
                  break;

                case 'error':
                  setStreamState(prev => ({
                    ...prev,
                    error: event.message
                  }));
                  break;
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      setStreamState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, []);

  return {
    streamState,
    sendMessage
  };
};
