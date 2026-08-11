const fs = require('fs');
let code = fs.readFileSync('frontend/app/(dashboard)/layout.tsx', 'utf8');

const securityCheck = `  // Security Check for Super Admin routes
  const pathname = (typeof window !== 'undefined' ? window.location.pathname : '') || '';
  const superAdminRoutes = [
    '/admin-allocation', '/bot-settings', '/bot-designer', 
    '/student-roster', '/content-approvals', '/academic-structure',
    '/documents', '/push-messages', '/support', '/logs'
  ];
  const isSuperAdminRoute = superAdminRoutes.some(route => typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_APP_URL ? false : false); // This is tricky in a layout component without usePathname.
`;

// Actually, layout.tsx is a Server Component! We can't use usePathname.
