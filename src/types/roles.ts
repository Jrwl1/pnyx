// WHAT IT DO? Defines auth roles and helper checks for route authorization.
export type Role = "anonymous" | "user" | "moderator" | "admin";

export const roleOrder: Record<Role, number> = {
  anonymous: 0,
  user: 1,
  moderator: 2,
  admin: 3
};

export const isKnownRole = (role: string): role is Role => {
  return role in roleOrder;
};
