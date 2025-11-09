'use client';

import { FormEvent, useCallback, useState } from 'react';
import { AgentChat } from './components/AgentChat';
import { VoiceAgent } from './components/VoiceAgent';
import { CatalogAssistant } from './components/CatalogAssistant';
import { TaskPlanner } from './components/TaskPlanner';
import { generateAgentResponse } from '@/lib/agent';
import { AgentMessage, CatalogDataset, TaskRecommendation } from '@/lib/types';

let counter = 0;

function createMessage(role: AgentMessage['role'], text: string): AgentMessage {
  counter += 1;
  return {
    id: `${role}-${Date.now()}-${counter}`,
    role,
    text,
    timestamp: new Date().toISOString()
  };
}

function speak(text: string) {
  if (typeof window === 'undefined') return;
  const synth = window.speechSynthesis;
  if (!synth) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.pitch = 1.02;
  utterance.lang = 'en-IN';
  synth.cancel();
  synth.speak(utterance);
}

export default function HomePage() {
  const [messages, setMessages] = useState<AgentMessage[]>(() => [
    createMessage(
      'agent',
      'Jarvis online. Upload your catalog, read out today\'s metrics, or just say what needs fixing. I will handle Amazon, Flipkart, Meesho, and Myntra workflows.'
    )
  ]);
  const [catalog, setCatalog] = useState<CatalogDataset | null>(null);
  const [tasks, setTasks] = useState<TaskRecommendation[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const processMessage = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      setIsProcessing(true);
      setMessages((prev) => {
        const userMessage = createMessage('user', text);
        const updatedConversation = [...prev, userMessage];
        const response = generateAgentResponse({
          message: text,
          conversation: updatedConversation,
          catalog,
          tasks
        });
        const agentMessage = createMessage('agent', response);
        speak(response);
        return [...updatedConversation, agentMessage];
      });
      setIsProcessing(false);
    },
    [catalog, tasks]
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!input.trim()) return;
    processMessage(input.trim());
    setInput('');
  };
  return (
    <main>
      <div className="container">
        <header>
          <h1>Jarvis Commerce Desk</h1>
          <p>
            Voice-native command center for e-commerce operators. Generate listings, triage Amazon/Flipkart/Meesho/Myntra
            tasks, and steer daily execution through a single agent.
          </p>
        </header>
        <div className="section-grid">
          <VoiceAgent onSubmit={processMessage} disabled={isProcessing} />
          <div className="section-card">
            <div className="card-header">
              <div>
                <h2>Text Command Console</h2>
                <p>Type directives if you are away from the mic. Jarvis responds instantly.</p>
              </div>
              <span className="badge">Text</span>
            </div>
            <form onSubmit={handleSubmit} className="grid-two">
              <div style={{ gridColumn: '1 / -1' }}>
                <textarea
                  rows={3}
                  value={input}
                  placeholder="Example: Jarvis, prep Flipkart listing copy for the new kurta set and draft a promotion plan."
                  onChange={(event) => setInput(event.target.value)}
                />
              </div>
              <button type="submit" className="button-primary" disabled={isProcessing}>
                {isProcessing ? 'Working...' : 'Send Command'}
              </button>
            </form>
          </div>
        </div>
        <AgentChat messages={messages} />
        <CatalogAssistant onCatalogUpdate={setCatalog} />
        <TaskPlanner onTasksUpdate={setTasks} />
      </div>
    </main>
  );
}
