'use client';

import { AgentMessage } from '@/lib/types';

interface AgentChatProps {
  messages: AgentMessage[];
}

export function AgentChat({ messages }: AgentChatProps) {
  return (
    <div className="section-card">
      <div className="card-header">
        <div>
          <h2>Control Room Feed</h2>
          <p>Jarvis keeps a live log of everything we discuss and action.</p>
        </div>
        <span className="badge">Realtime</span>
      </div>
      <div className="chat-window">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.role === 'agent' ? 'agent' : ''}`}>
            <h3>{message.role === 'agent' ? 'Jarvis' : 'You'}</h3>
            <p>{message.text}</p>
          </div>
        ))}
        {!messages.length && (
          <div className="message agent">
            <h3>Jarvis</h3>
            <p>
              Systems standing by. Start talking—upload catalog sheets, dictate tasks, or feed me performance metrics.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
