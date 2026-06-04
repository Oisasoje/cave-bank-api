import { z } from "zod";

export const startSchema = z.object({
  phone: z.string().regex(/^\+\d{10,16}$/, "Invalid phone number"),
});
export const resendOTPSchema = z.object({
  id: z.string(),
});

export const verifyLoginSchema = z.object({
  id: z.string(),
  pin: z
    .string("Pin must be a string.")
    .length(4, "PIN must be exactly 4 digits.")
    .regex(/^\d+$/, "PIN must contain only digits."),
});

export const verifySignupOTP = z.object({
  id: z.string(),
  otp: z
    .string()
    .length(6, "OTP must be exactly 6 digits.")
    .regex(/^\d+$/, "OTP must contain only digits."),
});
