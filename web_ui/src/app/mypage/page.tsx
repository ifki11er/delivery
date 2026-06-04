import MypageClient from './MypageClient';

import { auth } from '../../../auth';

export default async function Mypage() {
  const session = await auth();

  return (
    <MypageClient />
  );
}
