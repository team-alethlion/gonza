"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  HelpCircle,
  Phone,
  Mail,
  FileText,
  MessageSquare,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const Help = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <HelpCircle className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold">Help Center</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contact Support</CardTitle>
          <CardDescription>Get help from our support team</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-full">
                <Phone className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium">Phone Support</h3>
                <p className="text-gray-600">
                  <a href="tel:+256758519696" className="hover:underline">
                    +256 758519696
                  </a>
                </p>
                <p className="text-sm text-gray-500">Mon-Fri, 9am-5pm EST</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-full">
                <MessageSquare className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium">WhatsApp Support</h3>
                <p className="text-gray-600">
                  <a
                    href={`https://wa.me/256787921193`}
                    className="hover:underline"
                    target="_blank"
                    rel="noopener noreferrer">
                    +256 787921193
                  </a>
                </p>
                <p className="text-sm text-gray-500">Available 24/7</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-full">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium">Email Support</h3>
                <p className="text-gray-600">
                  <a
                    href="mailto:gonzabrands@gmail.com"
                    className="hover:underline">
                    gonzabrands@gmail.com
                  </a>
                </p>
                <p className="text-sm text-gray-500">
                  Response within 24 hours
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-full">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium">Documentation</h3>
                <p className="text-gray-600">
                  Read our comprehensive user guides
                </p>
                <a href="#" className="text-blue-600 text-sm hover:underline">
                  View documentation
                </a>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* New Feature Suggestions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Suggest New Features
          </CardTitle>
          <CardDescription>We value your ideas and feedback</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            Have an idea that could make our app better? We&apos;d love to hear
            it! Use any of the methods below to share your suggestions:
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() =>
                (window.location.href = `mailto:gonzabrands@gmail.com?subject=Feature Suggestion`)
              }>
              <Mail className="h-4 w-4" />
              Email Your Idea
            </Button>

            <Button
              variant="outline"
              className="flex items-center gap-2 text-green-600 border-green-200 hover:bg-green-50"
              onClick={() =>
                window.open(
                  `https://wa.me/256787921193?text=I have a feature suggestion:`,
                  "_blank",
                )
              }>
              <MessageSquare className="h-4 w-4" />
              WhatsApp Your Idea
            </Button>
          </div>

          <div className="bg-blue-50 p-4 rounded-md mt-4">
            <p className="text-sm text-blue-700">
              Our team reviews all suggestions and prioritizes them based on
              user demand and feasibility. While we can&apos;t implement every
              idea, your feedback is essential to help us improve.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
          <CardDescription>
            Find quick answers to common questions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-b pb-3">
            <h3 className="font-medium text-lg mb-1">
              How do I add a new product?
            </h3>
            <p className="text-gray-600">
              Navigate to Inventory and click the &quot;Add Product&quot;
              button. Fill in the required details and save.
            </p>
          </div>

          <div className="border-b pb-3">
            <h3 className="font-medium text-lg mb-1">
              How do I record a new sale?
            </h3>
            <p className="text-gray-600">
              Go to the Sales section and click &quot;New Sale&quot;. Select
              products, add customer information and complete the transaction.
            </p>
          </div>

          <div className="border-b pb-3">
            <h3 className="font-medium text-lg mb-1">
              How do I manage my business settings?
            </h3>
            <p className="text-gray-600">
              Click on the Settings icon in the navigation menu to update your
              business details, tax rates and preferences.
            </p>
          </div>

          <div>
            <h3 className="font-medium text-lg mb-1">
              How do I export my sales data?
            </h3>
            <p className="text-gray-600">
              In the Sales section, use the export buttons to download your data
              in CSV or PDF format.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Help;
