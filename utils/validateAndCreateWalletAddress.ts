import { parsePhoneNumberWithError } from "libphonenumber-js";

type PhoneValidationResult =
  | {
      success: true;
      formatted: string;
      country: string;
      nationalNumber: string;
      walletAddress: string;
    }
  | {
      success: false;
      error: string;
    };

export function validateAndCreateWalletAddress(
  input: string,
): PhoneValidationResult {
  try {
    const phoneNumber = parsePhoneNumberWithError(input);

    if (!phoneNumber.isValid()) {
      throw new Error("INVALID_PHONE_NUMBER");
    }

    const formatted = phoneNumber.format("E.164");
    const country = phoneNumber.country; // e.g. "NG"
    const nationalNumber = phoneNumber.nationalNumber;

    if (!country || !nationalNumber) {
      throw new Error("INCOMPLETE_PHONE_DATA");
    }

    // Cave Bank wallet format:
    // TCB-8077123456NG
    const walletAddress = `TCB-${nationalNumber}${country.toUpperCase()}`;

    return {
      success: true,
      formatted,
      country,
      nationalNumber,
      walletAddress,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "INVALID_PHONE_NUMBER",
    };
  }
}
