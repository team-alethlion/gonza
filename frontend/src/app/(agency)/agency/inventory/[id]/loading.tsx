import LoadingSpinner from '@/components/LoadingSpinner';

export default function Loading() {
  return (
    <div className="flex h-[50vh] w-full items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}
