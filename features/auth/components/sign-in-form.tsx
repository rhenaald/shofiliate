"use client";

import { useState } from "react";

import z from "zod";
import { Controller, useForm } from "react-hook-form";
import { EyeClosedIcon, EyeIcon, Loader2Icon } from "lucide-react";

import { cn } from "@/lib/utils";
import { signIn } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInSchema } from "@/features/auth/schemas";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";

export function SignInForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm({
    resolver: zodResolver(signInSchema),
    mode: "onChange",
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const { mutateAsync, isPending: isSubmitting } = useMutation({
    mutationKey: ["sign-in"],
    mutationFn: async (values: z.input<typeof signInSchema>) => {
      const parsed = signInSchema.parse(values);

      const { data, error } = await signIn.username({
        username: parsed.username,
        password: parsed.password,
      });

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
  });

  async function onSubmit() {
    const mutationPromise = mutateAsync(form.getValues());

    // TODO: Localization
    toast.promise(mutationPromise, {
      loading: "Sedang masuk...",
      success: () => {
        return "Login berhasil";
      },
      error: (error) => {
        if (error instanceof Error) {
          return error.message;
        } else {
          return "Unknown error";
        }
      },
    });

    try {
      await mutationPromise;
      router.push("/");
    } catch {
      // Toast sudah handle error untuk user
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className={cn("flex flex-col gap-6", className)}
      {...props}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Login to your account</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Enter your email below to login to your account
          </p>
        </div>

        <Controller
          name="username"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="username">Username</FieldLabel>
              <Input
                {...field}
                id="username"
                type="text"
                placeholder="Masukkan username"
                aria-invalid={fieldState.invalid}
                required
              />

              {fieldState.error && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="login-admin-password">Password</FieldLabel>

              {/* TODO: Localization */}
              <ButtonGroup>
                <Input
                  {...field}
                  id="login-admin-password"
                  placeholder="Masukkan password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  aria-invalid={fieldState.invalid}
                />
                <Button
                  size="icon"
                  type="button"
                  variant="outline"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <EyeIcon
                    size={16}
                    className={cn(showPassword ? "hidden" : "block")}
                  />
                  <EyeClosedIcon
                    size={16}
                    className={cn(showPassword ? "block" : "hidden")}
                  />
                </Button>
              </ButtonGroup>

              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Field>
          {/* TODO: Localization */}
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            {isSubmitting && <Loader2Icon className="h-4 w-4 animate-spin" />}
            {isSubmitting ? "Memproses..." : "Masuk"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
