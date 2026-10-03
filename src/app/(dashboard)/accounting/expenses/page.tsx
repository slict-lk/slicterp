import { redirect } from 'next/navigation';

export default function ExpensesRedirect() {
    redirect('/accounting/journal-entries');
}
