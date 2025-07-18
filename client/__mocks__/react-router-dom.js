const React = require('react');
const originalModule = jest.requireActual('react-router-dom');

const mockedUsedNavigate = jest.fn();

module.exports = {
  __esModule: true,
  ...originalModule,
  useNavigate: () => mockedUsedNavigate,
  BrowserRouter: ({ children }) => React.createElement('div', null, children),
  Link: ({ children, to }) => React.createElement('a', { href: to }, children),
  Routes: ({ children }) => React.createElement('div', null, children),
  Route: ({ element }) => element,
};