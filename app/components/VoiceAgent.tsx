'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface VoiceAgentProps {
  onSubmit: (transcript: string) => void;
  disabled?: boolean;
}

type SpeechRecognitionEventLite = {
  results: ArrayLike<{ 0: { transcript: string } }>;
};

interface SpeechRecognitionLite {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLite) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLite;

declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    SpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export function VoiceAgent({ onSubmit, disabled }: VoiceAgentProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognitionLite | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognitionAPI = window.webkitSpeechRecognition ?? window.SpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setSupported(false);
      return;
    }
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'en-IN';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognitionRef.current = recognition;

    recognition.onresult = (event: SpeechRecognitionEventLite) => {
      const latest = Array.from(event.results)
        .map((result) => result[0]?.transcript)
        .filter(Boolean)
        .join(' ');
      setTranscript(latest.trim());
    };

    recognition.onerror = () => {
      setIsRecording(false);
      setSupported(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, []);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
    if (transcript.trim()) {
      onSubmit(transcript.trim());
      setTranscript('');
    }
  }, [onSubmit, transcript]);

  const startRecording = useCallback(() => {
    if (!recognitionRef.current) return;
    setTranscript('');
    recognitionRef.current.start();
    setIsRecording(true);
  }, []);

  if (!supported) {
    return (
      <div className="section-card">
        <div className="card-header">
          <div>
            <h2>Voice Ops Console</h2>
            <p>Browser does not support Web Speech API. Operate through text commands below.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="section-card">
      <div className="card-header">
        <div>
          <h2>Voice Ops Console</h2>
          <p>Hold-to-record Jarvis. Drop daily targets, blockers, or quick fire commands.</p>
        </div>
        <span className="badge">Voice</span>
      </div>
      <div className="voice-controls">
        <button
          type="button"
          className="button-primary"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={disabled}
        >
          {isRecording ? 'Stop & Process' : 'Hold To Talk'}
        </button>
        <button
          type="button"
          className="button-outline"
          onClick={() => {
            if (transcript.trim()) {
              onSubmit(transcript.trim());
              setTranscript('');
            }
          }}
          disabled={disabled || !transcript.trim()}
        >
          Send Transcript
        </button>
        {transcript && <span className="status-chip">{transcript}</span>}
      </div>
    </div>
  );
}
