import z from "zod";

export const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be at most 30 characters")
  .regex(
    /^[a-zA-Z0-9_.]+$/,
    "Username may only contain letters, numbers, underscores, and dots",
  );

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters");

export const emailSchema = z.email("Invalid email address");

export const signInSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, "Password is required"),
});

export type SignInInput = z.infer<typeof signInSchema>;
