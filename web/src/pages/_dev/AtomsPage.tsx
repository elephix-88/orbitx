import { useState } from 'react';
import { Chip } from '@/components/shared/Chip';
import { Dot } from '@/components/shared/Dot';
import { Avatar } from '@/components/shared/Avatar';
import { Sparkline, type SparkPoint } from '@/components/shared/Sparkline';
import { StatTile } from '@/components/shared/StatTile';
import { SearchShell } from '@/components/shared/SearchShell';
import { SegmentedControl } from '@/components/shared/SegmentedControl';
import { Tabs } from '@/components/shared/Tabs';
import { FlowChip } from '@/components/shared/FlowChip';
import { SelectionBar } from '@/components/shared/SelectionBar';
import { FilterBar } from '@/components/shared/FilterBar';
import { Button } from '@/components/shared/Button';
import { Card } from '@/components/shared/Card';

const chipVariants = ['success', 'warning', 'danger', 'blue', 'violet', 'soft'] as const;
const dotVariants = ['success', 'warning', 'danger', 'blue', 'muted'] as const;
const buttonVariants = [
 'primary',
 'secondary',
 'ghost',
 'danger',
 'destructive',
 'outline',
 'link',
] as const;

const sparkWeek: SparkPoint[] = [
 { status: 'success', height: 0.2 },
 { status: 'success', height: 0.6 },
 { status: 'warning', height: 0.4 },
 { status: 'success', height: 0.9 },
 { status: 'danger', height: 0.3 },
 { status: 'success', height: 0.7 },
 { status: 'success', height: 1 },
];

type Range = 'today' | '7d' | '30d' | '90d';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
 title,
 children,
}) => (
 <section className="space-y-4">
 <h2 className="text-[11px] font-semibold text-text-3 uppercase tracking-[0.08em]">
 {title}
 </h2>
 <Card padding="lg">{children}</Card>
 </section>
);

export default function AtomsPage() {
 const [range, setRange] = useState<Range>('today');
 const [tab, setTab] = useState('all');
 const [search, setSearch] = useState('');
 const [group, setGroup] = useState('none');
 const [view, setView] = useState('table');
 const [selected, setSelected] = useState(3);

 return (
 <div className="min-h-screen bg-bg-page text-text-1">
 <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">
 <header className="space-y-1">
 <div className="text-[11px] font-semibold text-text-3 uppercase tracking-[0.08em]">
 /_dev/atoms
 </div>
 <h1 className="text-[28px] font-bold text-text-1">Atoms kitchen sink</h1>
 <p className="text-[13px] text-text-3">
 Every variant of every Light Professional atom. Dev-only route.
 </p>
 </header>

 <Section title="Chip">
 <div className="flex flex-wrap gap-3">
 {chipVariants.map((variant) => (
 <Chip key={variant} variant={variant}>
 {variant}
 </Chip>
 ))}
 </div>
 </Section>

 <Section title="Dot">
 <div className="flex flex-wrap items-center gap-6">
 {dotVariants.map((variant) => (
 <div key={variant} className="flex items-center gap-2 text-[13px]">
 <Dot variant={variant} />
 <span className="text-text-2">{variant}</span>
 </div>
 ))}
 <div className="flex items-center gap-2 text-[13px]">
 <Dot variant="blue" pulseRing />
 <span className="text-text-2">blue · pulseRing</span>
 </div>
 </div>
 </Section>

 <Section title="Avatar">
 <div className="flex flex-wrap items-center gap-4">
 <Avatar name="Nattha Sri" size="sm" />
 <Avatar name="Nattha Sri" size="md" />
 <Avatar name="Alice Wong" />
 <Avatar name="Bob Stone" />
 <Avatar name="Claire Kim" />
 <Avatar name="Daniel Park" />
 <Avatar name="Team Lead" tone="navy" />
 </div>
 </Section>

 <Section title="Sparkline">
 <div className="flex items-center gap-8">
 <Sparkline points={sparkWeek} />
 <Sparkline
 points={Array.from({ length: 7 }, () => ({
 status: 'success',
 height: 0.9,
 }))}
 />
 <Sparkline
 points={Array.from({ length: 7 }, () => ({
 status: 'danger',
 height: 0.3,
 }))}
 />
 </div>
 </Section>

 <Section title="StatTile">
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 <StatTile label="Active pipelines" value="247" />
 <StatTile
 label="Rows synced · 24h"
 value="4.82M"
 mono
 delta={{ direction: 'up', text: '+12% vs yesterday' }}
 />
 <StatTile
 label="Failed runs · 24h"
 value="11"
 delta={{ direction: 'down', text: '-3 vs yesterday' }}
 />
 <StatTile
 label="Spend captured · 7d"
 value="$2.18M"
 mono
 delta={{ direction: 'flat', text: '—' }}
 />
 </div>
 </Section>

 <Section title="SearchShell">
 <div className="flex flex-wrap items-center gap-4">
 <SearchShell
 placeholder="Search pipelines…"
 value={search}
 onChange={setSearch}
 kbdHint="⌘K"
 />
 <SearchShell placeholder="md width" width="md" />
 <SearchShell placeholder="full width" width="full" />
 </div>
 </Section>

 <Section title="SegmentedControl">
 <SegmentedControl<Range>
 options={[
 { value: 'today', label: 'Today' },
 { value: '7d', label: '7d' },
 { value: '30d', label: '30d' },
 { value: '90d', label: '90d' },
 ]}
 value={range}
 onChange={setRange}
 />
 </Section>

 <Section title="Tabs">
 <Tabs
 items={[
 { id: 'all', label: 'All', count: 247 },
 { id: 'attention', label: 'Needs attention', count: 8 },
 { id: 'running', label: 'Running', count: 12 },
 { id: 'failed', label: 'Failed this week', count: 5 },
 ]}
 activeId={tab}
 onChange={setTab}
 trailingAction={<Button variant="ghost" size="sm">+ Save view</Button>}
 />
 </Section>

 <Section title="FlowChip">
 <div className="flex flex-wrap gap-4">
 <FlowChip source="Facebook Ads" destination="BigQuery" />
 <FlowChip source="Google Ads" destination="Snowflake" />
 <FlowChip source="TikTok Ads" destination="Sheets" />
 </div>
 </Section>

 <Section title="SelectionBar">
 <div className="space-y-3">
 <SelectionBar
 count={selected}
 actions={[
 { label: 'Run', onClick: () => {} },
 { label: 'Pause', onClick: () => {} },
 { label: 'Move to folder', onClick: () => {} },
 { label: 'Delete', onClick: () => {}, destructive: true },
 ]}
 onClear={() => setSelected(0)}
 />
 <Button variant="secondary" size="sm" onClick={() => setSelected(3)}>
 Reset to 3 selected
 </Button>
 </div>
 </Section>

 <Section title="FilterBar">
 <FilterBar
 search={{
 placeholder: 'Search pipelines…',
 value: search,
 onChange: setSearch,
 }}
 filters={[
 { label: 'Status', value: 'All', options: ['All', 'Healthy', 'Failed'], onSelect: () => {} },
 { label: 'Source', value: 'Any', options: ['Any', 'Facebook', 'Google'], onSelect: () => {} },
 { label: 'Destination', value: 'Any', options: ['Any', 'BigQuery'], onSelect: () => {} },
 { label: 'Schedule', value: 'Any', options: ['Any', 'Hourly', 'Daily'], onSelect: () => {} },
 ]}
 groupBy={{
 options: [
 { value: 'none', label: 'None' },
 { value: 'client', label: 'Client' },
 { value: 'status', label: 'Status' },
 ],
 value: group,
 onChange: setGroup,
 }}
 viewToggle={{
 options: [
 { value: 'table', label: 'Table' },
 { value: 'grid', label: 'Grid' },
 ],
 value: view,
 onChange: setView,
 }}
 />
 </Section>

 <Section title="Button">
 <div className="flex flex-wrap gap-3">
 {buttonVariants.map((variant) => (
 <Button key={variant} variant={variant}>
 {variant}
 </Button>
 ))}
 </div>
 </Section>
 </div>
 </div>
 );
}
