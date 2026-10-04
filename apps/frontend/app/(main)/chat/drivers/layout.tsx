import { DriverChat } from "./DriverChat";

// The conversation list lives in this layout, so it stays loaded (and
// scrolled) while the operator switches between drivers below it.
export default function DriverChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DriverChat />
      {children}
    </>
  );
}
