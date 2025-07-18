import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';

// Custom Render function to wrap components with necessary providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <Router>
      {children}
    </Router>
  );
};

const customRender = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything from @testing-library/react
export * from '@testing-library/react';

// Override the render method with our custom one
export { customRender as render };