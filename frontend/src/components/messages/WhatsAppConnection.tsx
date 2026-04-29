
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Checking Status...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-4">
      {/* Status Header */}
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${status === 'connected' ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-400'}`}>
                <MessageSquare className="w-6 h-6" />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">WhatsApp Connection</h2>
                <p className="text-sm text-muted-foreground font-medium">Manage your business WhatsApp device</p>
            </div>
          </div>
          <Badge variant={status === 'connected' ? 'success' : status === 'error' ? 'destructive' : 'secondary'} className="uppercase text-[10px] font-bold px-3 h-6">
            {status === 'error' ? 'Failed' : status}
          </Badge>
      </div>

      {status === 'connected' ? (
        <div className="max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-500">
            <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-8 text-center space-y-6 shadow-sm">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto ring-4 ring-green-50/50">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <div className="space-y-1">
                    <h3 className="text-xl font-bold text-gray-900">Account Linked</h3>
                    <p className="text-sm text-green-600 font-bold uppercase tracking-tight">Channel is active</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-left">
                    <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Linked Number</p>
                        <p className="text-lg font-bold text-gray-900 font-mono">{linkedPhone || 'Business Phone'}</p>
                    </div>
                    <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Channel Status</p>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <p className="text-lg font-bold text-green-600 uppercase tracking-tight">Live</p>
                        </div>
                    </div>
                </div>
                <div className="pt-4">
                    <Button 
                      variant="ghost" 
                      onClick={handleDisconnect} 
                      className="text-sm font-bold text-red-600 hover:text-red-700 hover:bg-red-50 px-6"
                    >
                      Disconnect Account
                    </Button>
                </div>
            </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <section className="space-y-8">
                <div className="space-y-6">
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">1. Identity</h3>
                        <p className="text-sm text-muted-foreground font-medium leading-relaxed">Enter your WhatsApp number in international format to start the pairing process.</p>
                        <Input
                            type="tel"
                            placeholder="256700000000"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="h-12 font-mono text-base"
                        />
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">2. Link Device</h3>
                        <p className="text-sm text-muted-foreground font-medium leading-relaxed">Open WhatsApp &gt; Settings &gt; Linked Devices and scan the code that will appear on the right.</p>
                        <Button
                            onClick={() => handleLinkWA('qr')}
                            disabled={isActionLoading || !phoneNumber}
                            className="w-full bg-primary hover:bg-primary/90 h-12 font-bold uppercase tracking-widest shadow-lg shadow-primary/20"
                        >
                            {isActionLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : null}
                            {isActionLoading ? 'Initializing...' : 'Generate QR Code'}
                        </Button>
                    </div>

                    <div className="pt-2">
                        <button onClick={handleDisconnect} className="text-[10px] text-muted-foreground hover:text-red-600 transition-colors uppercase font-bold tracking-widest">
                            Cancel pairing process
                        </button>
                    </div>
                </div>
            </section>

            <aside className="border border-slate-100 rounded-2xl bg-slate-50/50 p-8 flex flex-col items-center justify-center min-h-[350px] shadow-inner">
                {status === 'error' && (
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                            <AlertCircle className="w-8 h-8 text-red-600" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-bold text-gray-900">Connection Interrupted</h3>
                          <p className="text-xs text-muted-foreground max-w-[220px] mx-auto font-medium">
                              Failed to generate QR code due to a gateway communication issue.
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleLinkWA('qr')} className="font-bold border-red-100 hover:bg-red-50 hover:text-red-600">Retry</Button>
                    </div>
                )}

                {status === 'connecting' && qrCode && (
                    <div className="space-y-4 text-center animate-in zoom-in-95 duration-500">
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xl ring-8 ring-slate-100/50">
                            <img 
                                src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`} 
                                alt="QR Code" 
                                className="w-48 h-48 mx-auto" 
                            />
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] animate-pulse">Waiting for scan</p>
                            <p className="text-[9px] text-muted-foreground font-bold uppercase">Code refreshes automatically</p>
                        </div>
                    </div>
                )}

                {(status === 'disconnected' || (status === 'connecting' && !qrCode)) && (
                    <div className="text-center space-y-3 opacity-30">
                        <Smartphone className="w-10 h-10 text-gray-900 mx-auto" />
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Awaiting interaction</p>
                    </div>
                )}
            </aside>
        </div>
      )}
    </div>
  );
};

export default WhatsAppConnection;
