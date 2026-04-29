import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
 User as UserIcon,
 Shield,
 Bell,
 Link2,
 CreditCard,
 Users,
 KeyRound,
 ScrollText,
 Settings as SettingsIcon,
 LogOut,
 ArrowRight,
 Sparkles,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { Button } from '@/components/shared/Button';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

// SETTINGS-API-TODO: Team, Billing, API keys, Audit log, workspace mutations are not
// implemented in the backend yet. These sections render honest empty states until
// the corresponding services ship.

const WORKSPACE_SECTIONS = [
  { id: 'general', label: 'General', icon: SettingsIcon },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'api-keys', label: 'API keys', icon: KeyRound },
  { id: 'audit', label: 'Audit log', icon: ScrollText },
] as const;

const YOU_SECTIONS = [
  { id: 'profile', label: 'Profile', icon: UserIcon },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
] as const;

type SectionId =
  | (typeof WORKSPACE_SECTIONS)[number]['id']
  | (typeof YOU_SECTIONS)[number]['id'];

interface SoonPanelProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  hint?: string;
}

const SoonPanel: React.FC<SoonPanelProps> = ({ icon: Icon, title, description, hint }) => (
  <div className="relative bg-bg-card border border-line-1 rounded-xl p-10 text-center overflow-hidden">
    <div className="absolute inset-x-0 top-0 h-1 bg-blue-primary" />
    <div className="w-12 h-12 rounded-xl bg-blue-soft border border-blue-border flex items-center justify-center mx-auto mb-4">
      <Icon className="w-5 h-5 text-blue-primary" />
    </div>
    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 mb-3 bg-blue-soft border border-blue-border rounded-full">
      <Sparkles className="w-3 h-3 text-blue-primary" />
      <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-primary">
        Coming soon
      </span>
    </div>
    <div className="text-[15px] font-semibold text-text-1">{title}</div>
    <p className="text-[13px] mt-1.5 max-w-md mx-auto text-text-2">{description}</p>
    {hint && <p className="mt-4 text-[12px] text-text-3">{hint}</p>}
  </div>
);

interface SectionHeaderProps {
  icon: React.ComponentType<{ className?: string }>;
  tint: string;
  badgeClass: string;
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  icon: Icon,
  tint,
  badgeClass,
  eyebrow,
  title,
  description,
  action,
}) => (
  <div className="flex items-start justify-between gap-4 mb-5">
    <div className="flex items-start gap-3">
      <span
        className={cn(
          'w-9 h-9 flex items-center justify-center rounded-md border flex-shrink-0 mt-0.5',
          badgeClass,
          tint,
        )}
      >
        <Icon className="w-4 h-4" />
      </span>
      <div>
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-text-3">
          {eyebrow}
        </div>
        <h2 className="text-[16px] font-semibold text-text-1 mt-0.5">{title}</h2>
        {description && <p className="text-[12.5px] text-text-2 mt-1">{description}</p>}
      </div>
    </div>
    {action && <div className="flex-shrink-0">{action}</div>}
  </div>
);

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [activeSection, setActiveSection] = useState<SectionId>('profile');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'general':
        return (
          <div className="space-y-5">
            <div className="bg-bg-card border border-line-1 rounded-xl p-6 shadow-sm">
              <SectionHeader
                icon={SettingsIcon}
                tint="text-blue-primary"
                badgeClass="bg-blue-soft border-blue-border"
                eyebrow="Workspace"
                title="General"
                description="Account-level settings for your OrbitX workspace."
              />
              <div className="space-y-4">
                <div className="grid grid-cols-[180px_1fr] gap-3 items-center">
                  <span className="text-[10.5px] font-semibold uppercase tracking-wider text-text-3">
                    Workspace
                  </span>
                  <div className="text-[13px] text-text-1 font-medium">OrbitX (Public Beta)</div>
                </div>
                <div className="grid grid-cols-[180px_1fr] gap-3 items-center">
                  <span className="text-[10.5px] font-semibold uppercase tracking-wider text-text-3">
                    Owner
                  </span>
                  <div className="text-[13px] text-text-2 font-mono">{user?.email ?? '—'}</div>
                </div>
                <div className="grid grid-cols-[180px_1fr] gap-3 items-center">
                  <span className="text-[10.5px] font-semibold uppercase tracking-wider text-text-3">
                    Plan
                  </span>
                  <div className="inline-flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-soft border border-blue-border rounded-full text-[11px] font-semibold text-blue-primary">
                      <Sparkles className="w-3 h-3" />
                      Public Beta
                    </span>
                    <span className="text-[11.5px] text-text-3">No charges during Beta</span>
                  </div>
                </div>
              </div>
              <p className="mt-5 pt-4 border-t border-line-soft text-[12px] text-text-3">
                Workspace rename, region, and timezone controls ship in a later release.
              </p>
            </div>
          </div>
        );

      case 'team':
        return (
          <SoonPanel
            icon={Users}
            title="Team workspaces"
            description="Invite teammates, assign roles, and collaborate on pipelines. While you're in Public Beta, OrbitX is a single-user workspace."
            hint={user ? `Signed in as ${user.email}` : undefined}
          />
        );

      case 'billing':
        return (
          <SoonPanel
            icon={CreditCard}
            title="Billing"
            description="Paid plans and usage billing are coming when we exit Public Beta. You will not be charged during Beta."
          />
        );

      case 'api-keys':
        return (
          <SoonPanel
            icon={KeyRound}
            title="API keys"
            description="Programmatic access to the OrbitX API is on the roadmap. For now, every action runs through the visual workflow builder."
          />
        );

      case 'audit':
        return (
          <SoonPanel
            icon={ScrollText}
            title="Audit log"
            description="A detailed record of who did what, when, and from where. Tied to Team workspaces — ships alongside multi-user support."
          />
        );

      case 'profile':
        return (
          <div className="space-y-5">
            <div className="bg-bg-card border border-line-1 rounded-xl p-6 shadow-sm">
              <SectionHeader
                icon={UserIcon}
                tint="text-blue-primary"
                badgeClass="bg-blue-soft border-blue-border"
                eyebrow="You"
                title="Profile"
                description="Your personal account information from Google sign-in."
              />
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-line-soft">
                {user?.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-14 h-14 rounded-full border border-line-1 flex-shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-blue-soft border border-blue-border flex items-center justify-center text-blue-primary font-semibold flex-shrink-0">
                    {(user?.name ?? user?.email ?? '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-semibold text-text-1 truncate">
                    {user?.name ?? 'Signed-in user'}
                  </div>
                  <div className="text-[13px] text-text-2 font-mono truncate">
                    {user?.email ?? ''}
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-[180px_1fr] gap-3 items-center">
                  <span className="text-[10.5px] font-semibold uppercase tracking-wider text-text-3">
                    Sign-in method
                  </span>
                  <div className="inline-flex items-center gap-1.5 text-[13px] text-text-1">
                    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden>
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    <span>Google</span>
                  </div>
                </div>
                <div className="grid grid-cols-[180px_1fr] gap-3 items-center">
                  <span className="text-[10.5px] font-semibold uppercase tracking-wider text-text-3">
                    Role
                  </span>
                  <div className="text-[13px] text-text-1 capitalize">{user?.role ?? 'member'}</div>
                </div>
                <div className="grid grid-cols-[180px_1fr] gap-3 items-center">
                  <span className="text-[10.5px] font-semibold uppercase tracking-wider text-text-3">
                    Status
                  </span>
                  <div className="inline-flex items-center gap-1.5 text-[13px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-success" />
                    <span className="text-success font-medium">Active</span>
                  </div>
                </div>
              </div>
              <p className="mt-5 pt-4 border-t border-line-soft text-[12px] text-text-3">
                Name and avatar sync from your Google account. Update them there to change them here.
              </p>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-5">
            <div className="bg-bg-card border border-line-1 rounded-xl p-6 shadow-sm">
              <SectionHeader
                icon={Bell}
                tint="text-violet"
                badgeClass="bg-violet-bg border-violet-border"
                eyebrow="You"
                title="Notifications"
                description="How OrbitX reaches you when pipelines need attention."
              />
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-bg-page border border-line-1 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-md flex items-center justify-center bg-bg-card border border-line-1" style={{ color: '#4A154B' }}>
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden>
                        <path d="M5 15a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm3 0a2 2 0 0 1 2-2h1v2a2 2 0 1 1-3 0zm2-8a2 2 0 1 0-4 0v5h4V7zm8 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-3 0a2 2 0 0 1-2 2h-1V7a2 2 0 1 1 3 0zm-2 8a2 2 0 1 0 4 0v-5h-4v5zm-5-10a2 2 0 1 0 0 4h5V5a2 2 0 0 0-5 0zm8 8a2 2 0 0 1 0-4h-5v4h5z" />
                      </svg>
                    </span>
                    <div>
                      <div className="text-[13px] font-semibold text-text-1">Slack</div>
                      <div className="text-[12px] text-text-3">Configure per-workflow in the pipeline delivery settings</div>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-success-bg border border-success-border rounded-full text-[11px] font-semibold text-success">
                    <span className="w-1.5 h-1.5 rounded-full bg-success" />
                    Live
                  </span>
                </div>
                {[
                  { name: 'Email', description: 'Run-summary emails and failure digests' },
                  { name: 'Discord', description: 'Alerts in your Discord server' },
                  { name: 'Webhook', description: 'Post to any HTTPS endpoint' },
                ].map((channel) => (
                  <div
                    key={channel.name}
                    className="flex items-center justify-between p-4 bg-bg-page border border-dashed border-line-2 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-md flex items-center justify-center bg-bg-muted border border-line-1 text-text-3">
                        <Bell className="w-4 h-4" />
                      </span>
                      <div>
                        <div className="text-[13px] font-medium text-text-3">{channel.name}</div>
                        <div className="text-[12px] text-text-4">{channel.description}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-text-4">
                      Soon
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-5">
            <div className="bg-bg-card border border-line-1 rounded-xl p-6 shadow-sm">
              <SectionHeader
                icon={Shield}
                tint="text-success"
                badgeClass="bg-success-bg border-success-border"
                eyebrow="You"
                title="Security"
                description="How your account and connector tokens are protected."
              />
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-4 bg-bg-page border border-line-1 rounded-lg">
                  <span className="w-8 h-8 rounded-md bg-success-bg border border-success-border flex items-center justify-center text-success flex-shrink-0">
                    <Shield className="w-4 h-4" />
                  </span>
                  <div>
                    <div className="text-[13px] font-semibold text-text-1">Transport encryption</div>
                    <div className="text-[12px] text-text-2 mt-0.5">
                      All traffic between your browser, the OrbitX API, and source platforms runs over TLS.
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-bg-page border border-line-1 rounded-lg">
                  <span className="w-8 h-8 rounded-md bg-success-bg border border-success-border flex items-center justify-center text-success flex-shrink-0">
                    <KeyRound className="w-4 h-4" />
                  </span>
                  <div>
                    <div className="text-[13px] font-semibold text-text-1">OAuth token storage</div>
                    <div className="text-[12px] text-text-2 mt-0.5">
                      Connector tokens are encrypted at rest in the database and never exposed to the frontend.
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-bg-page border border-line-1 rounded-lg">
                  <span className="w-8 h-8 rounded-md bg-success-bg border border-success-border flex items-center justify-center text-success flex-shrink-0">
                    <UserIcon className="w-4 h-4" />
                  </span>
                  <div>
                    <div className="text-[13px] font-semibold text-text-1">Sign-in</div>
                    <div className="text-[12px] text-text-2 mt-0.5">
                      Google OAuth only. Password management is delegated to Google — we never see your password.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-bg-card border border-danger-border rounded-xl p-6 shadow-sm">
              <SectionHeader
                icon={LogOut}
                tint="text-danger"
                badgeClass="bg-danger-bg border-danger-border"
                eyebrow="Danger zone"
                title="Sign out"
                description="End this session on this device. You can sign back in with Google at any time."
              />
              <div className="flex items-center justify-between p-4 bg-bg-page border border-line-1 rounded-lg">
                <div>
                  <div className="text-[13px] font-semibold text-text-1">Sign out of OrbitX</div>
                  <div className="text-[12px] text-text-3">
                    You'll be returned to the login screen.
                  </div>
                </div>
                <Button variant="danger" size="sm" onClick={handleLogout} leftIcon={<LogOut className="w-3.5 h-3.5" />}>
                  Sign out
                </Button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const allSections = [...WORKSPACE_SECTIONS, ...YOU_SECTIONS];
  const activeMeta = allSections.find((s) => s.id === activeSection);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-1 bg-blue-primary rounded-full" />
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-text-3">
              Preferences
            </span>
          </div>
          <h1 className="text-[26px] font-semibold text-text-1 tracking-tight leading-tight">
            Settings
          </h1>
          <p className="text-[13px] text-text-2 mt-1.5">
            Workspace configuration, your profile, and security — plus a peek at what's coming.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 items-start">
          {/* Left nav */}
          <nav className="space-y-0.5 lg:sticky lg:top-[68px]" aria-label="Settings navigation">
            <div className="px-2 mb-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-text-3">
              Workspace
            </div>
            {WORKSPACE_SECTIONS.map((section) => {
              const Icon = section.icon;
              const active = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    'flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors text-left cursor-pointer',
                    active
                      ? 'bg-blue-soft text-blue-primary'
                      : 'text-text-2 hover:bg-bg-row-hv hover:text-text-1',
                  )}
                >
                  <Icon className={cn('w-4 h-4 flex-shrink-0', active ? 'text-blue-primary' : 'text-text-3')} />
                  <span className="truncate">{section.label}</span>
                </button>
              );
            })}

            <div className="px-2 mb-1 mt-5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-text-3">
              You
            </div>
            {YOU_SECTIONS.map((section) => {
              const Icon = section.icon;
              const active = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    'flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors text-left cursor-pointer',
                    active
                      ? 'bg-blue-soft text-blue-primary'
                      : 'text-text-2 hover:bg-bg-row-hv hover:text-text-1',
                  )}
                >
                  <Icon className={cn('w-4 h-4 flex-shrink-0', active ? 'text-blue-primary' : 'text-text-3')} />
                  <span className="truncate">{section.label}</span>
                </button>
              );
            })}

            {/* Shortcut card */}
            <div className="mt-5 p-3 bg-blue-soft border border-blue-border rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Link2 className="w-3.5 h-3.5 text-blue-primary" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-primary">
                  Quick link
                </span>
              </div>
              <p className="text-[12px] text-text-2 mb-2">
                Manage sources and destinations from the dedicated page.
              </p>
              <Link
                to="/connections"
                className="inline-flex items-center gap-1 text-[12px] font-medium text-blue-primary hover:text-blue-primary-hover"
              >
                Open connections
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </nav>

          {/* Content */}
          <div>
            {/* Breadcrumb chip */}
            {activeMeta && (
              <div className="flex items-center gap-2 mb-3 text-[11px] text-text-3">
                <span className="uppercase tracking-[0.12em] font-semibold">
                  {WORKSPACE_SECTIONS.some((s) => s.id === activeSection) ? 'Workspace' : 'You'}
                </span>
                <span className="text-text-4">/</span>
                <span className="font-medium text-text-2">{activeMeta.label}</span>
              </div>
            )}
            {renderContent()}
          </div>
        </div>
      </div>
    </Layout>
  );
}
