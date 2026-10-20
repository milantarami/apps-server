const EXPLANATIONS: Readonly<Record<string, string>> = {
  DeviceNotRegistered: "App uninstalled or token expired. The token was switched off automatically.",
  MessageTooBig: "Payload over Expo's size limit. Shorten the text or custom data.",
  MessageRateExceeded: "Too many messages to one device in a short time. Wait and retry.",
  MismatchSenderId: "FCM credentials don't match the app's google-services.json.",
  InvalidCredentials: "Push credentials missing or invalid. Upload the FCM v1 key with `eas credentials`.",
  RequestFailed: "The request to Expo failed before tickets were issued.",
};

export function explainExpoError(reason: string): string | null {
  return EXPLANATIONS[reason] ?? null;
}
