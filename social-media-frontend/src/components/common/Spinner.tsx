import React from 'react';

interface SpinnerProps {
  fullPage?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const Spinner: React.FC<SpinnerProps> = ({ fullPage, size = 'md' }) => {
  const sizes = { sm: '20px', md: '36px', lg: '56px' };

  const spinner = (
    <div className="spinner" style={{ width: sizes[size], height: sizes[size] }} />
  );

  if (fullPage) {
    return <div className="spinner-fullpage">{spinner}</div>;
  }

  return spinner;
};

export default Spinner;
