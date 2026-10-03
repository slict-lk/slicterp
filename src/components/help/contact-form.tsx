'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Send, Paperclip } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const ticketSchema = z.object({
    subject: z.string().min(5, 'Subject must be at least 5 characters'),
    priority: z.string().min(1, 'Please select a priority'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    attachment: z.any().optional(),
});

type TicketFormValues = z.infer<typeof ticketSchema>;

export function ContactForm() {
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<TicketFormValues>({
        resolver: zodResolver(ticketSchema),
        defaultValues: {
            subject: '',
            priority: '',
            description: '',
        },
    });

    const onSubmit = async (data: TicketFormValues) => {
        setIsLoading(true);
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setIsLoading(false);
        toast.success('Ticket submitted successfully. Ticket #40291 created.');
        form.reset();
    };

    return (
        <Card className="border-slate-200 shadow-sm">
            <CardHeader>
                <CardTitle>Still need help?</CardTitle>
                <CardDescription>Submit a support request and our team will get back to you.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="subject">Subject</Label>
                            <Input
                                id="subject"
                                placeholder="Brief summary of the issue"
                                {...form.register('subject')}
                            />
                            {form.formState.errors.subject && (
                                <p className="text-sm text-red-500">{form.formState.errors.subject.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="priority">Priority</Label>
                            <Select onValueChange={(val) => form.setValue('priority', val)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">Low - General Question</SelectItem>
                                    <SelectItem value="medium">Medium - Feature Issue</SelectItem>
                                    <SelectItem value="high">High - System Blocker</SelectItem>
                                </SelectContent>
                            </Select>
                            {form.formState.errors.priority && (
                                <p className="text-sm text-red-500">{form.formState.errors.priority.message}</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            placeholder="Describe the issue in detail..."
                            className="min-h-[120px]"
                            {...form.register('description')}
                        />
                        {form.formState.errors.description && (
                            <p className="text-sm text-red-500">{form.formState.errors.description.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="attachment">Attachment (Optional)</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                id="attachment"
                                type="file"
                                className="cursor-pointer file:text-blue-600 file:font-semibold file:bg-blue-50 file:border-0 file:mr-4 file:py-1 file:px-3 file:rounded-full hover:file:bg-blue-100"
                                {...form.register('attachment')}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Submitting Ticket...
                                </>
                            ) : (
                                <>
                                    <Send className="mr-2 h-4 w-4" />
                                    Submit Ticket
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
