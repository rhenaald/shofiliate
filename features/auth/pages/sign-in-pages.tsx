import { SignInForm } from "@/features/auth/components/sign-in-form";

function SignInPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-6 md:p-10 bg-background">
      <div className="w-full max-w-sm">
        <SignInForm />
      </div>
    </div>
  );
}

export default SignInPage;
