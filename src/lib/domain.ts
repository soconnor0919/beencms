import { resolveTxt } from "dns/promises";

export function domainVerificationName(hostname: string) {
  return `_hadlockcms.${hostname}`;
}

export function domainVerificationValue(token: string) {
  return `hadlockcms-verification=${token}`;
}

export async function verifyDomainOwnership(
  hostname: string,
  token: string,
  resolver: typeof resolveTxt = resolveTxt,
) {
  try {
    const records = await resolver(domainVerificationName(hostname));
    return records.some(
      (parts) => parts.join("").trim() === domainVerificationValue(token),
    );
  } catch {
    return false;
  }
}
