import Layout from '@/components/Layout';

function SettingsPage() {
  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-1 bg-primary-400" />
          </div>
          <h1 className="text-2xl font-semibold text-text-primary">Settings</h1>
          <p className="text-sm mt-0.5 text-text-secondary">
            Manage your account settings and integrations
          </p>
        </div>

        <div className="py-12 text-center text-sm text-text-secondary">
          No settings available yet.
        </div>
      </div>
    </Layout>
  );
}

export default SettingsPage;
