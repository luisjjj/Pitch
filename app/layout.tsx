import "../global.css";
import type { Metadata } from "next";
import { Poppins, Space_Grotesk, JetBrains_Mono } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-body",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-display",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pitch — Make your case",
  description: "A competitive social debate arena.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
