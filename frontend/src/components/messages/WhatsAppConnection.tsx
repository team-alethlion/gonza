
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Smartphone, 
  RefreshCw, 
  Unlink, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Mail,
  MessageSquare
} from 'lucide-react';
import { 
  getWhatsAppStatusAction, 
  initializeWhatsAppAction, 
  disconnectWhatsAppAction 
} from '@/app/actions/messaging';
import { toast } from 'sonner';

const WhatsAppConnection = () => {
  const [status, setStatus] = useState<string>('disconnected');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [linkedPhone, setLinkedPhone] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');

  const fetchStatus = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const result = await getWhatsAppStatusAction();
      if (result.success && result.data) {
        setStatus(result.data.status);
        setQrCode(result.data.qr_code);
        setLinkedPhone(result.data.linked_phone_number);
      }
    } catch (error) {
      console.error("Failed to fetch WhatsApp status:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLinkWA = async (type: 'qr' | 'pairing') => {
    if (!phoneNumber) {
        toast.error("Please enter your WhatsApp phone number first.");
        return;
    }
    
    setIsActionLoading(true);
    try {
      const result = await initializeWhatsAppAction(type, phoneNumber);
      if (result.success) {
        await fetchStatus();
        toast.success("Initialization started.");
      } else {
        toast.error(result.error || "Failed to initialize session");
      }
    } catch (error) {
      toast.error("Initialization failed");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to unlink this account?")) return;
    setIsActionLoading(true);
    try {
      const result = await disconnectWhatsAppAction();
      if (result.success) {
        setStatus('disconnected');
        setQrCode(null);
        setLinkedPhone(null);
        toast.success("Disconnected successfully");
      }
    } catch (error) {
      toast.error("Disconnection failed");
    } finally {
      setIsActionLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus(true);
    let interval: any;
    if (status === 'connecting') {
      interval = setInterval(() => fetchStatus(), 5000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [status, fetchStatus]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
        <p className="text-sm font-medium text-gray-500 uppercase tracking-widest">Checking Status...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-4">
      {/* Status Header */}
      <div className="flex justify-between items-center mb-8 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${status === 'connected' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                <MessageSquare className="w-6 h-6" />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">WhatsApp Connection</h2>
                <p className="text-sm text-gray-500">Manage your business WhatsApp device</p>
            </div>
          </div>
          <Badge variant={status === 'connected' ? 'success' : status === 'error' ? 'destructive' : 'secondary'} className="uppercase text-[10px] font-bold px-3 h-6">
            {status === 'error' ? 'Failed' : status}
          </Badge>
      </div>

      {status === 'connected' ? (
        <div className="max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-500">
            <div className="bg-gray-50 border rounded-xl p-8 text-center space-y-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <div className="space-y-1">
                    <h3 className="text-xl font-bold text-gray-900">Account Linked</h3>
                    <p className="text-sm text-green-600 font-medium">Ready to send messages</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="p-4 bg-white border rounded-lg shadow-sm text-left">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Linked Number</p>
                        <p className="text-lg font-bold text-gray-900">{linkedPhone || 'Business Phone'}</p>
                    </div>
                    <div className="p-4 bg-white border rounded-lg shadow-sm text-left">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Channel Status</p>
                        <p className="text-lg font-bold text-green-600 uppercase">Active</p>
                    </div>
                </div>
                <div className="pt-4">
                    <button onClick={handleDisconnect} className="text-sm font-bold text-red-600 hover:underline">
                        Disconnect Account
                    </button>
                </div>
            </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <section className="space-y-8">
                <div className="space-y-6">
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">1. Identity</h3>
                        <p className="text-sm text-gray-500">Enter your WhatsApp number in international format.</p>
                        <input
                            type="tel"
                            placeholder="256700000000"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-600 outline-none"
                        />
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">2. Link Device</h3>
                        <p className="text-sm text-gray-500">Open WhatsApp &gt; Settings &gt; Linked Devices and scan the code.</p>
                        <Button
                            onClick={() => handleLinkWA('qr')}
                            disabled={isActionLoading || !phoneNumber}
                            className="bg-blue-600 hover:bg-blue-700 font-bold"
                        >
                            {isActionLoading ? 'Loading...' : 'Generate QR Code'}
                        </Button>
                    </div>

                    <div className="pt-2">
                        <button onClick={handleDisconnect} className="text-xs text-gray-400 hover:text-red-600 hover:underline transition-colors uppercase font-bold tracking-widest">
                            Cancel pairing process
                        </button>
                    </div>
                </div>
            </section>

            <aside className="border border-gray-200 rounded-xl bg-gray-50 p-8 flex flex-col items-center justify-center min-h-[350px]">
                {status === 'error' && (
                    <div className="text-center space-y-4">
                        <AlertCircle className="w-10 h-10 text-red-600 mx-auto" />
                        <h3 className="font-bold text-gray-900">Connection Interrupted</h3>
                        <p className="text-sm text-gray-500 max-w-[220px]">
                            Failed to generate QR code due to a gateway communication issue.
                        </p>
                        <Button variant="outline" size="sm" onClick={() => handleLinkWA('qr')} className="font-bold">Retry</Button>
                    </div>
                )}

                {status === 'connecting' && qrCode && (
                    <div className="space-y-4 text-center animate-in zoom-in-95 duration-500">
                        <div className="bg-white p-4 rounded-lg border shadow-sm">
                            <img 
                                src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`} 
                                alt="QR Code" 
                                className="w-48 h-48 mx-auto" 
                            />
                        </div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest animate-pulse">Waiting for scan...</p>
                    </div>
                )}

                {(status === 'disconnected' || (status === 'connecting' && !qrCode)) && (
                    <div className="text-center space-y-3 opacity-40">
                        <Smartphone className="w-10 h-10 text-gray-900 mx-auto" />
                        <p className="text-xs font-bold uppercase tracking-widest">Awaiting interaction</p>
                    </div>
                )}
            </aside>
        </div>
      )}
    </div>
  );
};

export default WhatsAppConnection;
