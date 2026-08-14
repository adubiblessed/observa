import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/feedback/Toast";

export function ProfileSettingsPage() {
  const toast = useToast();
  const [name, setName] = useState("Sarah Jenkins");
  const [role, setRole] = useState("SRE Lead");
  const [email, setEmail] = useState("sarah.j@observa.com");

  return (
    <div className="mx-auto max-w-[760px] flex h-full flex-col gap-gutter overflow-y-auto p-container-padding">
      <div>
        <h2 className="text-headline-lg text-on-surface">User Profile</h2>
        <p className="mt-1 text-body-md text-on-surface-variant">Manage your personal information, profile identity, and account status.</p>
      </div>

      {/* Identity */}
      <section className="rounded border border-outline-variant bg-surface p-4">
        <h3 className="mb-4 text-label-caps text-on-surface-variant">Identity</h3>
        <div className="flex items-start gap-4">
          <div className="relative">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-container text-headline-md font-bold text-on-primary-container">
              SJ
            </span>
            <button
              type="button"
              aria-label="Change profile picture"
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-outline-variant bg-surface-container-high text-on-surface-variant transition-colors hover:text-primary"
            >
              <Icon name="photo_camera" className="text-[16px]" />
            </button>
          </div>
          <div className="flex-1 space-y-2 font-code-sm text-on-surface-variant">
            <div className="flex items-center justify-between gap-2 rounded border border-outline-variant bg-surface-container-lowest px-3 py-2">
              <span>User ID</span>
              <span className="flex items-center gap-2 text-on-surface">
                usr_98a72b1x99z
                <button type="button" aria-label="Copy user ID" className="text-outline hover:text-primary">
                  <Icon name="content_copy" className="text-[16px]" />
                </button>
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 rounded border border-outline-variant bg-surface-container-lowest px-3 py-2">
              <span>Last Login</span>
              <span className="text-on-surface">2023-10-27 14:32:01 UTC</span>
            </div>
          </div>
        </div>
      </section>

      {/* Personal info */}
      <section className="rounded border border-outline-variant bg-surface p-4">
        <h3 className="mb-4 text-label-caps text-on-surface-variant">Personal Information</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-label-caps text-on-surface-variant">Full Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-label-caps text-on-surface-variant">Job Role</label>
              <Input value={role} onChange={(e) => setRole(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-label-caps text-on-surface-variant">Email Address</label>
            <div className="flex items-center gap-2">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1" />
              <Button variant="outline" size="md">
                Verify
              </Button>
            </div>
            <p className="mt-1.5 text-body-sm text-on-surface-variant">This email is used for critical alerts and billing notifications.</p>
          </div>
          <div className="flex justify-end gap-2 border-t border-outline-variant pt-4">
            <Button variant="outline">Cancel</Button>
            <Button variant="primaryContainer" onClick={() => toast.show("Profile saved.", "success")}>
              Save Changes
            </Button>
          </div>
        </div>
      </section>

      {/* Danger zone */}
      <section className="rounded border border-error/30 bg-error/5 p-4">
        <h3 className="text-label-caps text-error">Danger Zone</h3>
        <div className="mt-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-body-md text-on-surface">Permanently delete your account and all associated data.</p>
            <p className="mt-0.5 text-body-sm text-on-surface-variant">This action cannot be undone. You will immediately lose access to all clusters and dashboards.</p>
          </div>
          <Button variant="outline" size="md" leadingIcon="delete" className="shrink-0 border-error/40 text-error hover:bg-error-container hover:text-on-error-container">
            Delete Account
          </Button>
        </div>
      </section>
    </div>
  );
}