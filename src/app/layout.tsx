import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NaTahu",
  description: "Rodinny organizer povinnosti, kalendare a nakupniho seznamu.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs">
      <body>{children}</body>
    </html>
  );
}
