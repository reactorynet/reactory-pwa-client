import { isAnonymousSession, selectRoutesForSession } from '../auth';
import { createMockReactory, protectedHomeRoute, publicLoginRoute } from './testUtils';

describe('selectRoutesForSession', () => {
  const guestHome: Reactory.Routing.IReactoryRoute = {
    id: 'home_guest',
    key: 'home_guest',
    path: '/',
    public: true,
    roles: ['ANON'],
    componentFqn: 'core.StaticContent@1.0.0',
  };

  it('keeps public and ANON routes for anonymous users', () => {
    const reactory = createMockReactory({ isAnon: true, roles: ['ANON'] });
    const selected = selectRoutesForSession(
      [publicLoginRoute(), guestHome, protectedHomeRoute()],
      reactory,
    );
    expect(selected.map((route) => route.key)).toEqual(['login', 'home_guest']);
  });

  it('drops ANON-only routes after login', () => {
    const reactory = createMockReactory({ isAnon: false, roles: ['USER'] });
    const selected = selectRoutesForSession(
      [publicLoginRoute(), guestHome, protectedHomeRoute()],
      reactory,
    );
    expect(selected.map((route) => route.key)).toEqual(['home']);
  });
});

describe('isAnonymousSession', () => {
  it('treats a loggedIn user as authenticated even if isAnon is stale', () => {
    const reactory = createMockReactory({ isAnon: true, roles: ['ANON'] });
    reactory.getUser.mockReturnValue({
      loggedIn: { roles: ['USER'] },
      roles: ['ANON'],
    });
    expect(isAnonymousSession(reactory)).toBe(false);
  });
});
