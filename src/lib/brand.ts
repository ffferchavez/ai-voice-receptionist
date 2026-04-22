export const BRAND = {
  shortName: "SignalDesk",
  productName: "Voice Ops",
  studioName: "SignalDesk Labs",
  metadataTitle: "AI Voice Receptionist · SignalDesk Voice Ops",
  metadataTitleSuffix: "SignalDesk Voice Ops",
  metadataDescription:
    "SignalDesk Voice Ops. Configure an AI receptionist, test conversation flows, and capture structured leads.",
  footerAttribution: "AI Voice Operations Demo",
} as const;

export function readPublicDemoLoginCredentials():
  | { email: string; password: string }
  | null {
  const email = process.env.NEXT_PUBLIC_DEMO_LOGIN_EMAIL?.trim() ?? "";
  const password = process.env.NEXT_PUBLIC_DEMO_LOGIN_PASSWORD?.trim() ?? "";
  if (!email || !password) return null;
  return { email, password };
}
