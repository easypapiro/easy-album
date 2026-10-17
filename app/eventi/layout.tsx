import { AccountGate } from "@/components/account-gate";

// Access is decided in the browser by Firebase Auth, so these pages can't be
// shown instantly from a prefetch: opt them out of instant validation.
export const instant = false;

export default function AccountLayout({ children }: LayoutProps<"/eventi">) {
  return <AccountGate>{children}</AccountGate>;
}
