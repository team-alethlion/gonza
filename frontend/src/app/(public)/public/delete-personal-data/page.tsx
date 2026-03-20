"use client";

import React, { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { requestDataDeletionAction } from "@/app/actions/user";

// Define form schema
const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  reason: z.string().min(10, {
    message: "Please provide a detailed reason (min. 10 characters).",
  }),
});

type FormValues = z.infer<typeof formSchema>;

const DeletePersonalData = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      reason: "",
    },
  });

  // Form submission handler
  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);

    try {
      // Send the deletion request via server action
      const result = await requestDataDeletionAction({
        name: data.name,
        email: data.email,
        reason: data.reason,
      });

      if (!result.success) throw new Error(result.error);

      toast({
        title: "Deletion request submitted",
        description:
          "We&apos;ve received your request. An administrator will review it and process your data deletion manually within 30 days.",
      });

      // Reset the form
      form.reset();
    } catch (error) {
      console.error("Error submitting deletion request:", error);
      toast({
        title: "Error",
        description:
          "There was a problem submitting your request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <div className="flex items-center mb-6">
        <Button variant="ghost" asChild className="mr-2">
          <Link href="/public/privacy-policy">← Back to Privacy Policy</Link>
        </Button>
      </div>

      <h1 className="text-3xl font-bold mb-6">Request Data Deletion</h1>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information Deletion Request</CardTitle>
          <CardDescription>
            Fill out this form to request deletion of your personal data. We
            will process your request and contact you within 30 days.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormDescription>
                      Please use the email address associated with your account.
                    </FormDescription>
                    <FormControl>
                      <Input placeholder="your@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Deletion</FormLabel>
                    <FormDescription>
                      Please explain why you&apos;re requesting data deletion.
                    </FormDescription>
                    <FormControl>
                      <Textarea
                        placeholder="I would like my data deleted because..."
                        className="min-h-32"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Submit Request"}
                </Button>
              </div>

              <p className="text-sm text-gray-500 mt-4">
                By submitting this form, your request will be sent to
                gonzabrands@gmail.com for processing. We will respond to your
                request within 30 days as required by applicable privacy laws.
              </p>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeletePersonalData;
