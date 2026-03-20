
export interface NoticeTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  category: 'payment' | 'policy' | 'general' | 'announcement' | 'gratitude';
}

export const noticeTemplates: NoticeTemplate[] = [
  {
    id: 'payment_reminder',
    name: 'Payment Reminder',
    subject: 'Payment Reminder - Account Status',
    content: `We hope this letter finds you well. We are writing to kindly remind you about your outstanding payment.

We appreciate your prompt attention to this matter and thank you for your continued business.`,
    category: 'payment'
  },
  {
    id: 'policy_update',
    name: 'Policy Update',
    subject: 'Important Update to Our Business Policies',
    content: `We are writing to inform you of important updates to our business policies that may affect your account.

These changes will take effect shortly. We appreciate your understanding and continued partnership.`,
    category: 'policy'
  },
  {
    id: 'thank_you',
    name: 'Thank You Letter',
    subject: 'Thank You for Your Business',
    content: `We wanted to take a moment to express our sincere gratitude for your continued support and trust in our business.

We look forward to serving you for many years to come.`,
    category: 'gratitude'
  },
  {
    id: 'service_announcement',
    name: 'Service Announcement',
    subject: 'Important Service Update',
    content: `We are excited to share some important updates about our services that will enhance your experience with us.

We believe these improvements will provide you with even better service and value.`,
    category: 'announcement'
  },
  {
    id: 'account_update',
    name: 'Account Status Update',
    subject: 'Account Status Update',
    content: `We are writing to provide you with an important update regarding your account with us.

If you have any questions or concerns, please don't hesitate to contact us.`,
    category: 'general'
  },
  {
    id: 'general_notice',
    name: 'General Business Communication',
    subject: 'Business Communication',
    content: `We hope this message finds you well. We wanted to reach out to you regarding an important matter.

Thank you for your attention to this matter.`,
    category: 'general'
  }
];

export const getTemplateById = (id: string): NoticeTemplate | undefined => {
  return noticeTemplates.find(template => template.id === id);
};

export const getTemplatesByCategory = (category: string): NoticeTemplate[] => {
  if (category === 'all') return noticeTemplates;
  return noticeTemplates.filter(template => template.category === category);
};
