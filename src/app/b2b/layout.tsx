'use client';

// B2B Layout - Sadece children'ı döndürür
// Her sayfa kendi layout/wrapper'ını kullanır
export default function B2BLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
