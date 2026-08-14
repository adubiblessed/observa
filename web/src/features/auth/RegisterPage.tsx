import { Link, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function RegisterPage() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded bg-primary-container text-[16px] font-bold text-on-primary-container">
            O
          </span>
          <span className="text-headline-md font-semibold tracking-tight text-on-surface">Observa</span>
        </div>

        <h1 className="text-center text-headline-lg text-on-surface">Create your account</h1>
        <p className="mt-1 text-center text-body-md text-on-surface-variant">Start monitoring your systems in minutes.</p>

        <div className="mt-8 flex flex-col gap-2">
          <Button variant="outline" className="w-full" leadingIcon="hub" onClick={() => navigate("/app/dashboards")}>
            Continue with GitHub
          </Button>
          <Button variant="outline" className="w-full" leadingIcon="public" onClick={() => navigate("/app/dashboards")}>
            Continue with Google
          </Button>
        </div>

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-outline-variant" />
          <span className="text-label-caps text-outline">Or</span>
          <span className="h-px flex-1 bg-outline-variant" />
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            navigate("/app/dashboards");
          }}
        >
          <div>
            <label className="mb-1.5 block text-label-caps text-on-surface-variant">Full Name</label>
            <Input placeholder="Ada Lovelace" autoComplete="name" />
          </div>
          <div>
            <label className="mb-1.5 block text-label-caps text-on-surface-variant">Work Email</label>
            <Input type="email" placeholder="ada@company.com" autoComplete="email" />
          </div>
          <div>
            <label className="mb-1.5 block text-label-caps text-on-surface-variant">Password</label>
            <Input type="password" placeholder="••••••••" autoComplete="new-password" />
          </div>
          <Button variant="primary" className="w-full" type="submit">
            Create account
          </Button>
        </form>

        <p className="mt-4 text-center text-body-sm text-on-surface-variant">
          By clicking "Create account", you agree to our{" "}
          <a href="#" className="text-primary hover:underline">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="#" className="text-primary hover:underline">
            Privacy Policy
          </a>
          .
        </p>

        <p className="mt-4 text-center text-body-sm text-on-surface-variant">
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}