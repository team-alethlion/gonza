import { useEffect } from 'react';
// Supabase realtime removed – toast imported for future use
// import { toast } from 'sonner';

export const useSaleNotifications = () => {
  useEffect(() => {
    // Realtime notifications via Supabase are being deprecated/removed in favor of Prisma.
    // Since Prisma does not have a native client-side realtime event system, 
    // this logic is currently disabled.

    /*
    const subscription = supabase
      .channel('public:sales')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sales' },
        (payload) => {
          const sale = payload.new;
          toast.success(`Notification New sale: ${sale.customer_name} - ${sale.receipt_number}`);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
    */
  }, []);
};
