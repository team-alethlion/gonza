"use client";
import React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ImagePlus, Building, Briefcase, Users } from 'lucide-react';
import { BusinessSettings } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useBusiness } from '@/contexts/BusinessContext';
import { toast } from 'sonner';

const BUSINESS_SIZES = [
  { value: '1-5', label: '1–5 employees' },
  { value: '6-20', label: '6–20 employees' },
  { value: '21-50', label: '21–50 employees' },
  { value: '50+', label: '50+ employees' },
];

interface BusinessProfileFormProps {
  settings: BusinessSettings;
  onSettingsChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement> | { target: { name: string, value: string | number | boolean | null } }) => void;
  onLogoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const BusinessProfileForm: React.FC<BusinessProfileFormProps> = ({
  settings,
  onSettingsChange,
  onLogoChange,
}) => {
  const { currentBusiness } = useBusiness();
  const { onboarding, saveOnboarding } = useOnboarding(currentBusiness?.id);

  const [natureOfBusiness, setNatureOfBusiness] = React.useState(
    onboarding?.nature_of_business ?? ''
  );
  const [businessSize, setBusinessSize] = React.useState(
    onboarding?.business_size ?? ''
  );
  const [savingExtra, setSavingExtra] = React.useState(false);

  // Sync when onboarding data loads
  React.useEffect(() => {
    if (onboarding) {
      setNatureOfBusiness(onboarding.nature_of_business ?? '');
      setBusinessSize(onboarding.business_size ?? '');
    }
  }, [onboarding]);

  const handleSaveExtra = async () => {
    if (!onboarding) return;
    setSavingExtra(true);
    try {
      await saveOnboarding({
        ...onboarding,
        nature_of_business: natureOfBusiness || undefined,
        business_size: businessSize || undefined,
        completed: onboarding.completed,
      });
      toast.success('Business details updated');
    } catch {
      toast.error('Failed to update business details');
    } finally {
      setSavingExtra(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building className="h-5 w-5 text-blue-600" />
          <CardTitle>Business Profile</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Logo */}
        <div className="space-y-2">
          <Label htmlFor="businessLogo">Business Logo</Label>
          <div className="flex items-center space-x-4">
            {settings.businessLogo && (
              <div className="relative w-16 h-16">
                <Image
                  src={settings.businessLogo}
                  alt="Business Logo"
                  fill
                  className="object-contain"
                />
              </div>
            )}
            <div className="flex-1">
              <Input
                id="businessLogo"
                type="file"
                accept="image/*"
                onChange={onLogoChange}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('businessLogo')?.click()}
                className="w-full"
              >
                <ImagePlus className="mr-2 h-4 w-4" />
                Upload Logo
              </Button>
            </div>
          </div>
        </div>

        {/* Currency */}
        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Input
            id="currency"
            name="currency"
            value={settings.currency}
            onChange={onSettingsChange}
            placeholder="Enter your preferred currency (e.g., USD, EUR, GBP)"
          />
        </div>

        {/* Default Receipt Format */}
        <div className="space-y-2">
          <Label htmlFor="defaultPrintFormat">Default Receipt Format</Label>
          <Select
            value={settings.defaultPrintFormat || 'standard'}
            onValueChange={(value) => onSettingsChange({ target: { name: 'defaultPrintFormat', value } })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select default receipt format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard Receipt (A4/Letter)</SelectItem>
              <SelectItem value="thermal">Thermal Receipt</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Choose the default format for printing receipts. You can still switch formats when printing.
          </p>
        </div>

        {/* Business Name */}
        <div className="space-y-2">
          <Label htmlFor="businessName">Business Name</Label>
          <Input
            id="businessName"
            name="businessName"
            value={settings.businessName}
            onChange={onSettingsChange}
            placeholder=""
          />
        </div>

        {/* Business Address */}
        <div className="space-y-2">
          <Label htmlFor="businessAddress">Business Address</Label>
          <Input
            id="businessAddress"
            name="businessAddress"
            value={settings.businessAddress}
            onChange={onSettingsChange}
            placeholder=""
          />
        </div>

        {/* Business Phone */}
        <div className="space-y-2">
          <Label htmlFor="businessPhone">Business Phone</Label>
          <Input
            id="businessPhone"
            name="businessPhone"
            value={settings.businessPhone}
            onChange={onSettingsChange}
            placeholder=""
          />
        </div>

        {/* Business Email */}
        <div className="space-y-2">
          <Label htmlFor="businessEmail">Business Email</Label>
          <Input
            id="businessEmail"
            name="businessEmail"
            value={settings.businessEmail}
            onChange={onSettingsChange}
            type="email"
            placeholder=""
          />
        </div>

        {/* Divider for onboarding-linked fields */}
        <div className="border-t pt-4 space-y-4">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Additional Business Info
          </p>

          {/* Nature of Business */}
          <div className="space-y-2">
            <Label htmlFor="natureOfBusiness" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              Nature of Business
              <span className="text-muted-foreground text-xs font-normal">(optional)</span>
            </Label>
            <Input
              id="natureOfBusiness"
              value={natureOfBusiness}
              onChange={(e) => setNatureOfBusiness(e.target.value)}
              placeholder=""
            />
          </div>

          {/* Business Size */}
          <div className="space-y-2">
            <Label htmlFor="businessSizeSettings" className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Business Size
              <span className="text-muted-foreground text-xs font-normal">(optional)</span>
            </Label>
            <Select
              value={businessSize}
              onValueChange={setBusinessSize}
            >
              <SelectTrigger id="businessSizeSettings" className="w-full">
                <SelectValue placeholder="Select number of employees" />
              </SelectTrigger>
              <SelectContent>
                {BUSINESS_SIZES.map((size) => (
                  <SelectItem key={size.value} value={size.value}>
                    {size.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {onboarding && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSaveExtra}
              disabled={savingExtra}
              className="w-full"
            >
              {savingExtra ? 'Saving...' : 'Save Nature & Size'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BusinessProfileForm;