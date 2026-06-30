import { log, span, error } from "@oisasoje/gloo";
import {
  getSession,
  loginAuthStart,
  signupAuthStart,
  logoutUser,
  loginAuthVerify,
  signupAuthOTP,
  signupCreatePin,
  resendAuthOTP,
  verifyUserPin,
  changeUserPin,
  setNewPin,
  resetPinConfirmOTP,
  resetPinSendOTP,
  resendResetOTP,
} from "./auth.service.js";
import {
  resendOTPSchema,
  resetStartSchema,
  setNewPinSchema,
  startSchema,
  verifyLoginSchema,
  verifyResetOTPSchema,
  verifySignupOTP,
} from "./auth.schema.js";
import { Request, Response } from "express";
import maskEmail from "../../utils/maskEmail.js";

const isProd = process.env.NODE_ENV === "production";

export async function signupStart(req: Request, res: Response) {
  const result = startSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ message: result.error.issues });
  }

  try {
    const { phone } = result.data;
    log(`Starting signup process for phone: ${phone}`);

    const { userEmail, attempt } = await signupAuthStart(phone);
    log(
      `Signup attempt created with ID: ${attempt.id} for email: ${userEmail}`,
    );
    const email = maskEmail(userEmail);

    return res.status(200).send({ data: { id: attempt.id, email } });
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
}

export async function signupVerifyOTP(req: Request, res: Response) {
  const result = verifySignupOTP.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ message: result.error.issues });
  }
  try {
    const { id, otp } = result.data;

    const { setupToken } = await signupAuthOTP(id, otp);
    log(`Sending OTP for signup userID: ${id}`);

    res.json({
      message: "Email verified successfully!",
      data: {
        setup_token_id: setupToken,
      },
    });
  } catch (err: any) {
    error(err);
    return res.status(401).json({ message: err.message });
  }
}

export async function resendOTP(req: Request, res: Response) {
  const result = resendOTPSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ message: result.error.issues });
  }

  try {
    const { id } = result.data;

    resendAuthOTP(id);
  } catch (err: any) {
    return res.status(401).json({ message: err.message });
  }
}

export async function createPin(req: Request, res: Response) {
  const { setup_token_id, pin } = req.body;

  try {
    const { session } = await signupCreatePin(setup_token_id, pin);
    // Set the sessionId cookie for session authentication
    res.cookie("sessionId", session.id, {
      httpOnly: true,
      path: "/",
      secure: isProd,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });
    return res.status(200).send({ message: "Pin created successfully" });
  } catch (err: any) {
    error(err);
    return res.status(401).json({ message: err.message });
  }
}

export async function loginStart(req: Request, res: Response) {
  const result = startSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ message: result.error.issues });
  }

  try {
    const { phone } = result.data;

    const attempt = await loginAuthStart(phone);

    return res.status(200).send({ data: { id: attempt.id } });
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
}

export async function loginVerify(req: Request, res: Response) {
  const result = verifyLoginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ message: result.error.issues });
  }
  try {
    const { id, pin } = result.data;

    const { user, session } = await loginAuthVerify(id, pin);

    let { pin_hash, id: userId, is_admin, name, ..._ } = user;

    // Set the sessionId cookie for session authentication
    res.cookie("sessionId", session.id, {
      httpOnly: true,
      path: "/",
      secure: isProd,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    res.json({
      message: "Login successful!",
      data: {
        user: {
          id: userId,
          name,
          isAdmin: is_admin,
        },
      },
    });
  } catch (err: any) {
    error(err);
    return res.status(401).json({ message: err.message });
  }
}

export async function me(req: Request, res: Response) {
  log("Retrieving session data");
  const sessionId = req.cookies.sessionId;

  if (!sessionId) {
    return res.status(401).json({
      message: "Authentication required.",
    });
  }

  const result = await span("getSession operation", () =>
    getSession(sessionId),
  );

  if (!result) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const {
    pin_hash,
    academic_status,
    created_at,
    schools_attended,
    member_since_month,
    member_since_year,
    updated_at,
    deactivated_at,
    is_active,
    space,
    birthday,
    tribe,
    phone,
    email,
    ...userWithoutPin
  } = result.session.user;
  const wallet_address = result.wallet_address;
  const accountId = result.accountId;

  return res.json({
    data: {
      user: userWithoutPin,
      wallet_address,
      accountId,
    },
  });
}

export async function verifyUserPinController(req: Request, res: Response) {
  try {
    const { pin } = req.body;

    if (!pin) {
      return res.status(400).json({ message: "Pin is required." });
    }
    const userId = req.user.id;

    if (!userId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const valid = await verifyUserPin(userId, pin);

    return res.status(200).json({ message: "Pin verified successfully." });
  } catch (error: any) {
    return res.status(401).json({ message: "Invalid pin." });
  }
}

export async function changeUserPinController(req: Request, res: Response) {
  try {
    const { newPin } = req.body;

    if (!newPin) {
      return res.status(400).json({ message: "New pin is required." });
    }
    const userId = req.user.id;

    if (!userId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    await changeUserPin(userId, newPin);

    return res.status(200).json({ message: "Pin changed successfully." });
  } catch (error: any) {
    return res.status(400).json({ message: "Failed to change pin." });
  }
}

export async function resetPinStart(req: Request, res: Response) {
  const result = resetStartSchema.safeParse(req.body); // same {phone} schema as login/signup
  if (!result.success) {
    return res.status(400).json({ message: result.error.issues });
  }

  try {
    const { id } = result.data;
    log(`Starting PIN reset for id: ${id}`);

    const { userEmail, attempt } = await resetPinSendOTP(id);
    const email = maskEmail(userEmail);

    log(`Reset attempt created with ID: ${attempt.id} for email: ${email}`);

    return res.status(200).send({ data: { id: attempt.id, email } });
  } catch (err: any) {
    error(err);
    return res.status(400).json({ message: err.message });
  }
}

export async function resetPinVerifyOTP(req: Request, res: Response) {
  const result = verifyResetOTPSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ message: result.error.issues });
  }

  try {
    const { reset_token_id, otp } = result.data;

    const { resetToken } = await resetPinConfirmOTP(reset_token_id, otp);
    log(`OTP confirmed for reset attempt ID: ${reset_token_id}`);

    return res.status(200).json({
      message: "OTP verified successfully!",
      data: { reset_token_id: resetToken },
    });
  } catch (err: any) {
    error(err);
    return res.status(401).json({ message: err.message });
  }
}

export async function resetPinSetNew(req: Request, res: Response) {
  const result = setNewPinSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ message: result.error.issues });
  }

  try {
    const { reset_token_id, newPin } = result.data;

    await setNewPin(reset_token_id, newPin);
    log(`PIN reset completed for token: ${reset_token_id}`);

    return res.status(200).json({ message: "PIN reset successfully." });
  } catch (err: any) {
    error(err);
    return res.status(400).json({ message: err.message });
  }
}

export async function resetPinResendOTP(req: Request, res: Response) {
  const result = resendOTPSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ message: result.error.issues });
  }

  try {
    const { id } = result.data;
    const { email } = await resendResetOTP(id);

    return res.status(200).json({
      message: "A new OTP has been sent.",
      data: { email },
    });
  } catch (err: any) {
    error(err);
    return res.status(400).json({ message: err.message });
  }
}

export async function logout(req: Request, res: Response) {
  log("Logging out user");
  const sessionId = req.cookies.sessionId;

  if (sessionId) {
    await span("logoutUser operation", () => logoutUser(sessionId));
  }

  res.clearCookie("sessionId");
  return res.json({ message: "Logout successful" });
}
