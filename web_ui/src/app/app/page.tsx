import { redirect } from 'next/navigation';
import { auth } from '../../../auth';
import AppShellClient from './AppShellClient';
import packageJson from '../../../package.json';

export default async function AppShellPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  return <AppShellClient appVersion={packageJson.version} />;
}
