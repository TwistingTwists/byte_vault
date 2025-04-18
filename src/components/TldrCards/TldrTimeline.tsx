import React from "react";

interface TimelineStep {
  label: string;
  content: React.ReactNode;
}

interface TldrTimelineProps {
  steps: TimelineStep[];
}

/**
 * Step-by-step timeline TL;DR card
 * Props: steps (array of {label: string, content: string|ReactNode})
 */
const TldrTimeline: React.FC<TldrTimelineProps> = ({ steps }) => {
  return (
    <div style={{
      borderLeft: '4px solid #ffa726',
      background: '#fff8e1',
      padding: '1em 1.5em',
      margin: '1em 0'
    }}>
      <b>🧃 TL;DR Timeline:</b>
      <ol style={{margin: 0, paddingLeft: '1.2em'}}>
        {steps.map((step, idx) => (
          <li key={idx}><b>{step.label}:</b> {step.content}</li>
        ))}
      </ol>
    </div>
  );
};

export default TldrTimeline;
