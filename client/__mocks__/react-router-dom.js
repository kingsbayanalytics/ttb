const React = require('react');
const originalModule = jest.requireActual('react-router-dom');

const mockedUsedNavigate = jest.fn();

module.exports = {
  __esModule: true,
  ...originalModule,
  useNavigate: () => mockedUsedNavigate,
  useLocation: () => ({ pathname: '/', search: '' }),
  BrowserRouter: ({ children }) => React.createElement('div', null, children),
  Link: ({ children, to, ...rest }) => React.createElement('a', { href: to, ...rest }, children),
  Routes: ({ children }) => React.createElement('div', null, children),
  Route: ({ element }) => element,
};