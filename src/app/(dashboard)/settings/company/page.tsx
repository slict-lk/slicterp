'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, Building2, Mail, MapPin, FileText, Banknote, Clock, Globe, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';

// Form validation schema
const companyFormSchema = z.object({
  // Company Information
  companyName: z.string().min(1, 'Company name is required'),
  legalName: z.string().optional(),
  registrationNumber: z.string().optional(),
  industry: z.string().optional(),
  foundedYear: z.string().optional(),
  website: z.string().url('Enter a valid URL').or(z.literal('')).optional(),
  description: z.string().max(500, 'Description is too long').optional(),

  // Contact Details
  email: z.string().email('Enter a valid email').or(z.literal('')).optional(),
  phone: z.string().optional(),
  fax: z.string().optional(),

  // Address
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),

  // Tax Information
  taxId: z.string().optional(),
  vatNumber: z.string().optional(),

  // Bank Details
  bankName: z.string().optional(),
  accountName: z.string().optional(),
  accountNumber: z.string().optional(),
  routingNumber: z.string().optional(),
  iban: z.string().optional(),
  swiftCode: z.string().optional(),

  // Social Media
  facebook: z.string().url('Enter a valid URL').or(z.literal('')).optional(),
  twitter: z.string().url('Enter a valid URL').or(z.literal('')).optional(),
  linkedin: z.string().url('Enter a valid URL').or(z.literal('')).optional(),
  instagram: z.string().url('Enter a valid URL').or(z.literal('')).optional(),

  // Business Hours
  businessHours: z.array(
    z.object({
      day: z.string(),
      isOpen: z.boolean(),
      openTime: z.string(),
      closeTime: z.string(),
    })
  ).optional(),

  // Documents
  logo: z.string().optional(),
  signature: z.string().optional(),
  termsAndConditions: z.string().optional(),
  privacyPolicy: z.string().optional(),
});

type CompanyFormValues = z.infer<typeof companyFormSchema>;

// Default business hours
const defaultBusinessHours = [
  { day: 'Monday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
  { day: 'Tuesday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
  { day: 'Wednesday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
  { day: 'Thursday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
  { day: 'Friday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
  { day: 'Saturday', isOpen: false, openTime: '09:00', closeTime: '13:00' },
  { day: 'Sunday', isOpen: false, openTime: '', closeTime: '' },
];

export default function CompanySettingsPage() {
  const { update } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('company');

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      companyName: '',
      legalName: '',
      registrationNumber: '',
      industry: '',
      foundedYear: '',
      website: '',
      description: '',
      email: '',
      phone: '',
      fax: '',
      address: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      taxId: '',
      vatNumber: '',
      bankName: '',
      accountName: '',
      accountNumber: '',
      routingNumber: '',
      iban: '',
      swiftCode: '',
      facebook: '',
      twitter: '',
      linkedin: '',
      instagram: '',
      businessHours: defaultBusinessHours,
      logo: '',
      signature: '',
      termsAndConditions: '',
      privacyPolicy: '',
    },
  });

  // Load company data
  useEffect(() => {
    const loadCompanyData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/settings/company');
        if (!response.ok) {
          throw new Error('Failed to load company data');
        }
        const data = await response.json();
        form.reset(data);
      } catch (error) {
        console.error('Failed to load company data:', error);
        toast.error('Failed to load company data');
      } finally {
        setIsLoading(false);
      }
    };

    loadCompanyData();
  }, [form]);

  const onSubmit = async (data: CompanyFormValues) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/settings/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save company settings');
      }

      toast.success('Company settings saved successfully');
      // Refresh session to update company name in sidebar
      await update();
    } catch (error: any) {
      console.error('Failed to save company settings:', error);
      toast.error(error.message || 'Failed to save company settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (file: File, field: 'logo' | 'signature') => {
    if (field === 'logo') {
      const formData = new FormData();
      formData.append('file', file);

      const toastId = toast.loading('Uploading logo...', { description: 'Please wait' });

      try {
        const res = await fetch('/api/settings/company/logo', { method: 'POST', body: formData });

        if (!res.ok) {
          throw new Error('Upload failed');
        }

        const data = await res.json();

        if (data.success) {
          form.setValue('logo', '/api/settings/company/logo');
          toast.dismiss(toastId);
          toast.success('Logo uploaded successfully');
        } else {
          throw new Error(data.error || 'Upload failed');
        }
      } catch (error) {
        console.error('Logo upload failed:', error);
        toast.dismiss(toastId);
        toast.error('Failed to upload logo');
      }
    } else {
      const toastId = toast.loading('Processing signature...', { description: 'Please wait' });

      try {
        const reader = new FileReader();
        reader.onload = async () => {
          const img = new Image();
          img.onload = async () => {
            const canvas = document.createElement('canvas');
            const maxSize = 400;
            let width = img.width;
            let height = img.height;
            if (width > maxSize || height > maxSize) {
              if (width > height) {
                height = (height / width) * maxSize;
                width = maxSize;
              } else {
                width = (width / height) * maxSize;
                height = maxSize;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/webp', 0.8);
            form.setValue('signature', dataUrl);
            toast.dismiss(toastId);
            toast.success('Signature uploaded successfully');
          };
          img.src = reader.result as string;
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error('Signature upload failed:', error);
        toast.dismiss(toastId);
        toast.error('Failed to upload signature');
      }
    }
  };

  return (
    <div className="p-6 space-y-8 max-w-[1600px] mx-auto">
      {/* Premium Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-gradient-to-r from-slate-900 to-slate-800 p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-4xl font-bold tracking-tight mb-2">Company Profile</h1>
          <p className="text-slate-300 text-lg">Manage your organization's identity, contact info, and branding.</p>
          <div className="flex gap-4 mt-4 text-sm text-slate-400">
            <span className="flex items-center gap-1"><Building2 className="h-4 w-4" /> Organization Details</span>
            <span className="flex items-center gap-1"><Globe className="h-4 w-4" /> Public Profile</span>
            <span className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-green-500" /> Active Status</span>
          </div>
        </div>

        {/* Background Pattern */}
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-blue-600/10 to-transparent pointer-events-none" />
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-6"
          >
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
              <TabsTrigger value="company">
                <Building2 className="w-4 h-4 mr-2" />
                Company
              </TabsTrigger>
              <TabsTrigger value="contact">
                <Mail className="w-4 h-4 mr-2" />
                Contact
              </TabsTrigger>
              <TabsTrigger value="address">
                <MapPin className="w-4 h-4 mr-2" />
                Address
              </TabsTrigger>
              <TabsTrigger value="tax">
                <FileText className="w-4 h-4 mr-2" />
                Tax
              </TabsTrigger>
              <TabsTrigger value="bank">
                <Banknote className="w-4 h-4 mr-2" />
                Bank
              </TabsTrigger>
              <TabsTrigger value="social">
                <Globe className="w-4 h-4 mr-2" />
                Social
              </TabsTrigger>
              <TabsTrigger value="hours">
                <Clock className="w-4 h-4 mr-2" />
                Hours
              </TabsTrigger>
              <TabsTrigger value="documents">
                <FileText className="w-4 h-4 mr-2" />
                Documents
              </TabsTrigger>
            </TabsList>

            {/* Company Information Tab */}
            <TabsContent value="company" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Company Information</CardTitle>
                  <CardDescription>
                    Update your company details and basic information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Acme Inc." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="legalName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Legal Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Acme Inc. Ltd." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="registrationNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Registration Number *</FormLabel>
                          <FormControl>
                            <Input placeholder="123456789" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="industry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Industry *</FormLabel>
                          <FormControl>
                            <Input placeholder="Technology" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="foundedYear"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Year Founded</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="2020" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Brief description of your company"
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Contact Details Tab */}
            <TabsContent value="contact" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                  <CardDescription>
                    Update your company's contact details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email *</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="contact@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone *</FormLabel>
                          <FormControl>
                            <Input placeholder="+1 (555) 123-4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="fax"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fax</FormLabel>
                          <FormControl>
                            <Input placeholder="+1 (555) 123-4568" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Address Tab */}
            <TabsContent value="address" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Business Address</CardTitle>
                  <CardDescription>
                    Your company's physical address
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street Address *</FormLabel>
                        <FormControl>
                          <Input placeholder="123 Business St" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <FormField
                       control={form.control}
                       name="address"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>Street Address</FormLabel>
                           <FormControl>
                             <Input placeholder="123 Business St" {...field} />
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       )}
                     />
                     <FormField
                       control={form.control}
                       name="city"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>City</FormLabel>
                           <FormControl>
                             <Input placeholder="New York" {...field} />
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       )}
                     />
                     <FormField
                       control={form.control}
                       name="state"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>State/Province</FormLabel>
                           <FormControl>
                             <Input placeholder="New York" {...field} />
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       )}
                     />
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FormField
                       control={form.control}
                       name="postalCode"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>Postal Code</FormLabel>
                           <FormControl>
                             <Input placeholder="10001" {...field} />
                           </FormControl>
                           <FormMessage />
                         </FormItem>
                       )}
                     />
                     <FormField
                       control={form.control}
                       name="country"
                       render={({ field }) => (
                         <FormItem>
                           <FormLabel>Country</FormLabel>
                           <Select onValueChange={field.onChange} defaultValue={field.value}>
                             <FormControl>
                               <SelectTrigger>
                                 <SelectValue placeholder="Select country" />
                               </SelectTrigger>
                             </FormControl>
                             <SelectContent>
                               <SelectItem value="LK">Sri Lanka</SelectItem>
                               <SelectItem value="US">United States</SelectItem>
                               <SelectItem value="CA">Canada</SelectItem>
                               <SelectItem value="GB">United Kingdom</SelectItem>
                               <SelectItem value="AU">Australia</SelectItem>
                               <SelectItem value="IN">India</SelectItem>
                               <SelectItem value="DE">Germany</SelectItem>
                               <SelectItem value="FR">France</SelectItem>
                               <SelectItem value="JP">Japan</SelectItem>
                               <SelectItem value="CN">China</SelectItem>
                               <SelectItem value="SG">Singapore</SelectItem>
                               <SelectItem value="AE">United Arab Emirates</SelectItem>
                               <SelectItem value="SA">Saudi Arabia</SelectItem>
                               <SelectItem value="ZA">South Africa</SelectItem>
                               <SelectItem value="NG">Nigeria</SelectItem>
                               <SelectItem value="KE">Kenya</SelectItem>
                               <SelectItem value="BR">Brazil</SelectItem>
                               <SelectItem value="MX">Mexico</SelectItem>
                               <SelectItem value="KR">South Korea</SelectItem>
                               <SelectItem value="MY">Malaysia</SelectItem>
                               <SelectItem value="TH">Thailand</SelectItem>
                               <SelectItem value="PH">Philippines</SelectItem>
                               <SelectItem value="ID">Indonesia</SelectItem>
                               <SelectItem value="NZ">New Zealand</SelectItem>
                               <SelectItem value="IT">Italy</SelectItem>
                               <SelectItem value="ES">Spain</SelectItem>
                               <SelectItem value="NL">Netherlands</SelectItem>
                               <SelectItem value="SE">Sweden</SelectItem>
                               <SelectItem value="CH">Switzerland</SelectItem>
                               <SelectItem value="IE">Ireland</SelectItem>
                               <SelectItem value="PK">Pakistan</SelectItem>
                               <SelectItem value="BD">Bangladesh</SelectItem>
                               <SelectItem value="VN">Vietnam</SelectItem>
                             </SelectContent>
                           </Select>
                           <FormMessage />
                         </FormItem>
                       )}
                     />
                   </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tax Information Tab */}
            <TabsContent value="tax" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Tax Information</CardTitle>
                  <CardDescription>
                    Your company's tax identification details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="taxId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tax ID *</FormLabel>
                          <FormControl>
                            <Input placeholder="12-3456789" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="vatNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>VAT Number</FormLabel>
                          <FormControl>
                            <Input placeholder="GB123456789" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Bank Details Tab */}
            <TabsContent value="bank" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Bank Account Details</CardTitle>
                  <CardDescription>
                    Your company's bank account information for payments
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="bankName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bank Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Bank of America" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="accountName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Acme Inc." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="accountNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Number *</FormLabel>
                          <FormControl>
                            <Input placeholder="1234567890" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="routingNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Routing Number</FormLabel>
                          <FormControl>
                            <Input placeholder="123456789" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="iban"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>IBAN</FormLabel>
                          <FormControl>
                            <Input placeholder="GB29NWBK60161331926819" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="swiftCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SWIFT/BIC Code</FormLabel>
                          <FormControl>
                            <Input placeholder="BOFAUS3N" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Social Media Tab */}
            <TabsContent value="social" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Social Media</CardTitle>
                  <CardDescription>
                    Your company's social media profiles
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="facebook"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Facebook</FormLabel>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                            </svg>
                          </div>
                          <FormControl>
                            <Input placeholder="https://facebook.com/yourcompany" {...field} />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="twitter"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Twitter</FormLabel>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                            </svg>
                          </div>
                          <FormControl>
                            <Input placeholder="https://twitter.com/yourcompany" {...field} />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="linkedin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>LinkedIn</FormLabel>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <svg className="w-5 h-5 text-blue-700" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                            </svg>
                          </div>
                          <FormControl>
                            <Input placeholder="https://linkedin.com/company/yourcompany" {...field} />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="instagram"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instagram</FormLabel>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center w-10 h-10 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
                            <svg className="w-5 h-5 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                            </svg>
                          </div>
                          <FormControl>
                            <Input placeholder="https://instagram.com/yourcompany" {...field} />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Business Hours Tab */}
            <TabsContent value="hours" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Business Hours</CardTitle>
                  <CardDescription>
                    Set your company's standard business hours
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {form.watch('businessHours')?.map((day, index) => (
                    <div key={day.day} className="flex items-center gap-4 p-3 border rounded-lg">
                      <div className="w-24 font-medium">{day.day}</div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={day.isOpen}
                          onCheckedChange={(checked) => {
                            const updatedHours = [...(form.getValues('businessHours') || [])];
                            updatedHours[index] = { ...day, isOpen: checked };
                            form.setValue('businessHours', updatedHours);
                          }}
                        />
                        <span className="text-sm text-muted-foreground">
                          {day.isOpen ? 'Open' : 'Closed'}
                        </span>
                      </div>

                      {day.isOpen && (
                        <div className="flex items-center gap-2 ml-auto">
                          <FormField
                            control={form.control}
                            name={`businessHours.${index}.openTime`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input type="time" {...field} className="w-32" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <span>to</span>
                          <FormField
                            control={form.control}
                            name={`businessHours.${index}.closeTime`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input type="time" {...field} className="w-32" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Company Documents</CardTitle>
                  <CardDescription>
                    Upload and manage your company documents
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Company Logo</h4>
                        <p className="text-sm text-muted-foreground">Recommended size: 200x50px</p>
                      </div>
                      <label className="cursor-pointer">
                        <span className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90">
                          <Plus className="w-4 h-4 mr-2" />
                          Upload Logo
                        </span>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'logo')}
                        />
                      </label>
                    </div>
                    {form.watch('logo') ? (
                      <div className="mt-2 flex items-center gap-4">
                        <img
                          src={`${form.watch('logo')}?t=${Date.now()}`}
                          alt="Company Logo"
                          className="h-12 object-contain"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            await fetch('/api/settings/company/logo', { method: 'DELETE' });
                            form.setValue('logo', '');
                          }}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="h-20 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground">
                        No logo uploaded
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Signature</h4>
                        <p className="text-sm text-muted-foreground">For official documents and emails</p>
                      </div>
                      <label className="cursor-pointer">
                        <span className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90">
                          <Plus className="w-4 h-4 mr-2" />
                          Upload Signature
                        </span>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'signature')}
                        />
                      </label>
                    </div>
                    {form.watch('signature') ? (
                      <div className="mt-2 flex items-center gap-4">
                        <img
                          src={form.watch('signature')}
                          alt="Signature"
                          className="h-20 object-contain"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => form.setValue('signature', '')}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="h-20 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground">
                        No signature uploaded
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Terms & Conditions</h4>
                    <FormField
                      control={form.control}
                      name="termsAndConditions"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea
                              placeholder="Enter your terms and conditions here..."
                              className="min-h-[150px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Privacy Policy</h4>
                    <FormField
                      control={form.control}
                      name="privacyPolicy"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea
                              placeholder="Enter your privacy policy here..."
                              className="min-h-[150px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end pt-4 border-t">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
