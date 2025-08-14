import React from 'react';

export const DebugEnv: React.FC = () => {
  if (process.env.NODE_ENV === 'production') {
    return null; // Don't show in production
  }

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '300px'
    }}>
      <h4>Environment Variables Debug:</h4>
      <div>NEXT_PUBLIC_API_URL: {process.env.NEXT_PUBLIC_API_URL || 'NOT SET'}</div>
      <div>NEXT_PUBLIC_WS_URL: {process.env.NEXT_PUBLIC_WS_URL || 'NOT SET'}</div>
      <div>NODE_ENV: {process.env.NODE_ENV}</div>
    </div>
  );
};
