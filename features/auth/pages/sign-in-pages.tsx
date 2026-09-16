import Image from "next/image";
import { SignInForm } from "@/features/auth/components/sign-in-form";

function SignInPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <SignInForm />
          </div>
        </div>
      </div>
      <div className="relative hidden h-full items-center justify-center bg-muted lg:flex">
        <div className="relative h-[70%] w-[70%]">
          <Image
            src="/images/sign-in-character.png"
            alt="Sign in illustration"
            fill
            sizes="40vw"
            className="object-contain object-center"
            priority
          />
        </div>
      </div>
    </div>
  );
}

export default SignInPage;
