'use client';

import { usePathname } from 'next/navigation';

interface NavLink {
  href: string;
  label: string;
}

export default function NavLinks({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  // Strip locale prefix: /en/study → /study, /en → /
  const path = pathname.replace(/^\/[a-z]{2,3}(-[A-Z]{2})?/, '') || '/';

  return (
    <div className="flex items-center gap-0.5">
      {links.map(({ href, label }) => {
        const isActive =
          href === '/'
            ? path === '/' || path === ''
            : path === href || path.startsWith(href + '/');
        return (
          <a
            key={href}
            href={href}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
              isActive
                ? 'bg-blue-50 text-blue-700'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            {label}
          </a>
        );
      })}
    </div>
  );
}
