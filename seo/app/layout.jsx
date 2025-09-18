import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "react-hot-toast";

export const metadata = {
  title: "ContentAI - AI Tools",
  description: "AI-powered content creation and image tools",
};

export default function RootLayout({ children }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  return (
    <ClerkProvider publishableKey={publishableKey}>
      <html lang="en">
        <body>
          <Toaster />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
