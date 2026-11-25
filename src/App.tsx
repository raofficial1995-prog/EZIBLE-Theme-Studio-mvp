import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_SITE_CONFIG } from './data/defaultConfig';
import {
  generateCompleteBloggerXml,
  validateBloggerXml,
} from './lib/bloggerXmlGenerator';
import { analyzeBloggerXmlSeo } from './lib/seoXmlAuditor';
import {
  analyzeBloggerXmlAccessibility,
  applyAccessibilityFixesToConfig,
} from './lib/accessibilityAuditor';
import {
  applyPerformanceFixesToConfig,
  simulateBloggerXmlPerformance,
} from './lib/performanceSimulator';
import {
  createConfigSnapshot,
  formatVersionFilenameSlug,
  hydrateSiteConfig,
  loadConfigHistory,
  normalizeVersionTag,
  persistConfigHistory,
  pushConfigSnapshot,
} from './lib/configHistory';
import {
  buildWorkspaceExportFilename,
  ImportedWorkspacePayload,
  serializeWorkspaceExport,
} from './lib/workspaceConfigIO';
import {
  A11yFixActionId,
  ConfigSnapshot,
  DeviceProfileKey,
  PerfFixActionId,
  PerfSimulationProfile,
  SeoFixActionId,
  SiteConfig,
  WorkspaceTab,
} from './types/template';
import { StudioHeader } from './components/StudioHeader';
import { ThemeSidebar } from './components/ThemeSidebar';
import { LivePreview } from './components/LivePreview';
import { XmlBuilderView } from './components/XmlBuilderView';
import { SchemaSeoView } from './components/SchemaSeoView';
import { SeoAuditView } from './components/SeoAuditView';
import { AccessibilityAuditView } from './components/AccessibilityAuditView';
import { PerformanceDashboardView } from './components/PerformanceDashboardView';
import { DeployGuideView } from './components/DeployGuideView';

const CONFIG_STORAGE_KEY = 'ezible_blogger_studio_config_v2';

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('preview');
  const [activeDevice, setActiveDevice] = useState<DeviceProfileKey>('desktop');
  const [perfProfile, setPerfProfile] =
    useState<PerfSimulationProfile>('mobile-4g');
  const [config, setConfig] = useState<SiteConfig>(() => {
    try {
      const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (saved) {
        return hydrateSiteConfig(JSON.parse(saved) as Partial<SiteConfig>);
      }
    } catch {
      // Fallback to defaults
    }
    return DEFAULT_SITE_CONFIG;
  });
  const [snapshots, setSnapshots] = useState<ConfigSnapshot[]>(() =>
    loadConfigHistory()
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    } catch {
      // Ignore localStorage write errors
    }
  }, [config]);

  useEffect(() => {
    persistConfigHistory(snapshots);
  }, [snapshots]);

  const fullXml = useMemo(() => generateCompleteBloggerXml(config), [config]);
  const validation = useMemo(
    () =>
      validateBloggerXml(fullXml, {
        preloadCriticalAssets: config.preloadCriticalAssets,
      }),
    [fullXml, config.preloadCriticalAssets]
  );
  const seoAudit = useMemo(
    () => analyzeBloggerXmlSeo(fullXml, config),
    [fullXml, config]
  );
  const a11yAudit = useMemo(
    () => analyzeBloggerXmlAccessibility(fullXml, config),
    [fullXml, config]
  );
  const perfReport = useMemo(
    () => simulateBloggerXmlPerformance(fullXml, config, perfProfile),
    [fullXml, config, perfProfile]
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3000);
  };

  const triggerXmlDownload = (filename: string, xmlContent: string) => {
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Exported ${filename} (${(blob.size / 1024).toFixed(1)} KB)`);
  };

  const handleDownloadFull = () => {
    const versionSlug = formatVersionFilenameSlug(config.versioning.version);
    triggerXmlDownload(`ezible-it-solutions-${versionSlug}.xml`, fullXml);
  };

  const handleResetDefaults = () => {
    setConfig(DEFAULT_SITE_CONFIG);
    showToast('Reset Theme Designer variables to EZIBLE defaults');
  };

  const handleSaveSnapshot = (label?: string, version?: string) => {
    const normalizedVersion = normalizeVersionTag(
      version ?? config.versioning.version
    );
    const nextConfig: SiteConfig =
      normalizedVersion !== config.versioning.version
        ? {
            ...config,
            versioning: {
              ...config.versioning,
              version: normalizedVersion,
            },
          }
        : config;

    if (nextConfig !== config) {
      setConfig(nextConfig);
    }

    const snap = createConfigSnapshot(nextConfig, label, normalizedVersion);
    setSnapshots((prev) => pushConfigSnapshot(prev, snap));
    showToast(`Saved ${snap.version} snapshot "${snap.label}"`);
  };

  const handleRestoreSnapshot = (snapshot: ConfigSnapshot) => {
    setConfig(hydrateSiteConfig(snapshot.config));
    showToast(`Restored ${snapshot.version} — "${snapshot.label}"`);
  };

  const handleDeleteSnapshot = (id: string) => {
    setSnapshots((prev) => prev.filter((item) => item.id !== id));
    showToast('Removed snapshot from local history');
  };

  const handleClearHistory = () => {
    setSnapshots([]);
    showToast('Cleared all saved snapshots');
  };

  const handleExportWorkspaceJson = () => {
    const filename = buildWorkspaceExportFilename(config);
    const jsonContent = serializeWorkspaceExport(config, snapshots, activeDevice);
    const blob = new Blob([jsonContent], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Exported workspace JSON: ${filename}`);
  };

  const handleImportWorkspace = (payload: ImportedWorkspacePayload) => {
    setConfig(payload.config);
    if (payload.snapshots) {
      setSnapshots(payload.snapshots);
    }
    if (payload.activeDevice) {
      setActiveDevice(payload.activeDevice);
    }
    showToast(payload.summary);
  };

  const applySeoFixes = (fixIds: SeoFixActionId[]) => {
    setConfig((prev) => {
      let next = { ...prev };
      for (const fixId of fixIds) {
        if (fixId === 'enable-social-meta') {
          next = { ...next, includeSocialMetaTags: true };
        } else if (fixId === 'enable-preload') {
          next = { ...next, preloadCriticalAssets: true };
        } else if (fixId === 'enable-minify') {
          next = { ...next, minifyXml: true };
        } else if (fixId === 'switch-inline-svg') {
          next = { ...next, imageDeliveryMode: 'inline-svg' };
        } else if (fixId === 'fix-https-domain') {
          const cleaned = prev.domain.trim().replace(/^http:\/\//i, 'https://');
          next = {
            ...next,
            domain: cleaned.startsWith('https://')
              ? cleaned
              : DEFAULT_SITE_CONFIG.domain,
          };
        } else if (fixId === 'optimize-title-length') {
          next = {
            ...next,
            tagline: 'Cloud Architecture, Custom Software & Security',
          };
        }
      }
      return next;
    });
    showToast(
      fixIds.length === 1
        ? 'Applied SEO recommendation to generated XML'
        : `Applied ${fixIds.length} SEO optimizations to generated XML`
    );
  };

  const applyA11yFixes = (fixIds: A11yFixActionId[]) => {
    setConfig((prev) => applyAccessibilityFixesToConfig(prev, fixIds));
    showToast(
      fixIds.length === 1
        ? 'Applied automated WCAG accessibility fix'
        : `Applied ${fixIds.length} WCAG accessibility fixes to template XML`
    );
  };

  const applyPerfFixes = (fixIds: PerfFixActionId[]) => {
    setConfig((prev) => applyPerformanceFixesToConfig(prev, fixIds));
    showToast(
      fixIds.length === 1
        ? 'Applied Core Web Vitals optimization to generated XML'
        : `Applied ${fixIds.length} Core Web Vitals optimizations`
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <StudioHeader
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onDownloadXml={handleDownloadFull}
      />

      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        <ThemeSidebar
          config={config}
          snapshots={snapshots}
          activeDevice={activeDevice}
          onSelectDevice={setActiveDevice}
          onChangeConfig={setConfig}
          onResetDefaults={handleResetDefaults}
          onSaveSnapshot={handleSaveSnapshot}
          onRestoreSnapshot={handleRestoreSnapshot}
          onDeleteSnapshot={handleDeleteSnapshot}
          onClearHistory={handleClearHistory}
          onExportWorkspaceJson={handleExportWorkspaceJson}
          onImportWorkspace={handleImportWorkspace}
        />

        <main className="flex-1 min-w-0 bg-slate-50 overflow-y-auto">
          {activeTab === 'preview' && (
            <LivePreview
              config={config}
              validation={validation}
              viewport={activeDevice}
              onSelectViewport={setActiveDevice}
              onInspectXml={() => setActiveTab('xml')}
            />
          )}

          {activeTab === 'xml' && (
            <XmlBuilderView
              config={config}
              validation={validation}
              onDownloadXml={triggerXmlDownload}
            />
          )}

          {activeTab === 'schema' && (
            <SchemaSeoView config={config} validation={validation} />
          )}

          {activeTab === 'audit' && (
            <SeoAuditView
              config={config}
              audit={seoAudit}
              onApplyFix={(id) => applySeoFixes([id])}
              onApplyAllFixes={applySeoFixes}
              onInspectXml={() => setActiveTab('xml')}
            />
          )}

          {activeTab === 'a11y' && (
            <AccessibilityAuditView
              audit={a11yAudit}
              onApplyFix={(id) => applyA11yFixes([id])}
              onApplyAllFixes={applyA11yFixes}
              onInspectXml={() => setActiveTab('xml')}
            />
          )}

          {activeTab === 'perf' && (
            <PerformanceDashboardView
              report={perfReport}
              profile={perfProfile}
              onSelectProfile={setPerfProfile}
              onApplyFix={(id) => applyPerfFixes([id])}
              onApplyAllFixes={applyPerfFixes}
              onInspectXml={() => setActiveTab('xml')}
            />
          )}

          {activeTab === 'deploy' && (
            <DeployGuideView onDownloadFullXml={handleDownloadFull} />
          )}
        </main>
      </div>

      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 px-4 py-2.5 bg-slate-900 text-white text-xs font-medium rounded-md shadow-lg border border-slate-700"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
