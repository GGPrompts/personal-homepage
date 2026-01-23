import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { BackgroundProvider } from "@/components/BackgroundProvider";
import { PageBackgroundProvider } from "@/hooks/usePageBackground";
import { MasterBackground } from "@/components/MasterBackground";
import { QueryProvider } from "@/components/QueryProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { LocalhostRedirect } from "@/components/LocalhostRedirect";
import { MusicPlayerProvider } from "@/components/MusicPlayerProvider"
import { AudioVisualizerProvider } from "@/components/AudioVisualizerProvider";
import { WorkingDirProvider } from "@/components/WorkingDirProvider";
import { PersistentMusicDrawer } from "@/components/PersistentMusicDrawer";
import { AIDrawerProvider } from "@/contexts/AIDrawerContext";
import { AIDrawer } from "@/components/ai/AIDrawer";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: '--font-jetbrains-mono',
});

export const metadata: Metadata = {
  title: "Personal Homepage",
  description: "My personal dashboard with weather, curated feeds, and more",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans`}>
        <LocalhostRedirect />
        <QueryProvider>
          <AuthProvider>
            <BackgroundProvider>
              <PageBackgroundProvider>
                <ThemeProvider>
                  <WorkingDirProvider>
                    <MusicPlayerProvider>
                      <AudioVisualizerProvider>
                        <AIDrawerProvider>
                          <MasterBackground />
                          {children}
                          <AIDrawer />
                          <PersistentMusicDrawer />
                          <Toaster
                            theme="dark"
                            position="bottom-right"
                            toastOptions={{
                              style: {
                                background: 'hsl(var(--popover))',
                                border: '1px solid hsl(var(--border))',
                                color: 'hsl(var(--popover-foreground))',
                              },
                            }}
                          />
                        </AIDrawerProvider>
                      </AudioVisualizerProvider>
                    </MusicPlayerProvider>
                  </WorkingDirProvider>
                </ThemeProvider>
              </PageBackgroundProvider>
            </BackgroundProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
