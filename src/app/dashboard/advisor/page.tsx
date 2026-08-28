import { getActiveBusiness } from '@/lib/auth/getActiveBusiness';
import { generateAdvisorFindings } from '@/services/advisor';
import { AdvisorPageView } from '@/components/advisor/advisor-page-view';
import { redirect } from 'next/navigation';

export default async function AdvisorPage() {
  const { business } = await getActiveBusiness().catch(() => redirect('/onboarding'));

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
