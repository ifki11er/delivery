import { cookies } from 'next/headers';
import { getDictionary } from './dictionaries';

export async function getI18n() {
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || 'ko';
  return getDictionary(locale);
}
