/**
 * Test accounts from
 * reactory-express-server/src/data/clientConfigs/booktutor/authentication/users.yaml
 * Keep this in sync manually - it's a separate repo from the server, so it
 * can't import the yaml directly.
 */
export interface BooktutorTestUser {
  email: string;
  username: string;
  password: string;
  roles: string[];
}

export const USERS = {
  student: {
    email: 'test_user@mail.com',
    username: 'test_user',
    password: 'test1234',
    roles: ['USER'],
  },
  developer: {
    email: 'test_developer@mail.com',
    username: 'test_developer',
    password: 'test1234',
    roles: ['USER', 'DEVELOPER'],
  },
  admin: {
    email: 'test_admin@mail.com',
    username: 'test_admin',
    password: 'test1234',
    roles: ['USER', 'DEVELOPER', 'ADMIN'],
  },
  tutor: {
    email: 'werner.weber@gmail.com',
    username: 'fourtyslevin',
    password: 'Password123',
    roles: ['USER', 'DEVELOPER', 'ADMIN', 'STUDENT', 'TUTOR'],
  },
} satisfies Record<string, BooktutorTestUser>;
