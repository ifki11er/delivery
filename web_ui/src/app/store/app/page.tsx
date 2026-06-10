import { redirect } from 'next/navigation';

export default function StoreAppRedirectPage() {
  redirect('/app#monitor');
}
