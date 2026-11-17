const React = require('react');
const originalModule = jest.requireActual('react-router');

module.exports = {
  __esModule: true,
  ...originalModule,
  useLocation: () => ({ pathname: '/', search: '' }),
  useParams: () => ({}),
  useRouteMatch: () => ({ url: '/', path: '/', isExact: true, params: {} }),
};