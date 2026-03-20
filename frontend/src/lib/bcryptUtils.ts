import { hash, compare } from 'bcryptjs';

export async function hashPassword(password: string): Promise<string> {
    return await hash(password, 10);
}

export async function comparePassword(password: string, hashed: string): Promise<boolean> {
    return await compare(password, hashed);
}
