import { SignIn } from "@clerk/nextjs";

export const metadata = {
  title: "Sign In — MyAiTools",
  description: "Sign in to access AI tools.",
};

export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <SignIn />
    </div>
  );
}
