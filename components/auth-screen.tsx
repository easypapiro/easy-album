import { Branch, Rings } from "./ui/ornaments";
import { Screen } from "./ui/kit";

/** Shared frame for the account sign-up / sign-in screens. */
export function AuthScreen({
  title,
  italic,
  intro,
  children,
}: {
  title: string;
  italic: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <Screen className="safe-bottom gap-5 overflow-hidden px-6 pt-12">
      <Branch size={140} className="pointer-events-none absolute -top-1.5 -right-[18px]" />
      <div className="flex flex-col gap-2">
        <Rings width={40} />
        <h1 className="m-0 font-serif text-[40px] leading-[1.05] font-semibold">
          {title}
          <br />
          <span className="font-medium italic">{italic}</span>
        </h1>
        <p className="m-0 text-sm leading-normal text-muted">{intro}</p>
      </div>
      {children}
    </Screen>
  );
}
