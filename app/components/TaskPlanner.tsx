'use client';

import { useMemo, useState } from 'react';
import { craftTasksFromSnapshot, extractMetrics, upsertTasks } from '@/lib/tasks';
import { PerformanceSnapshot, TaskRecommendation } from '@/lib/types';

interface TaskPlannerProps {
  onTasksUpdate: (tasks: TaskRecommendation[]) => void;
}

const PRIORITY_BADGE: Record<TaskRecommendation['priority'], string> = {
  high: 'status-chip warning',
  medium: 'status-chip',
  low: 'status-chip'
};

export function TaskPlanner({ onTasksUpdate }: TaskPlannerProps) {
  const [metricsInput, setMetricsInput] = useState('CTR: 0, Conversion: 0, Cancellation Rate: 0');
  const [snapshot, setSnapshot] = useState<PerformanceSnapshot | null>(null);
  const [tasks, setTasks] = useState<TaskRecommendation[]>([]);

  const handleAnalyze = () => {
    if (!metricsInput.trim()) return;
    const parsedSnapshot = extractMetrics(metricsInput);
    const generatedTasks = craftTasksFromSnapshot(parsedSnapshot);
    const merged = upsertTasks(tasks, generatedTasks);
    setSnapshot(parsedSnapshot);
    setTasks(merged);
    onTasksUpdate(merged);
  };

  const openTasks = useMemo(() => tasks.filter((task) => task.status !== 'done'), [tasks]);

  const toggleStatus = (id: string) => {
    setTasks((prev) => {
      const updated = prev.map((task) =>
        task.id === id
          ? {
              ...task,
              status: (task.status === 'done' ? 'pending' : 'done') as TaskRecommendation['status']
            }
          : task
      );
      onTasksUpdate(updated);
      return updated;
    });
  };

  return (
    <div className="section-card">
      <div className="card-header">
        <div>
          <h2>Mission Control</h2>
          <p>Feed raw performance rows. Jarvis spins execution-ready action plans instantly.</p>
        </div>
        <span className="badge">Tasks</span>
      </div>
      <div>
        <label htmlFor="metrics-input">Performance Snapshot</label>
        <textarea
          id="metrics-input"
          rows={4}
          value={metricsInput}
          placeholder="Amazon CTR: 0.9, Conversion: 1.4, Cancellation Rate: 2.1, Return Rate: 3.5"
          onChange={(event) => setMetricsInput(event.target.value)}
        />
        <p className="helper-text">Paste metrics from Amazon, Flipkart, Meesho, or Myntra daily reports.</p>
      </div>
      <div className="inline-actions">
        <button type="button" className="button-primary" onClick={handleAnalyze}>
          Generate Action Plan
        </button>
        {snapshot && <span className="status-chip">{snapshot.narrative}</span>}
      </div>
      <div className="section-grid">
        {openTasks.length === 0 ? (
          <p>No open tasks. Provide fresh metrics or voice commands to create a new sprint.</p>
        ) : (
          openTasks.map((task) => (
            <div key={task.id} className="message">
              <div className="card-header">
                <strong>{task.title}</strong>
                <span className={PRIORITY_BADGE[task.priority]}>{task.priority.toUpperCase()}</span>
              </div>
              <p>{task.description}</p>
              <div className="tag-list">
                {task.tags.map((tag) => (
                  <span key={tag} className="tag">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="inline-actions" style={{ marginTop: '0.6rem' }}>
                <button type="button" className="button-outline" onClick={() => toggleStatus(task.id)}>
                  Mark {task.status === 'done' ? 'Pending' : 'Complete'}
                </button>
                {task.metricImpact && (
                  <span className="helper-text">
                    Impact →{' '}
                    {Object.entries(task.metricImpact)
                      .map(([metric, value]) => `${metric}: ${value}`)
                      .join(' | ')}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
