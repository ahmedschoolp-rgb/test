import { redirect } from 'next/navigation';

// This page is a server component — it just redirects
// The actual role-based split happens in the layout
export default function DashboardPage() {
  // Default redirect — layout will redirect again if role is student
  redirect('/dashboard/teacher');
}
