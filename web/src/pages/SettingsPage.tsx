import { useState } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/shared/Button';
import { Chip } from '@/components/shared/Chip';
import { StatTile } from '@/components/shared/StatTile';
import { Avatar } from '@/components/shared/Avatar';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

// SETTINGS-API-TODO: replace stubs with real endpoints for team, billing, API keys
const WORKSPACE_SECTIONS = ['General', 'Team', 'Billing', 'API keys', 'Audit log'] as const;
const YOU_SECTIONS = ['Profile', 'Notifications', 'Security'] as const;

type Section = (typeof WORKSPACE_SECTIONS)[number] | (typeof YOU_SECTIONS)[number];

const stubTeam = [
 { name: 'Nattha Sri.', email: 'natthapon.sri@arcfusion.ai', role: 'Admin', active: 'now', initials: 'NS', color: '#0B1A5E', textColor: '#fff' },
 { name: 'Pim K.', email: 'pim@acme.co', role: 'Editor', active: '5 min ago', initials: 'PK', color: '#F1F5F9', textColor: 'var(--text-2)' },
 { name: 'Art T.', email: 'art@acme.co', role: 'Editor', active: '28 min ago', initials: 'AT', color: '#FEF3C7', textColor: 'var(--text-2)' },
 { name: 'Nan P.', email: 'nan@acme.co', role: 'Viewer', active: '1h ago', initials: 'NP', color: '#E0E7FF', textColor: 'var(--text-2)' },
 { name: 'Jay P.', email: 'jay@acme.co', role: 'Editor', active: '3h ago', initials: 'JP', color: '#DCFCE7', textColor: 'var(--text-2)' },
 { name: 'ben@acme.co', email: 'Invite sent · 2 days ago', role: 'Pending', active: '—', initials: 'BG', color: '#FEE2E2', textColor: 'var(--text-2)' },
];

const stubApiKeys = [
 { name: 'CI/CD', key: 'orx_live_••••••vz9', created: 'Jan 14, 2026', lastUsed: '12 min ago', status: 'Active' },
 { name: 'Airflow bridge', key: 'orx_live_••••••x2k', created: 'Nov 2, 2025', lastUsed: '3 days ago', status: 'Active' },
 { name: 'Dev sandbox', key: 'orx_test_••••••b0c', created: 'Oct 10, 2025', lastUsed: '45 days ago', status: 'Stale' },
];

const roleVariant = (role: string): 'blue' | 'soft' | 'warning' => {
 if (role === 'Admin') return 'blue';
 if (role === 'Pending') return 'warning';
 return 'soft';
};

const FieldRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
 <div className="grid grid-cols-[160px_1fr] gap-3 items-center">
 <span className="text-[12.5px] text-text-2">{label}</span>
 {children}
 </div>
);

import React from 'react';

export default function SettingsPage() {
 const { user } = useAuthStore();
 const [activeSection, setActiveSection] = useState<Section>('General');
 const [workspaceName, setWorkspaceName] = useState('OrbitX Workspace');

 const renderContent = () => {
 switch (activeSection) {
 case 'General':
 return (
 <div className="space-y-5">
 <div className="bg-bg-card border border-line-1 rounded-xl p-5 shadow-sm">
 <h2 className="font-display text-[15px] font-semibold text-text-1 mb-1">Workspace</h2>
 <p className="text-[12.5px] text-text-3 mb-4">
 Settings that apply across your entire OrbitX workspace.
 </p>
 <div className="space-y-3">
 <FieldRow label="Workspace name">
 <input
 value={workspaceName}
 onChange={(e) => setWorkspaceName(e.target.value)}
 className="px-2.5 py-1.5 rounded-md border border-line-1 text-[13px] text-text-1 bg-bg-card focus:outline-none focus:border-blue-border focus:ring-[3px] focus:ring-blue-soft hover:border-line-2 transition-shadow w-full"
 />
 </FieldRow>
 <FieldRow label="Slug">
 <div className="font-mono text-[12.5px] text-text-3">
 app.orbitx.io/{workspaceName.toLowerCase().replace(/\s+/g, '-')}
 </div>
 </FieldRow>
 <FieldRow label="Region">
 <div className="font-mono text-[12.5px] text-text-2">Singapore (ap-southeast-1)</div>
 </FieldRow>
 <FieldRow label="Timezone">
 <div className="text-[12.5px] text-text-2">Asia/Bangkok · UTC+7</div>
 </FieldRow>
 <FieldRow label="Default currency">
 <div className="text-[12.5px] text-text-2">USD ($)</div>
 </FieldRow>
 </div>
 <div className="flex justify-end mt-4 pt-4 border-t border-line-soft">
 <Button size="sm">Save changes</Button>
 </div>
 </div>

 <div className="bg-bg-card border border-danger-border rounded-xl p-5 shadow-sm">
 <h2 className="font-display text-[15px] font-semibold text-danger mb-1">Danger zone</h2>
 <p className="text-[12.5px] text-text-3 mb-3">Irreversible actions. Proceed carefully.</p>
 <div className="space-y-2">
 <div className="flex items-center justify-between p-3 border border-line-1 rounded-md">
 <div>
 <div className="font-medium text-[13px] text-text-1">Transfer workspace ownership</div>
 <div className="text-[11.5px] text-text-3">Give full control to another admin.</div>
 </div>
 <Button variant="secondary" size="sm">Transfer</Button>
 </div>
 <div className="flex items-center justify-between p-3 border border-line-1 rounded-md">
 <div>
 <div className="font-medium text-[13px] text-text-1">Delete workspace</div>
 <div className="text-[11.5px] text-text-3">Permanently deletes all data. Cannot be undone.</div>
 </div>
 <Button variant="danger" size="sm">Delete workspace</Button>
 </div>
 </div>
 </div>
 </div>
 );

 case 'Team':
 return (
 <div className="bg-bg-card border border-line-1 rounded-xl shadow-sm overflow-hidden">
 <div className="flex items-center justify-between px-5 py-4 border-b border-line-1">
 <div>
 <h2 className="font-display text-[15px] font-semibold text-text-1">Team members</h2>
 <p className="text-[12.5px] text-text-3">{stubTeam.length} members · 1 pending invite</p>
 </div>
 <Button size="sm">+ Invite</Button>
 </div>
 <table className="w-full text-[13px]">
 <thead>
 <tr className="text-left text-[11px] font-medium text-text-3 uppercase tracking-wider">
 <th className="px-5 py-2.5 border-b border-line-1">Member</th>
 <th className="px-5 py-2.5 border-b border-line-1">Role</th>
 <th className="px-5 py-2.5 border-b border-line-1">Last active</th>
 <th className="px-5 py-2.5 border-b border-line-1 w-9"></th>
 </tr>
 </thead>
 <tbody>
 {stubTeam.map((member) => (
 <tr key={member.email} className="border-t border-line-soft hover:bg-bg-row-hv transition-colors">
 <td className="px-5 py-3">
 <div className="flex items-center gap-2">
 <span
 className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold border border-line-1 shrink-0"
 style={{ background: member.color, color: member.textColor }}
 >
 {member.initials}
 </span>
 <div>
 <div className="font-medium text-text-1">{member.name}</div>
 <div className="text-[11px] text-text-3">{member.email}</div>
 </div>
 </div>
 </td>
 <td className="px-5 py-3">
 <Chip variant={roleVariant(member.role)}>{member.role}</Chip>
 </td>
 <td className="px-5 py-3 text-text-2">{member.active}</td>
 <td className="px-5 py-3 text-text-3 cursor-pointer hover:text-text-1">⋯</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 );

 case 'Billing':
 return (
 <div className="bg-bg-card border border-line-1 rounded-xl p-5 shadow-sm">
 <div className="flex items-start justify-between mb-3">
 <div>
 <h2 className="font-display text-[15px] font-semibold text-text-1">Billing</h2>
 <p className="text-[12.5px] text-text-3">Pro plan · Billed annually</p>
 </div>
 <Button variant="secondary" size="sm">Manage plan</Button>
 </div>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
 <StatTile label="Plan" value={<span className="text-[18px]">Pro</span>} />
 <StatTile label="Sources included" value="Unlimited" />
 <StatTile label="Rows · month" value="82M / 100M" mono />
 <StatTile label="Seats" value="6 / 10" />
 </div>
 <p className="text-[12px] text-text-3">Next invoice: May 1, 2026 · $2,988.00</p>
 </div>
 );

 case 'API keys':
 return (
 <div className="bg-bg-card border border-line-1 rounded-xl shadow-sm overflow-hidden">
 <div className="flex items-center justify-between px-5 py-4 border-b border-line-1">
 <div>
 <h2 className="font-display text-[15px] font-semibold text-text-1">API keys</h2>
 <p className="text-[12.5px] text-text-3">Programmatic access to the OrbitX API.</p>
 </div>
 <Button size="sm">+ New key</Button>
 </div>
 <table className="w-full text-[13px]">
 <thead>
 <tr className="text-left text-[11px] font-medium text-text-3 uppercase tracking-wider">
 <th className="px-5 py-2.5 border-b border-line-1">Name</th>
 <th className="px-5 py-2.5 border-b border-line-1">Key</th>
 <th className="px-5 py-2.5 border-b border-line-1 hidden md:table-cell">Created</th>
 <th className="px-5 py-2.5 border-b border-line-1 hidden md:table-cell">Last used</th>
 <th className="px-5 py-2.5 border-b border-line-1">Status</th>
 <th className="px-5 py-2.5 border-b border-line-1 w-9"></th>
 </tr>
 </thead>
 <tbody>
 {stubApiKeys.map((key) => (
 <tr key={key.name} className="border-t border-line-soft hover:bg-bg-row-hv transition-colors">
 <td className="px-5 py-3 font-medium text-text-1">{key.name}</td>
 <td className="px-5 py-3 font-mono text-[12px] text-text-2">{key.key}</td>
 <td className="px-5 py-3 text-text-2 hidden md:table-cell">{key.created}</td>
 <td className="px-5 py-3 text-text-2 hidden md:table-cell">{key.lastUsed}</td>
 <td className="px-5 py-3">
 <Chip variant={key.status === 'Active' ? 'success' : 'warning'}>{key.status}</Chip>
 </td>
 <td className="px-5 py-3 text-text-3 cursor-pointer hover:text-text-1">⋯</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 );

 default:
 return (
 <div className="bg-bg-card border border-line-1 rounded-xl p-10 text-center shadow-sm">
 <div className="text-[14px] font-semibold text-text-1 mb-1">{activeSection}</div>
 <p className="text-[12.5px] text-text-3">{activeSection} settings are coming soon.</p>
 </div>
 );
 }
 };

 return (
 <Layout title="Settings">
 <div>
 <h1 className="text-[26px] font-bold text-text-1 tracking-tight leading-tight mb-5">
 Settings
 </h1>

 <div className="grid grid-cols-[200px_1fr] gap-6 items-start">
 <nav className="text-[13px] space-y-0.5" aria-label="Settings navigation">
 <div className="text-[11px] font-semibold text-text-3 uppercase tracking-[0.08em] px-2 mb-1">
 Workspace
 </div>
 {WORKSPACE_SECTIONS.map((section) => (
 <button
 key={section}
 type="button"
 onClick={() => setActiveSection(section)}
 className={cn(
 'flex items-center w-full px-2.5 py-2 rounded-lg text-[13.5px] font-medium transition-colors text-left',
 activeSection === section
 ? 'bg-blue-soft text-blue-primary'
 : 'text-text-2 hover:bg-bg-row-hv hover:text-text-1'
 )}
 >
 {section}
 </button>
 ))}
 <div className="text-[11px] font-semibold text-text-3 uppercase tracking-[0.08em] px-2 mb-1 mt-4">
 You
 </div>
 {YOU_SECTIONS.map((section) => (
 <button
 key={section}
 type="button"
 onClick={() => setActiveSection(section)}
 className={cn(
 'flex items-center w-full px-2.5 py-2 rounded-lg text-[13.5px] font-medium transition-colors text-left',
 activeSection === section
 ? 'bg-blue-soft text-blue-primary'
 : 'text-text-2 hover:bg-bg-row-hv hover:text-text-1'
 )}
 >
 {section}
 </button>
 ))}
 {user && (
 <div className="flex items-center gap-2 px-2 py-2 mt-4 border-t border-line-soft">
 <Avatar name={user.name ?? user.email ?? '?'} size="sm" />
 <div className="min-w-0 flex-1">
 <div className="text-[12px] font-medium text-text-1 truncate">{user.name}</div>
 <div className="text-[11px] text-text-3 truncate">{user.email}</div>
 </div>
 </div>
 )}
 </nav>

 <div>{renderContent()}</div>
 </div>
 </div>
 </Layout>
 );
}
