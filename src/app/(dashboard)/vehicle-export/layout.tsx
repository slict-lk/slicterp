export default function VehicleExportLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-full w-full bg-slate-50/50 dark:bg-slate-950/50">
            {/* Subtle background gradient for depth */}
            <div className="fixed inset-0 pointer-events-none opacity-20 dark:opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100 via-transparent to-transparent dark:from-blue-900" />

            {/* Content Content - Relative to stack above background */}
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
}
