import React from "react";

interface TldrCalloutProps {
  problem: React.ReactNode;
  solution: React.ReactNode;
  how: React.ReactNode;
  benefit: React.ReactNode;
}

/**
 * Classic callout/alert style TL;DR card
 * Props: problem, solution, how, benefit (all strings or React nodes)
 */
const TldrCallout: React.FC<TldrCalloutProps> = ({ problem, solution, how, benefit }) => {
  return (
    <div style={{
      border: '2px solid #ffb300',
      borderRadius: '8px',
      background: '#fffbe7',
      padding: '1em',
      margin: '1em 0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
    }}>
      <b style={{fontSize: '1.2em'}}>🧃 TL;DR</b>
      <ul style={{margin: 0}}>
        <li><b>Problem:</b> {problem}</li>
        <li><b>Solution:</b> {solution}</li>
        <li><b>How it Works:</b> {how}</li>
        <li><b>Benefit:</b> {benefit}</li>
      </ul>
    </div>
  );
};

export default TldrCallout;
