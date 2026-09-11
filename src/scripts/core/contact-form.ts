/**
 * RealTimeZones Contact Form Core Engine
 *
 * Provides client-side validation, RFC-compliant mailto URI construction,
 * clipboard message formatting, and strictly truthful user feedback states.
 * Guarantees no false claims of server-side delivery when no backend endpoint exists.
 */

export interface ContactFormData {
  name: string;
  email: string;
  message: string;
}

export interface ContactFormErrors {
  name?: string;
  email?: string;
  message?: string;
}

export interface ContactFormValidationResult {
  isValid: boolean;
  errors: ContactFormErrors;
  cleanedData?: ContactFormData;
}

export const DEFAULT_CONTACT_EMAIL = 'bitsharc.dev@gmail.com';

export const CONTACT_STATUS_MESSAGES = {
  draftOpened: 'Draft opened in your email client.',
  copiedToClipboard: 'Message copied to clipboard.',
  clipboardFailed: 'Could not copy the message to your clipboard.',
  clientFailedCopyFallback: 'Could not open email client. Copy the message instead.'
} as const;

export function getClipboardStatusMessage(copied: boolean): string {
  return copied ? CONTACT_STATUS_MESSAGES.copiedToClipboard : CONTACT_STATUS_MESSAGES.clipboardFailed;
}

// Standard email validation regex adhering to RFC 5322 specifications
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Validates contact form inputs on the client side.
 */
export function validateContactForm(data: Partial<ContactFormData>): ContactFormValidationResult {
  const errors: ContactFormErrors = {};

  const rawName = data.name ?? '';
  const trimmedName = typeof rawName === 'string' ? rawName.trim() : '';

  if (!trimmedName) {
    errors.name = 'Please provide your name.';
  } else if (trimmedName.length > 100) {
    errors.name = 'Name must be 100 characters or fewer.';
  }

  const rawEmail = data.email ?? '';
  const trimmedEmail = typeof rawEmail === 'string' ? rawEmail.trim() : '';

  if (!trimmedEmail) {
    errors.email = 'Please provide your email address.';
  } else if (trimmedEmail.length > 254 || !EMAIL_REGEX.test(trimmedEmail)) {
    errors.email = 'Please enter a valid email address (e.g., name@domain.com).';
  }

  const rawMessage = data.message ?? '';
  const trimmedMessage = typeof rawMessage === 'string' ? rawMessage.trim() : '';

  if (!trimmedMessage) {
    errors.message = 'Please enter your message.';
  } else if (trimmedMessage.length < 5) {
    errors.message = 'Message must be at least 5 characters long.';
  } else if (trimmedMessage.length > 5000) {
    errors.message = 'Message must be 5,000 characters or fewer.';
  }

  const isValid = Object.keys(errors).length === 0;

  return {
    isValid,
    errors,
    ...(isValid
      ? {
          cleanedData: {
            name: trimmedName,
            email: trimmedEmail,
            message: trimmedMessage
          }
        }
      : {})
  };
}

/**
 * Constructs a standard mailto: URL with pre-filled recipient, subject, and body.
 */
export function buildContactMailtoUrl(
  data: ContactFormData,
  recipient: string = DEFAULT_CONTACT_EMAIL
): string {
  const cleanRecipient = recipient.trim();
  const subject = `RealTimeZones Inquiry from ${data.name.trim()}`;
  const body = [
    `Name: ${data.name.trim()}`,
    `Email: ${data.email.trim()}`,
    '',
    'Message:',
    data.message.trim()
  ].join('\r\n');

  return `mailto:${cleanRecipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * Formats a clean, readable text block suitable for copying to clipboard.
 */
export function buildContactClipboardText(
  data: ContactFormData,
  recipient: string = DEFAULT_CONTACT_EMAIL
): string {
  return [
    `To: ${recipient}`,
    `Subject: RealTimeZones Inquiry from ${data.name.trim()}`,
    `From: ${data.name.trim()} <${data.email.trim()}>`,
    '',
    data.message.trim()
  ].join('\n');
}
