import React from "react";

interface TldrComicProps {
  villain: React.ReactNode;
  superpower: React.ReactNode;
  secret: React.ReactNode;
  victory: React.ReactNode;
}

/**
 * Fun comic-style TL;DR card
 * Props: villain, superpower, secret, victory (all strings or React nodes)
 */
const TldrComic: React.FC<TldrComicProps> = ({ villain, superpower, secret, victory }) => {
  return (
    <div style={{
      border: '3px dashed #8c9eff',
      borderRadius: '12px',
      background: '#e3eaff',
      padding: '1.5em',
      margin: '1.5em 0',
      fontFamily: 'Comic Sans MS, Comic Sans, cursive'
    }}>
      <span style={{fontSize: '1.4em'}}>🦸‍♂️ TL;DR Hero!</span>
      <ul>
        <li><b>Villain:</b> {villain}</li>
        <li><b>Superpower:</b> {superpower}</li>
        <li><b>Secret:</b> {secret}</li>
        <li><b>Victory:</b> {victory}</li>
      </ul>
    </div>
  );
};

export default TldrComic;
