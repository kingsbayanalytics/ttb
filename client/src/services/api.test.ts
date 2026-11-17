import { attachAuthHeader, AuthService, resetAuthSessionCache } from './api';

describe('AuthService helpers', () => {
  beforeEach(() => {
    resetAuthSessionCache();
    localStorage.clear();
  });

  it('attaches Bearer token only in local mode and omits it in entra mode', () => {
    const localReq = attachAuthHeader({ headers: {} as Record<string, string> }, 'local', 'jwt-123');
    expect(localReq.headers.Authorization).toBe('Bearer jwt-123');

    const noTokenReq = attachAuthHeader({ headers: {} as Record<string, string> }, 'local', null);
    expect(noTokenReq.headers.Authorization).toBeUndefined();

    const entraReq = attachAuthHeader({ headers: {} as Record<string, string> }, 'entra', 'jwt-123');
    expect(entraReq.headers.Authorization).toBeUndefined();
  });

  it('reads and clears local user data in local mode', () => {
    expect(AuthService.getCachedAuthMode()).toBe('local');
    expect(AuthService.getCurrentUser()).toBeNull();

    localStorage.setItem('userToken', 'jwt-123');
    localStorage.setItem(
      'userData',
      JSON.stringify({ _id: 'u1', username: 'localuser', email: 'l@example.com', isAdmin: false })
    );
    expect(AuthService.getCurrentUser()?.username).toBe('localuser');

    AuthService.logout();
    expect(AuthService.getCurrentUser()).toBeNull();
    expect(localStorage.getItem('userToken')).toBeNull();
  });
});
