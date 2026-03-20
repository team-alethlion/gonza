"use client";
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Download, RefreshCw, Printer, ExternalLink, CheckCircle2, AlertCircle, Settings2, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';

interface PrinterDevice {
    name: string;
    type?: string;
    status?: string;
    isOnline?: boolean;
    message?: string;
}

const PrinterBridgeSettings: React.FC = () => {
    const { toast } = useToast();
    const { settings, updateSettings } = useBusinessSettings();
    const [isScanning, setIsScanning] = useState(false);
    const [updatingPrinter, setUpdatingPrinter] = useState<string | null>(null);
    const [printers, setPrinters] = useState<PrinterDevice[]>([]);
    const [bridgeStatus, setBridgeStatus] = useState<'online' | 'offline' | 'checking'>('checking');

    const checkBridgeStatus = async () => {
        const addresses = ['http://localhost:5000', 'http://127.0.0.1:5000'];

        for (const addr of addresses) {
            try {
                const response = await fetch(`${addr}/printers`, {
                    signal: AbortSignal.timeout(3000),
                    mode: 'cors'
                });
                if (response.ok) {
                    setBridgeStatus('online');
                    const data = await response.json();
                    setPrinters(data || []);
                    return; // Found it!
                }
            } catch (error) {
                // Continue to next address
            }
        }
        setBridgeStatus('offline');
    };

    useEffect(() => {
        checkBridgeStatus();
        const interval = setInterval(checkBridgeStatus, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleScanDevices = async () => {
        setIsScanning(true);
        try {
            const response = await fetch('http://localhost:5000/printers');
            if (response.ok) {
                const data = await response.json();
                setPrinters(data || []);
                setBridgeStatus('online');
                toast({
                    title: "Scan complete",
                    description: `Found ${data.length} printers.`,
                });
            } else {
                throw new Error('Bridge offline');
            }
        } catch (error) {
            setBridgeStatus('offline');
            toast({
                title: "Scan failed",
                description: "Could not connect to Printer Bridge. Make sure it is installed and running.",
                variant: "destructive"
            });
        } finally {
            setIsScanning(false);
        }
    };

    const handleSetDefaultPrinter = async (printerName: string) => {
        setUpdatingPrinter(printerName);
        try {
            // Cast to any to avoid complex Partial issues if hook type hasn't fully propagated in IDE
            const success = await (updateSettings as any)({
                defaultPrinterName: printerName
            });
            if (success) {
                toast({
                    title: "Default printer updated",
                    description: `${printerName} is now your default printer.`,
                });
            }
        } finally {
            setUpdatingPrinter(null);
        }
    };

    const handleDownloadBridge = () => {
        window.open('/PrinterBridge-Setup.zip', '_blank');
    };

    const handleOpenGuide = () => {
        window.open('/PRINTER-BRIDGE-GUIDE.pdf', '_blank');
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-xl flex items-center gap-2">
                            Printer Bridge
                            {bridgeStatus === 'online' ? (
                                <Badge variant="success" className="bg-green-500 hover:bg-green-600">Connected</Badge>
                            ) : bridgeStatus === 'offline' ? (
                                <Badge variant="destructive">Offline</Badge>
                            ) : (
                                <Badge variant="secondary">Checking...</Badge>
                            )}
                        </CardTitle>
                        <CardDescription>
                            Connect to local thermal printers and barcode label printers.
                        </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleOpenGuide} className="gap-2">
                        <ExternalLink className="h-4 w-4" />
                        Guide
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="bg-muted/30 p-4 rounded-lg border border-dashed text-center">
                    <h4 className="font-medium mb-2">Need the Printer Bridge app?</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                        Download and install our bridge service to enable high-speed local printing.
                    </p>
                    <div className="flex flex-wrap justify-center gap-3">
                        <Button onClick={handleDownloadBridge} className="gap-2 bg-blue-600 hover:bg-blue-700">
                            <Download className="h-4 w-4" />
                            Download Printer Bridge
                        </Button>
                        <Button
                            variant="outline"
                            className="gap-2 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                            onClick={() => window.open('https://drive.google.com/drive/folders/1xWpU63y1tKVnTVF5ftNVyhL82oR_EjnG?usp=sharing', '_blank')}
                        >
                            <ExternalLink className="h-4 w-4" />
                            Download Drivers
                        </Button>
                    </div>
                </div>

                <div className="space-y-4 border-b pb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Settings2 className="h-5 w-5 text-gray-500" />
                        <h4 className="font-semibold text-base">Configuration</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="paper-size">Thermal Paper Size</Label>
                            <Select
                                value={settings.printerPaperSize || '58mm'}
                                onValueChange={(value) => (updateSettings as any)({ printerPaperSize: value })}
                            >
                                <SelectTrigger id="paper-size">
                                    <SelectValue placeholder="Select paper size" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="58mm">58mm (Standard Receipt)</SelectItem>
                                    <SelectItem value="80mm">80mm (Wide Receipt)</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                58mm aligns left. 80mm centers content.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <Label className="text-base font-semibold">Connected Printers</Label>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleScanDevices}
                            disabled={isScanning}
                            className="gap-2"
                        >
                            <RefreshCw className={`h-4 w-4 ${isScanning ? 'animate-spin' : ''}`} />
                            Scan
                        </Button>
                    </div>

                    {bridgeStatus === 'offline' ? (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                                <AlertCircle className="h-4 w-4" />
                                Bridge service is not responding.
                            </div>
                            <div className="text-xs space-y-2 p-3 bg-muted rounded-md border">
                                <p className="font-semibold">Troubleshooting Steps:</p>
                                <ol className="list-decimal ml-4 space-y-1">
                                    <li>Ensure the Printer Bridge app is open and shows "Server running on port 5000".</li>
                                    <li>If using Chrome, try opening <a href="http://localhost:5000/printers" target="_blank" className="text-blue-600 underline">this link</a> manually. If it works there but not here, it's a browser security block.</li>
                                    <li>Try restarting the bridge app.</li>
                                </ol>
                            </div>
                        </div>
                    ) : printers.length === 0 ? (
                        <div className="text-sm text-muted-foreground text-center py-4 border rounded-md italic">
                            No printers found. Make sure your printers are turned on and connected to your computer.
                        </div>
                    ) : (
                        <div className="grid gap-2">
                            {printers.map((printer) => (
                                <div
                                    key={printer.name}
                                    className={`flex items-center justify-between p-3 border rounded-md ${settings.defaultPrinterName === printer.name ? 'bg-secondary/20 border-secondary' : 'bg-card'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Printer className={`h-5 w-5 ${settings.defaultPrinterName === printer.name ? 'text-secondary' : 'text-muted-foreground'}`} />
                                        <div>
                                            <p className="font-medium text-sm">{printer.name}</p>
                                            <div className="flex items-center gap-2">
                                                {settings.defaultPrinterName === printer.name && (
                                                    <p className="text-xs text-secondary-foreground flex items-center gap-1">
                                                        <CheckCircle2 className="h-3 w-3" /> Default
                                                    </p>
                                                )}
                                                {printer.status && (
                                                    <Badge variant="outline" className="text-[10px] h-4 px-1">
                                                        {printer.status}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {settings.defaultPrinterName !== printer.name && (
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => handleSetDefaultPrinter(printer.name)}
                                            disabled={updatingPrinter !== null}
                                            title="Set Default"
                                        >
                                            {updatingPrinter === printer.name ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <CheckCircle2 className="h-4 w-4" />
                                            )}
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default PrinterBridgeSettings;
