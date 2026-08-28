'use client';

import { useState } from 'react';
import { 
  Bug, 
  Lightbulb, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ChevronRight,
  Filter,
  Save
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/language-context';
import { triageBugReportAction, triageFeatureRequestAction } from '@/app/actions/product-feedback.actions';

export type BugSeverity = 'P0' | 'P1' | 'P2' | 'P3';
export type BugStatus = 'NEW' | 'TRIAGED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'WONT_FIX';
export type ProductFeedbackStatus = 'NEW' | 'REVIEWING' | 'PLANNED' | 'IN_DEVELOPMENT' | 'SHIPPED' | 'DECLINED';

interface BugItem {
  id: string;
  module: string;
  title: string;
  description: string;
  severity: BugSeverity;
  status: BugStatus;
  developerNotes: string | null;
  createdAt: string;
  reporter: { name: string | null; email: string | null };
  business: { name: string } | null;
}

interface FeatureItem {
  id: string;
  title: string | null;
  category: string | null;
  message: string;
  status: ProductFeedbackStatus;
  adminNotes: string | null;
  createdAt: string;
  user: { name: string | null; email: string | null };
}

export function BugTriagePanel({
  initialBugs,
  initialFeatures,
}: {
  initialBugs: BugItem[];
  initialFeatures: FeatureItem[];
}) {
  const { t, language } = useTranslation();
  const dateLocale = language === 'UR' ? 'ur-PK' : 'en-PK';
  const bugStatusLabel = (v: string) => t(`feedback.enums.bugStatuses.${v}`, v);
  const featureStatusLabel = (v: string) => t(`feedback.enums.featureStatuses.${v}`, v);

  const [tab, setTab] = useState<'bugs' | 'features'>('bugs');
  const [bugs, setBugs] = useState<BugItem[]>(initialBugs);
  const [features, setFeatures] = useState<FeatureItem[]>(initialFeatures);
  const [selectedBugId, setSelectedBugId] = useState<string | null>(initialBugs[0]?.id || null);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(initialFeatures[0]?.id || null);

  const [triageStatus, setTriageStatus] = useState<BugStatus>('NEW');
  const [triageSeverity, setTriageSeverity] = useState<BugSeverity>('P2');
  const [devNotes, setDevNotes] = useState('');

  const [featureStatus, setFeatureStatus] = useState<ProductFeedbackStatus>('NEW');
  const [featureAdminNotes, setFeatureAdminNotes] = useState('');

  const [updating, setUpdating] = useState(false);

  const selectedBug = bugs.find((b) => b.id === selectedBugId);
  const selectedFeature = features.find((f) => f.id === selectedFeatureId);

  const handleSelectBug = (bug: BugItem) => {
    setSelectedBugId(bug.id);
    setTriageStatus(bug.status);
    setTriageSeverity(bug.severity);
    setDevNotes(bug.developerNotes || '');
  };

  const handleSelectFeature = (feat: FeatureItem) => {
    setSelectedFeatureId(feat.id);
    setFeatureStatus(feat.status);
    setFeatureAdminNotes(feat.adminNotes || '');
  };

  const handleSaveBug = async () => {
    if (!selectedBugId) return;
    setUpdating(true);
    const res = await triageBugReportAction({
      bugId: selectedBugId,
      status: triageStatus,
      severity: triageSeverity,
      developerNotes: devNotes.trim() || undefined,
    });
    setUpdating(false);
    if (res.success && res.bug) {
      setBugs((prev) =>
        prev.map((b) => (b.id === selectedBugId ? { ...b, status: res.bug.status as BugStatus, severity: res.bug.severity as BugSeverity, developerNotes: res.bug.developerNotes } : b))
      );
    }
  };

  const handleSaveFeature = async () => {
    if (!selectedFeatureId) return;
    setUpdating(true);
    const res = await triageFeatureRequestAction({
      feedbackId: selectedFeatureId,
      status: featureStatus,
      adminNotes: featureAdminNotes.trim() || undefined,
    });
    setUpdating(false);
    if (res.success && res.feedback) {
      setFeatures((prev) =>
        prev.map((f) => (f.id === selectedFeatureId ? { ...f, status: res.feedback.status as ProductFeedbackStatus, adminNotes: res.feedback.adminNotes } : f))
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex gap-2 border-b pb-3">
        <button
          onClick={() => setTab('bugs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            tab === 'bugs'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          <Bug className="w-4 h-4" />
          <span>{t('feedback.triage.bugsTab', { count: bugs.length })}</span>
        </button>
        <button
          onClick={() => setTab('features')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            tab === 'features'
              ? 'bg-primary-soft text-gray-950 border border-blue-200'
              : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          <Lightbulb className="w-4 h-4" />
          <span>{t('feedback.triage.featuresTab', { count: features.length })}</span>
        </button>
      </div>

      {tab === 'bugs' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bug List */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-2 max-h-[600px] overflow-y-auto">
            {bugs.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400">{t('feedback.triage.noBugs')}</div>
            ) : (
              bugs.map((bug) => (
                <button
                  key={bug.id}
                  onClick={() => handleSelectBug(bug)}
                  className={`w-full text-start p-3 rounded-xl border text-xs transition-all space-y-1.5 ${
                    selectedBugId === bug.id
                      ? 'bg-primary-soft/70 border-blue-300 shadow-xs'
                      : 'bg-gray-50/50 border-gray-100 hover:bg-gray-100/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        bug.severity === 'P0'
                          ? 'bg-red-600 text-white'
                          : bug.severity === 'P1'
                          ? 'bg-orange-500 text-white'
                          : 'bg-primary text-on-primary'
                      }`}
                    >
                      {bug.severity}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {new Date(bug.createdAt).toLocaleDateString(dateLocale)}
                    </span>
                  </div>
                  <div className="font-semibold text-gray-900 line-clamp-1">{bug.title}</div>
                  <div className="text-[11px] text-gray-500 flex items-center justify-between">
                    <span>{bug.module}</span>
                    <span className="font-semibold text-gray-700">{bugStatusLabel(bug.status)}</span>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Bug Detail & Triage Controls */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
            {selectedBug ? (
              <div className="space-y-6">
                <div className="border-b pb-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-900 bg-primary-soft px-2.5 py-1 rounded">
                      {t('feedback.triage.module', { module: selectedBug.module })}
                    </span>
                    <span className="text-xs text-gray-400">
                      {t('feedback.triage.reportedBy', { name: selectedBug.reporter.name || '', business: selectedBug.business?.name || t('feedback.triage.platform') })}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{selectedBug.title}</h3>
                  <p className="text-xs text-gray-700 bg-gray-50 p-3.5 rounded-xl border border-gray-100 whitespace-pre-wrap leading-relaxed">
                    {selectedBug.description}
                  </p>
                </div>

                {/* Triage Form */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    {t('feedback.triage.triageControlsTitle')}
                  </h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-700">{t('feedback.triage.triageStatusLabel')}</label>
                      <select
                        value={triageStatus}
                        onChange={(e) => setTriageStatus(e.target.value as BugStatus)}
                        className="w-full text-xs p-2 rounded-lg border border-gray-200 bg-gray-50"
                      >
                        <option value="NEW">{bugStatusLabel('NEW')}</option>
                        <option value="TRIAGED">{bugStatusLabel('TRIAGED')}</option>
                        <option value="IN_PROGRESS">{bugStatusLabel('IN_PROGRESS')}</option>
                        <option value="RESOLVED">{bugStatusLabel('RESOLVED')}</option>
                        <option value="CLOSED">{bugStatusLabel('CLOSED')}</option>
                        <option value="WONT_FIX">{bugStatusLabel('WONT_FIX')}</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-700">{t('feedback.triage.severityLevelLabel')}</label>
                      <select
                        value={triageSeverity}
                        onChange={(e) => setTriageSeverity(e.target.value as BugSeverity)}
                        className="w-full text-xs p-2 rounded-lg border border-gray-200 bg-gray-50"
                      >
                        <option value="P0">{t('feedback.triage.severityP0')}</option>
                        <option value="P1">{t('feedback.triage.severityP1')}</option>
                        <option value="P2">{t('feedback.triage.severityP2')}</option>
                        <option value="P3">{t('feedback.triage.severityP3')}</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700">{t('feedback.triage.devNotesLabel')}</label>
                    <textarea
                      rows={3}
                      value={devNotes}
                      onChange={(e) => setDevNotes(e.target.value)}
                      placeholder={t('feedback.triage.devNotesPlaceholder')}
                      className="w-full text-xs p-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white resize-none"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveBug}
                      disabled={updating}
                      className="px-4 py-2 bg-primary hover:bg-primary-hover text-on-primary rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {updating ? t('common.saving') : t('feedback.triage.updateBugStatus')}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-gray-400">
                {t('feedback.triage.selectBug')}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Feature List */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-2 max-h-[600px] overflow-y-auto">
            {features.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400">{t('feedback.triage.noFeatures')}</div>
            ) : (
              features.map((feat) => (
                <button
                  key={feat.id}
                  onClick={() => handleSelectFeature(feat)}
                  className={`w-full text-start p-3 rounded-xl border text-xs transition-all space-y-1.5 ${
                    selectedFeatureId === feat.id
                      ? 'bg-primary-soft/70 border-blue-300 shadow-xs'
                      : 'bg-gray-50/50 border-gray-100 hover:bg-gray-100/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                      {featureStatusLabel(feat.status)}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {new Date(feat.createdAt).toLocaleDateString(dateLocale)}
                    </span>
                  </div>
                  <div className="font-semibold text-gray-900 line-clamp-1">{feat.title || t('feedback.triage.featureIdea')}</div>
                  <div className="text-[11px] text-gray-500">{feat.category || t('feedback.triage.general')}</div>
                </button>
              ))
            )}
          </div>

          {/* Feature Detail & Status updater */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
            {selectedFeature ? (
              <div className="space-y-6">
                <div className="border-b pb-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded">
                      {t('feedback.triage.categoryLabel', { category: selectedFeature.category || t('feedback.triage.general') })}
                    </span>
                    <span className="text-xs text-gray-400">
                      {t('feedback.triage.suggestedBy', { name: selectedFeature.user.name || '' })}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {selectedFeature.title || t('feedback.triage.userSuggestion')}
                  </h3>
                  <p className="text-xs text-gray-700 bg-gray-50 p-3.5 rounded-xl border border-gray-100 whitespace-pre-wrap leading-relaxed">
                    {selectedFeature.message}
                  </p>
                </div>

                {/* Triage Form */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    {t('feedback.triage.roadmapTitle')}
                  </h4>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700">{t('feedback.triage.roadmapStatusLabel')}</label>
                    <select
                      value={featureStatus}
                      onChange={(e) => setFeatureStatus(e.target.value as ProductFeedbackStatus)}
                      className="w-full text-xs p-2 rounded-lg border border-gray-200 bg-gray-50"
                    >
                      <option value="NEW">{featureStatusLabel('NEW')}</option>
                      <option value="REVIEWING">{featureStatusLabel('REVIEWING')}</option>
                      <option value="PLANNED">{featureStatusLabel('PLANNED')}</option>
                      <option value="IN_DEVELOPMENT">{featureStatusLabel('IN_DEVELOPMENT')}</option>
                      <option value="SHIPPED">{featureStatusLabel('SHIPPED')}</option>
                      <option value="DECLINED">{featureStatusLabel('DECLINED')}</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700">{t('feedback.triage.productTeamNotesLabel')}</label>
                    <textarea
                      rows={3}
                      value={featureAdminNotes}
                      onChange={(e) => setFeatureAdminNotes(e.target.value)}
                      placeholder={t('feedback.triage.productTeamNotesPlaceholder')}
                      className="w-full text-xs p-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white resize-none"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveFeature}
                      disabled={updating}
                      className="px-4 py-2 bg-primary hover:bg-primary-hover text-on-primary rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {updating ? t('common.saving') : t('feedback.triage.updateRoadmapStatus')}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-gray-400">
                {t('feedback.triage.selectFeature')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
