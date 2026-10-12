// Pure, framework-free form validation. Keeping these out of the page
// components removes the duplicated email regex and keeps each form's
// submit handler small and testable.

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type FieldErrors = Record<string, string>;

export const isEmail = (value: string): boolean => EMAIL_RE.test(value.trim());

export const MIN_PASSWORD_LENGTH = 8;

export interface ContactFormValues {
  fullName: string;
  workEmail: string;
  company: string;
  jobTitle: string;
  businessType: string;
  primaryChallenge: string;
  message: string;
}

export function validateContactForm(v: ContactFormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (v.fullName.trim().length < 2) errors.fullName = "Please enter your full name (at least 2 characters).";
  if (!isEmail(v.workEmail)) errors.workEmail = "Please enter a valid work email address.";
  if (v.company.trim().length < 2) errors.company = "Please enter your company name.";
  if (v.jobTitle.trim().length < 2) errors.jobTitle = "Please enter your job title.";
  if (!v.businessType) errors.businessType = "Please select your business type.";
  if (!v.primaryChallenge) errors.primaryChallenge = "Please select your primary challenge.";
  if (v.message.length > 2000) errors.message = "Message must be 2,000 characters or fewer.";
  return errors;
}

export interface AuthFormValues {
  mode: "signin" | "signup";
  name: string;
  email: string;
  password: string;
  acceptTerms: boolean;
}

export function validateAuthForm(v: AuthFormValues): FieldErrors {
  const errors: FieldErrors = {};
  const isSignup = v.mode === "signup";
  if (isSignup && v.name.trim().length < 2) errors.name = "Please enter your name.";
  if (!isEmail(v.email)) errors.email = "Please enter a valid email address.";
  if (isSignup && v.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (!isSignup && v.password.length < 1) errors.password = "Please enter your password.";
  if (isSignup && !v.acceptTerms) errors.acceptTerms = "You must accept the Terms to create an account.";
  return errors;
}

export function validateDeletionRequest(email: string, details: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!isEmail(email)) errors.account_email = "Please enter a valid email address.";
  if (details.trim().length < 10) errors.request_details = "Please describe the request in at least 10 characters.";
  return errors;
}
