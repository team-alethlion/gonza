
/**
 * Simulated email service for the application
 * In a production environment, this would connect to a real email service
 */

interface EmailOptions {
  to: string;
  subject: string;
  body: string;
}

interface DeletionRequestData {
  name: string;
  email: string;
  reason: string;
}

/**
 * Send an email (simulation)
 */
export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  console.log('Sending email:', options);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simulate success (in real app, this would connect to your email provider)
  return true;
};

/**
 * Send a data deletion request email
 */
export const sendDeletionRequest = async (data: DeletionRequestData): Promise<boolean> => {
  // Validate required fields
  if (!data.name || !data.email || !data.reason) {
    throw new Error('Missing required fields for deletion request');
  }
  
  const emailOptions: EmailOptions = {
    to: 'gonzabrands@gmail.com',
    subject: `Data Deletion Request - ${data.name}`,
    body: `
      Data Deletion Request
      
      Name: ${data.name}
      Email: ${data.email}
      
      Reason for deletion:
      ${data.reason}
      
      This request was submitted on ${new Date().toLocaleDateString()}.
    `
  };
  
  return sendEmail(emailOptions);
};
