import { authOptions } from './auth-options';
import NextAuth from 'next-auth';

export { authOptions };
export default NextAuth(authOptions);
