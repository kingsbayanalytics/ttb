import { render, screen } from './test-utils';
import App from './App';

describe('App', () => {
  const originalLocation = window.location;

  beforeAll(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, href: '' },
    });
  });

  afterAll(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  test('renders App component', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /Type the Bible/i })).toBeInTheDocument();
  });
});
