export type FAQItem = {
    id: string;
    question: string;
    answer: string;
    category: 'billing' | 'account' | 'technical';
};

export const FAQ_DATA: FAQItem[] = [
    {
        id: '1',
        category: 'technical',
        question: 'How do I export sales reports?',
        answer: 'To export sales reports, navigate to the Sales Dashboard, click on "Reports" in the top right corner, and select "Export as CSV" or "Export as PDF".'
    },
    {
        id: '2',
        category: 'account',
        question: 'How do I add a new team member?',
        answer: 'Go to Settings > Team Management and click the "Invite Member" button. Enter their email address and assign a role.'
    },
    {
        id: '3',
        category: 'billing',
        question: 'Where can I find my invoices?',
        answer: 'Your invoices are located in the "Billing" section under your Profile. You can download past invoices from the "History" tab.'
    },
    {
        id: '4',
        category: 'technical',
        question: 'The dashboard is loading slowly. What should I do?',
        answer: 'First, check your internet connection. If the issue persists, try clearing your browser cache or switching to a different browser. If it continues, please submit a support ticket.'
    },
    {
        id: '5',
        category: 'account',
        question: 'How do I change my password?',
        answer: 'You can change your password in the "My Profile" section under the "Security" tab.'
    },
    {
        id: '6',
        category: 'billing',
        question: 'Can I upgrade my plan at any time?',
        answer: 'Yes, you can upgrade your plan instantly from the Billing settings. Changes will be prorated for the current billing cycle.'
    }
];
