import { getNextReceiptNumberAction } from '@/app/actions/inventory';

/**
 * Generate a sequential receipt number using Prisma action.
 */
export const generateReceiptNumber = async (locationId?: string): Promise<string> => {
  try {
    if (!locationId) {
      console.error('Location ID is required for receipt number generation');
      return '000001';
    }

    const result = await getNextReceiptNumberAction(locationId);

    if (result.success && result.data) {
      return result.data;
    }

    console.error('Error generating receipt number:', result.error);
    return '000001';
  } catch (error) {
    console.error('Error generating receipt number:', error);
    return '000001';
  }
};
