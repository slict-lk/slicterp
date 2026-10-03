import { AIModuleLayout } from '@/components/ai/ai-module-layout';
import { getUserExperiencePreferences } from '@/lib/ai/control-plane';
import { requireAIAccess } from '@/lib/ai/governance';

export default async function AIWorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { tenantId, user, aiRoles } = await requireAIAccess('view');
  const preferences = await getUserExperiencePreferences(
    tenantId,
    user.id,
    aiRoles.includes('AI_ADMIN') || aiRoles.includes('AUTOMATION_DESIGNER')
  );

  return (
    <AIModuleLayout initialMode={preferences.mode} aiRoles={aiRoles}>
      {children}
    </AIModuleLayout>
  );
}
