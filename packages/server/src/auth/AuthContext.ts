export interface AuthContext {
	userId: string;
	roles: string[];
	token?: string;
}

export type AuthRole = string;
