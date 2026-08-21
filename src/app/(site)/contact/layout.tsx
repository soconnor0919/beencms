import { getPageMetadata } from "~/lib/metadata";
export const generateMetadata = () => getPageMetadata("contact", "/contact", "Contact");
export default function ContactLayout({ children }: { children: React.ReactNode }) { return children; }
