import "./globals.css";
export const metadata = {
  title: "Afterbell — After-hours research",
  description: "Evidence-first US equity research. Humans decide.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
