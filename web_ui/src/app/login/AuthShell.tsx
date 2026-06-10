import Image from 'next/image';

type AuthShellProps = {
  children: React.ReactNode;
  subtitle: string;
};

export default function AuthShell({ children, subtitle }: AuthShellProps) {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#061c4a] px-6 py-5 text-white sm:py-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(30,92,170,0.45),transparent_34%),linear-gradient(160deg,#071a46_0%,#05225a_52%,#03143b_100%)]" />
      <div className="absolute -right-24 -top-28 h-[430px] w-44 rotate-[-38deg] rounded-[42px] bg-[#35d0bf] opacity-80 shadow-[0_0_32px_rgba(53,208,191,0.35)] sm:h-[520px] sm:w-56" />
      <div className="absolute -right-28 top-12 h-[430px] w-44 rotate-[-38deg] rounded-[42px] bg-[#20b9ac] opacity-90 sm:h-[520px] sm:w-56" />
      <div className="absolute left-0 top-[34%] h-44 w-72 -skew-x-[18deg] bg-[#092150]/45" />
      <div className="absolute bottom-0 left-0 h-80 w-full bg-[linear-gradient(180deg,transparent,rgba(0,15,46,0.78))]" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-40px)] w-full max-w-md flex-col justify-center sm:min-h-[calc(100dvh-64px)]">
        <div className="mb-7 text-center sm:mb-10">
          <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center overflow-hidden rounded-[22px] border border-white/20 bg-white/5 shadow-[0_10px_40px_rgba(0,0,0,0.25)] sm:h-24 sm:w-24 sm:rounded-[26px]">
            <Image
              src="/app_icon.png"
              alt="WorkLink"
              width={96}
              height={96}
              priority
              className="h-full w-full object-cover"
            />
          </div>
          <h1 className="text-3xl font-black tracking-wide sm:text-4xl">
            <span className="text-white">WORK</span><span className="text-[#37d0bf]">LINK</span>
          </h1>
          <p className="mt-2 text-xs font-bold text-white/55 sm:text-sm">{subtitle}</p>
        </div>

        {children}
      </div>
    </main>
  );
}
