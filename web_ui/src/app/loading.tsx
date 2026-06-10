import Image from 'next/image';

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white">
      <Image
        src="/app_icon.png"
        alt="WorkLink"
        width={96}
        height={96}
        priority
        className="h-24 w-24"
      />
      <p className="mt-4 text-lg font-black text-gray-900">워크링크</p>
    </div>
  );
}
