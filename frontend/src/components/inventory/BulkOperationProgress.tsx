import React from 'react';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BulkOperationProgressProps {
    title: string;
    currentCount: number;
    totalCount: number;
    status: 'processing' | 'completed' | 'failed';
    successCount?: number;
    failureCount?: number;
    onClose?: () => void;
}

export const BulkOperationProgress: React.FC<BulkOperationProgressProps> = ({
    title,
    currentCount,
    totalCount,
    status,
    successCount,
    failureCount,
}) => {
    const progressPercentage = Math.round((currentCount / totalCount) * 100);

    return (
        <div className="space-y-6 py-4">
            {status === 'processing' && (
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                        <strong>Please do not close this tab or dialog until the process is complete.</strong>
                    </AlertDescription>
                </Alert>
            )}

            <div className="text-center space-y-4">
                {status === 'processing' ? (
                    <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-primary"></div>
                ) : status === 'completed' ? (
                    <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                ) : (
                    <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
                )}

                <div>
                    <h3 className="text-lg font-semibold">{title}</h3>
                    <p className="text-sm text-muted-foreground">
                        {status === 'processing'
                            ? `Processing item ${currentCount} of ${totalCount}`
                            : status === 'completed'
                                ? `Successfully processed ${successCount ?? totalCount} items${failureCount ? `, ${failureCount} failed` : ''}`
                                : 'The operation failed to complete.'
                        }
                    </p>
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium text-muted-foreground">
                    <span>Progress</span>
                    <span>{progressPercentage}%</span>
                </div>
                <Progress value={progressPercentage} className="h-2 w-full" />
            </div>

            {(successCount !== undefined || failureCount !== undefined) && status === 'completed' && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-green-700">{successCount ?? 0}</div>
                        <div className="text-xs text-green-600 font-medium">Successful</div>
                    </div>
                    <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-red-700">{failureCount ?? 0}</div>
                        <div className="text-xs text-red-600 font-medium">Failed</div>
                    </div>
                </div>
            )}
        </div>
    );
};
