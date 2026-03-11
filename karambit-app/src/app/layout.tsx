import type { Metadata } from "next";
import "./globals.css";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: "Karambit - sBTC Yield Aggregator",
  description: "First sBTC yield aggregator on Stacks Bitcoin L2",
  icons: { icon: "/favicon.ico", apple: "/logo-180.png" },
  other: { "talentapp:project_verification": "acd2e53421d994119f1af81fb5a91a943a79516d1df2b10af40f543afe383accfc60c4b88422acf419ebfb7bc1344ea90356d4e525f1f4bf7cee87eebdce63b0" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <script dangerouslySetInnerHTML={{__html: "window.addEventListener('unhandledrejection',(e)=>{if(e.reason?.message?.includes('is not valid JSON'))e.preventDefault();})"}} />
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
