import type { Metadata } from "next";
import { Bungee, Baloo_2 } from "next/font/google";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import "./globals.css";

const bungee = Bungee({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin", "vietnamese"],
});

const baloo2 = Baloo_2({
  variable: "--font-body",
  weight: ["500", "600", "700", "800"],
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  title: "Ai Là Triệu Phú — Cartoon Edition",
  description: "Trò chơi hỏi đáp Ai Là Triệu Phú phiên bản Cartoon",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${bungee.variable} ${baloo2.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AntdRegistry>{children}</AntdRegistry>
      </body>
    </html>
  );
}
