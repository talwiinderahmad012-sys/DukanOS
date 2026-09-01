import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { generateAdvisorFindings } from '@/services/advisor';
import { AdvisorPageView } from '@/components/advisor/advisor-page-view';
import { redirect } from 'next/navigation';
import { canAccessDashboardPath } from '@/lib/permissions/permissions-core';
import { ForbiddenView } from '@/components/access/forbidden';

export default async function AdvisorPage() {
  const { business, membership } = await getActiveBusiness().catch(() => redirect('/onboarding'));

  // Advisor findings expose profit/revenue/expense guidance. Roles without
  // VIEW_PROFIT get the accessible forbidden state instead of the data.
  if (!canAccessDashboardPath(membership.role, '/dashboard/advisor')) {
    return <ForbiddenView role={membership.role} />;
  }

  const { findings, healthScore, summaryText } = await generateAdvisorFindings(
    business.id,
    business.timezone
  );

  return (
    <AdvisorPageView
      businessId={business.id}
      findings={findings.map((finding) => ({
        id: finding.id,
        type: finding.type,
        severity: finding.severity,
        title: finding.title,
        message: finding.message,
        recommendation: finding.recommendation,
        metric: finding.metric,
      }))}
      healthScore={healthScore}
      summaryText={summaryText}
    />
  );
}
