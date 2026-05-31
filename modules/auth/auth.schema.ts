import { z } from "zod";

export const startSchema = z.object({
  phone: z.string().regex(/^\+\d{10,16}$/, "Invalid phone number"),
});

export const verifySchema = z.object({
  id: z.string(),
  pin: z
    .string("Pin must be a string.")
    .length(4, "PIN must be exactly 4 digits.")
    .regex(/^\d+$/, "PIN must contain only digits."),
});
