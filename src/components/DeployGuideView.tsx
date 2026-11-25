import { useEffect, useState } from 'react';
import { Check, Download, ExternalLink } from 'lucide-react';

interface DeployGuideViewProps {
  onDownloadFullXml: () => void;
}

const ARCHITECTURE_MAPPING = [
  {
    section: 'Brand Colors & Typography',
    mechanism: "<b:skin> <Variable> (type='color', type='font')",
    editability: 'Editable via Blogger Theme > Customize color pickers and font selectors.',
  },
  {
    section: 'Sticky Header & Drawer',
    mechanism: "<b:section id='header'> + PageList1 + #ez-mobile-drawer",
    editability: 'Clean links to Homepage sections & separate Blogs page; zero tag/label clutter in header.',
  },
  {
    section: 'Tablet & Mobile Widget Zones',
    mechanism: "id='ezible-tablet-widgets' + id='ezible-mobile-widgets'",
    editability: 'Dedicated Blogger Layout sections scoped exclusively to Tablet (641–1024px) and Mobile (<=640px).',
  },
  {
    section: 'Hero, Services & Proof',
    mechanism: "id='ezible-hero', 'ezible-services', 'ezible-projects', 'ezible-testimonials'",
    editability: 'Per-device grid columns and visibility rules configured independently for Desktop, Tablet, and Mobile.',
  },
  {
    section: 'Homepage Blog Feed (3–6)',
    mechanism: "Blog1 (data:view.isHomepage + data:idx lt 3..6)",
    editability: 'Shows strictly 3–6 recent posts configured in Blogger Settings with zero tags/labels and a View All Blogs CTA.',
  },
  {
    section: 'Separate All Blogs Page',
    mechanism: "data:view.isMultipleItems and !data:view.isHomepage + Label1",
    editability: 'Dedicated /search archive serving all posts dynamically with scoped Label1 topic tags and pagination.',
  },
  {
    section: 'Dynamic Single Blog Post',
    mechanism: "Blog1 (data:view.isSingleItem)",
    editability: 'Dynamic per-post view with Home / Blogs breadcrumb, AEO TL;DR box, responsive tables, FAQs, and SVG share.',
  },
  {
    section: 'Newsletter & Contact',
    mechanism: "<b:section id='footer-newsletter'> + ContactForm1",
    editability: 'Independently toggleable per device; Brevo/Mailchimp/ConvertKit endpoint + Google anti-spam.',
  },
];

const DEPLOY_STEPS = [
  {
    id: 'step-export',
    title: '01. Configure Devices, Blog Count (3–6) & Export XML',
    detail:
      'Set your Homepage Blog Count (3–6), review Desktop/Tablet/Mobile widget settings in the Devices tab, and download the versioned XML file.',
  },
  {
    id: 'step-backup',
    title: '02. Back Up Existing Blogger Theme',
    detail:
      'In Blogger Dashboard > Theme, open the Customize dropdown and choose Back up before uploading the new template.',
  },
  {
    id: 'step-upload',
    title: '03. Restore & Upload XML Template',
    detail:
      'Open Theme > Customize dropdown > Restore > Upload and select your exported XML. Blogger validates namespaces, <b:skin> variables, and device sections.',
  },
  {
    id: 'step-posts-setting',
    title: '04. Set Blogger Homepage Post Count (3–6)',
    detail:
      'In Blogger Dashboard > Settings > Posts > Max posts shown on main page, enter 3, 4, 5, or 6 to match your theme configuration. All posts remain dynamically reachable on /search.',
  },
  {
    id: 'step-layout',
    title: '05. Manage Desktop, Tablet & Mobile Widgets in Layout',
    detail:
      'Open Blogger Layout to customize ezible-tablet-widgets, ezible-mobile-widgets, blogs-labels-section (Label1 on the Blogs page), and your newsletter endpoint.',
  },
  {
    id: 'step-benchmark',
    title: '06. Verify Rich Results & Multi-Device Responsiveness',
    detail:
      'Test Homepage, /search Blogs archive, and a dynamic Single Post on Desktop, Tablet, and Mobile in PageSpeed Insights and Google Rich Results Test.',
  },
];

const STORAGE_KEY = 'ezible_deploy_checklist_v1';

export function DeployGuideView({ onDownloadFullXml }: DeployGuideViewProps) {
  const [completedSteps, setCompletedSteps] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(completedSteps));
    } catch {
      // Ignore storage quota errors
    }
  }, [completedSteps]);

  const toggleStep = (id: string) => {
    setCompletedSteps((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-8">
      <div className="pb-5 border-b border-slate-200 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Architecture Mapping &amp; Blogger Deployment
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Reference how every EZIBLE section maps to native Blogger widgets and track your deployment milestones.
          </p>
        </div>

        <button
          type="button"
          onClick={onDownloadFullXml}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Download className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Download ezible-it-solutions.xml</span>
        </button>
      </div>

      {/* Phase 1 Architecture & Theme Designer Mapping Table */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">
          Phase 1: Blogger Native Widget Mapping
        </h2>
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                  <th className="py-3 px-4 font-semibold">Template Section</th>
                  <th className="py-3 px-4 font-semibold">Blogger Native Mechanism</th>
                  <th className="py-3 px-4 font-semibold">Theme Designer &amp; Layout Editability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ARCHITECTURE_MAPPING.map((row) => (
                  <tr key={row.section} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      {row.section}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-blue-800">
                      {row.mechanism}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{row.editability}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Phase 4 Interactive Deployment Checklist */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Phase 4: Deployment &amp; Benchmarking Checklist
          </h2>
          <span className="text-xs font-medium text-slate-600 tabular-nums">
            {completedSteps.length} / {DEPLOY_STEPS.length} completed
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
          {DEPLOY_STEPS.map((step) => {
            const done = completedSteps.includes(step.id);
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => toggleStep(step.id)}
                className="w-full text-left px-5 py-4 flex items-start gap-4 hover:bg-slate-50/70 transition-colors cursor-pointer"
              >
                <span
                  className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                    done
                      ? 'bg-blue-700 border-blue-700 text-white'
                      : 'bg-white border-slate-300'
                  }`}
                >
                  {done && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
                </span>
                <div className="space-y-1">
                  <div
                    className={`text-sm font-semibold ${
                      done ? 'line-through text-slate-400' : 'text-slate-900'
                    }`}
                  >
                    {step.title}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {step.detail}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* External Benchmarking Quick Links */}
        <div className="flex flex-wrap items-center gap-4 pt-2 text-xs">
          <a
            href="https://search.google.com/test/rich-results"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-medium text-blue-700 hover:text-blue-900 hover:underline underline-offset-4"
          >
            <span>Google Rich Results Test</span>
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          </a>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <a
            href="https://pagespeed.web.dev/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-medium text-blue-700 hover:text-blue-900 hover:underline underline-offset-4"
          >
            <span>PageSpeed Insights</span>
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          </a>
        </div>
      </section>
    </div>
  );
}
