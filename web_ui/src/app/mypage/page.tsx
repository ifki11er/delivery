import MypageClient from './MypageClient';
import { SessionProvider } from 'next-auth/react';
import { auth } from '../../../auth';

export default async function Mypage() {
  const session = await auth();

  return (
    <SessionProvider session={session}>
      <MypageClient />
    </SessionProvider>
  );
}
