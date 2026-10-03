export default function CRMLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col w-full min-h-full">
            <main className="flex-1 overflow-auto bg-gray-50/50">
                {children}
            </main>
        </div>
    );
}
