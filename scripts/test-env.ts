import dotenv from 'dotenv';
import path from 'path';

console.log('Current working directory:', process.cwd());
const envPath = path.resolve(process.cwd(), '.env');
console.log('Target .env path:', envPath);

const res1 = dotenv.config({ path: envPath });
console.log('.env load result:', res1);

const envLocalPath = path.resolve(process.cwd(), '.env.local');
console.log('Target .env.local path:', envLocalPath);
const res2 = dotenv.config({ path: envLocalPath, override: true });
console.log('.env.local load result:', res2);

console.log('Loaded DATABASE_URL:', process.env.DATABASE_URL);
