"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

const PrivacyPolicy = () => {
  const router = useRouter();

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="flex items-center gap-2 mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Introduction</CardTitle>
        </CardHeader>
        <CardContent className="prose">
          <p>Last Updated: May 18, 2025</p>
          <p>
            Gonza Systems (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;)
            respects your privacy and is committed to protecting it through our
            compliance with this policy. This policy describes the types of
            information we may collect from you or that you may provide when you
            use our business management application (the &quot;App&quot;) and
            our practices for collecting, using, maintaining, protecting, and
            disclosing that information.
          </p>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Information We Collect</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <h3 className="font-semibold text-lg">Personal Information</h3>
          <p>
            We may collect several types of information from and about users of
            our App, including:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Your name, email address, and contact information</li>
            <li>
              Business information such as business name, address, and tax
              information
            </li>
            <li>
              Information about your customers that you input into the App
            </li>
            <li>Information about your inventory, sales, and expenses</li>
            <li>Authentication credentials</li>
          </ul>

          <h3 className="font-semibold text-lg mt-4">Usage Information</h3>
          <p>
            We may also collect information about how you access and use our
            App, including:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              Usage details, such as features accessed and time spent on the App
            </li>
            <li>
              Device information, such as your device type, operating system,
              and browser type
            </li>
            <li>Location data</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>How We Use Your Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            We use information that we collect about you or that you provide to
            us:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>To provide, maintain, and improve our App</li>
            <li>To process transactions and send related information</li>
            <li>To provide customer support</li>
            <li>
              To send administrative notifications, such as updates or security
              alerts
            </li>
            <li>To personalize your experience</li>
            <li>To analyze usage patterns and trends</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Data Security</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            We have implemented measures designed to secure your personal
            information from accidental loss and from unauthorized access, use,
            alteration, and disclosure. All information you provide to us is
            stored on secure servers behind firewalls.
          </p>
          <p className="mt-2">
            The safety and security of your information also depends on you. We
            urge you to be careful about sharing your login credentials and
            selecting strong passwords.
          </p>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Data Retention</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            We will retain your personal information for as long as necessary to
            fulfill the purposes for which it was collected, including to
            satisfy any legal, accounting, or reporting requirements.
          </p>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Your Rights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Depending on your location, you may have certain rights regarding
            your personal information, including:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>The right to access your personal information</li>
            <li>The right to correct inaccurate or incomplete information</li>
            <li>The right to deletion of your personal information</li>
            <li>
              The right to restrict processing of your personal information
            </li>
            <li>The right to data portability</li>
          </ul>
          <p className="mt-2">
            To exercise any of these rights, please contact us at
            gonzabrands@gmail.com.
          </p>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Changes to Our Privacy Policy</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            We may update our privacy policy from time to time. If we make
            material changes, we will notify you through the App or by email.
            The date the privacy policy was last revised is identified at the
            top of this page.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            To ask questions or comment about this privacy policy and our
            privacy practices, contact us at: gonzabrands@gmail.com
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrivacyPolicy;
