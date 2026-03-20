
import { Sale, BusinessSettings } from '@/types';
import { isIOS } from './deviceDetection';

export interface SMSOptions {
  phoneNumber: string;
  message: string;
}

export const formatPhoneForSMS = (phoneNumber: string): string => {
  // Remove all non-digit characters except + at the beginning
  const cleaned = phoneNumber.replace(/[^\d+]/g, '');

  // If it starts with +, keep it, otherwise just return the digits
  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  return cleaned;
};

export const formatMessageForSMS = (content: string, businessName?: string): string => {
  // Replace non-breaking spaces and other special whitespace with standard spaces
  // \u00A0 is non-breaking space, \u200B is zero-width space, etc.
  const sanitized = content.replace(/[\u00A0\u1680\u180e\u2000-\u2009\u200a\u200b\u202f\u205f\u3000]/g, ' ');

  // Remove excessive whitespace and format for SMS
  let formatted = sanitized
    .replace(/\n\s*\n/g, '\n\n') // Clean up multiple line breaks
    .replace(/^\s+|\s+$/g, '') // Trim whitespace
    .substring(0, 800); // Limit to reasonable SMS length

  // Add business signature if provided
  if (businessName) {
    formatted += `\n\n- ${businessName}`;
  }

  return formatted;
};

export const getBirthdayMessage = (customerName: string): string => {
  return `🎉 Happy Birthday ${customerName}! 🎉

Wishing you a day filled with joy, love, and great memories. Thank you for being a valued part of our family. We're grateful for your support and wish you nothing but happiness in the year ahead!

May this new year of your life bring you wonderful opportunities and amazing experiences.`;
};

export const getWeMissYouMessage = (customerName: string): string => {
  return `Dear ${customerName},

We Miss You!

It's been a while since we last heard from you, and we just wanted to reach out. We truly value you as a customer and would love to see you again.

If there's anything we can do to assist you or if you need any help, we're always here for you!

We hope to serve you again soon.

Yours faithfully,`;
};

export const getThankYouMessage = (sale: Sale, settings: BusinessSettings): string => {
  const saleTotal = sale.items.reduce((total, item) => {
    const itemSubtotal = item.price * item.quantity;
    const discountAmount = item.discountType === 'amount'
      ? (item.discountAmount || 0)
      : (itemSubtotal * (item.discountPercentage || 0)) / 100;
    return total + (itemSubtotal - discountAmount);
  }, 0);

  // Add tax if applicable
  const taxAmount = saleTotal * ((sale.taxRate || 0) / 100);
  const totalWithTax = saleTotal + taxAmount;

  // Create items list
  const itemsList = sale.items.map(item =>
    `• ${item.description} (Qty: ${item.quantity})`
  ).join('\n');

  return `Dear ${sale.customerName},

We wanted to take a moment to express our sincere gratitude for your continued support and trust in our business.

Receipt Number: ${sale.receiptNumber}

Items Purchased:
${itemsList}

Total Amount: ${settings.currency} ${totalWithTax.toLocaleString()}

In case of any inquiries please call ${settings.businessPhone && settings.businessPhone !== '(123) 456-7890' ? settings.businessPhone : 'our office'}.

We appreciate your business and look forward to serving you again.

Yours faithfully,
${settings.businessName || 'Management'}`;
};

export const openSMSApp = (options: SMSOptions): void => {
  const { phoneNumber, message } = options;
  const formattedPhone = formatPhoneForSMS(phoneNumber);
  const encodedMessage = encodeURIComponent(message);

  const smsUrl = isIOS() 
    ? `sms:${formattedPhone}&body=${encodedMessage}` 
    : `sms:${formattedPhone}?body=${encodedMessage}`;

  try {
    window.open(smsUrl, '_self');
  } catch (error) {
    console.error('Failed to open SMS app:', error);
    // Fallback: copy message to clipboard
    navigator.clipboard?.writeText(message).then(() => {
      alert('SMS app not available. Message copied to clipboard.');
    }).catch(() => {
      alert('SMS app not available and clipboard access denied.');
    });
  }
};

export const openWhatsApp = (options: SMSOptions): void => {
  const { phoneNumber, message } = options;
  const formattedPhone = formatPhoneForSMS(phoneNumber);
  const encodedMessage = encodeURIComponent(message);

  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;

  try {
    window.open(whatsappUrl, '_blank');
  } catch (error) {
    console.error('Failed to open WhatsApp:', error);
    // Fallback: copy message to clipboard
    navigator.clipboard?.writeText(message).then(() => {
      alert('WhatsApp not available. Message copied to clipboard.');
    }).catch(() => {
      alert('WhatsApp not available and clipboard access denied.');
    });
  }
};

export const canSendSMS = (customer: { phoneNumber?: string | null }): boolean => {
  return !!(customer.phoneNumber && customer.phoneNumber.trim());
};
