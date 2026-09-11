import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  validateContactForm,
  buildContactMailtoUrl,
  buildContactClipboardText,
  getClipboardStatusMessage,
  DEFAULT_CONTACT_EMAIL,
  CONTACT_STATUS_MESSAGES
} from '../src/scripts/core/contact-form.ts';

describe('Truthful Contact Form & Client-Side Actions', () => {
  it('rejects empty or missing fields with specific field errors', () => {
    const result = validateContactForm({});
    assert.strictEqual(result.isValid, false);
    assert.ok(result.errors.name, 'Expected error on empty name');
    assert.ok(result.errors.email, 'Expected error on empty email');
    assert.ok(result.errors.message, 'Expected error on empty message');
  });

  it('rejects whitespace-only fields', () => {
    const result = validateContactForm({
      name: '   ',
      email: '   ',
      message: '   \n\t  '
    });
    assert.strictEqual(result.isValid, false);
    assert.ok(result.errors.name);
    assert.ok(result.errors.email);
    assert.ok(result.errors.message);
  });

  it('rejects invalid email formats', () => {
    const invalidEmails = [
      'plainaddress',
      '#@%^%#$@#$@#.com',
      '@example.com',
      'Joe Smith <email@example.com>',
      'email.example.com',
      'email@example@example.com',
      'email@example'
    ];

    for (const email of invalidEmails) {
      const result = validateContactForm({
        name: 'Alice',
        email,
        message: 'Hello team, I need help with timezones.'
      });
      assert.strictEqual(result.isValid, false, `Expected invalid for email: ${email}`);
      assert.ok(result.errors.email, `Expected email error for: ${email}`);
    }
  });

  it('enforces length boundaries for name, email, and message', () => {
    const tooLongName = 'A'.repeat(101);
    const tooLongEmail = 'a'.repeat(250) + '@example.com';
    const tooShortMessage = 'Hi';
    const tooLongMessage = 'M'.repeat(5001);

    const res1 = validateContactForm({
      name: tooLongName,
      email: 'test@example.com',
      message: 'Valid message length here.'
    });
    assert.strictEqual(res1.isValid, false);
    assert.ok(res1.errors.name);

    const res2 = validateContactForm({
      name: 'Alice',
      email: tooLongEmail,
      message: 'Valid message length here.'
    });
    assert.strictEqual(res2.isValid, false);
    assert.ok(res2.errors.email);

    const res3 = validateContactForm({
      name: 'Alice',
      email: 'test@example.com',
      message: tooShortMessage
    });
    assert.strictEqual(res3.isValid, false);
    assert.ok(res3.errors.message);

    const res4 = validateContactForm({
      name: 'Alice',
      email: 'test@example.com',
      message: tooLongMessage
    });
    assert.strictEqual(res4.isValid, false);
    assert.ok(res4.errors.message);
  });

  it('accepts valid input and trims fields', () => {
    const result = validateContactForm({
      name: '  Bob Smith  ',
      email: '  bob.smith@example.org  ',
      message: '  We love the Chronos desktop app, thank you!  '
    });
    assert.strictEqual(result.isValid, true);
    assert.deepStrictEqual(result.errors, {});
    assert.strictEqual(result.cleanedData?.name, 'Bob Smith');
    assert.strictEqual(result.cleanedData?.email, 'bob.smith@example.org');
    assert.strictEqual(result.cleanedData?.message, 'We love the Chronos desktop app, thank you!');
  });

  it('builds a valid RFC-compliant mailto URL with encoded subject and body', () => {
    const mailto = buildContactMailtoUrl({
      name: 'Alice Cooper',
      email: 'alice@rock.com',
      message: 'Question about DST in London.'
    });

    assert.ok(mailto.startsWith(`mailto:${DEFAULT_CONTACT_EMAIL}?`));
    assert.ok(mailto.includes('subject='));
    assert.ok(mailto.includes('body='));

    // Check decoded content inside mailto query params
    const parsedUrl = new URL(mailto);
    assert.strictEqual(parsedUrl.pathname, DEFAULT_CONTACT_EMAIL);
    const subject = parsedUrl.searchParams.get('subject') || '';
    const body = parsedUrl.searchParams.get('body') || '';

    assert.ok(subject.includes('Alice Cooper'));
    assert.ok(body.includes('Alice Cooper'));
    assert.ok(body.includes('alice@rock.com'));
    assert.ok(body.includes('Question about DST in London.'));
  });

  it('builds clean clipboard text with headers and message body', () => {
    const clip = buildContactClipboardText({
      name: 'Charlie',
      email: 'charlie@remote.io',
      message: 'Feature suggestion: add UTC offset toggle.'
    });

    assert.ok(clip.includes(`To: ${DEFAULT_CONTACT_EMAIL}`));
    assert.ok(clip.includes('From: Charlie <charlie@remote.io>'));
    assert.ok(clip.includes('Subject: '));
    assert.ok(clip.includes('Feature suggestion: add UTC offset toggle.'));
  });

  it('strictly defines truthful feedback messages and forbids false delivery claims', () => {
    assert.strictEqual(
      CONTACT_STATUS_MESSAGES.draftOpened,
      'Draft opened in your email client.'
    );
    assert.strictEqual(
      CONTACT_STATUS_MESSAGES.copiedToClipboard,
      'Message copied to clipboard.'
    );
    assert.strictEqual(
      CONTACT_STATUS_MESSAGES.clientFailedCopyFallback,
      'Could not open email client. Copy the message instead.'
    );

    // Verify the UI has a distinct honest message when copying fails.
    assert.notStrictEqual(
      getClipboardStatusMessage(false),
      CONTACT_STATUS_MESSAGES.copiedToClipboard
    );
    assert.strictEqual(
      getClipboardStatusMessage(true),
      CONTACT_STATUS_MESSAGES.copiedToClipboard
    );

    // Verify no status message claims server delivery or receipt
    const allMessages = Object.values(CONTACT_STATUS_MESSAGES);
    for (const msg of allMessages) {
      assert.strictEqual(
        /sent successfully|message received|delivered|has been received/i.test(msg),
        false,
        `Untruthful message found: ${msg}`
      );
    }
  });
});
