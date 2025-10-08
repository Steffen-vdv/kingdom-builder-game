export interface AuthContext {
	userId: string;
	roles: string[];
	token: string;
}

export interface RequestContext {
	auth?: AuthContext;
}

export type RequestHeaders = Record<string, string | string[] | undefined>;

export interface AuthorizationRequirements {
	requiredRoles?: string[];
}
