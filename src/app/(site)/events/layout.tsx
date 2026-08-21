import { getPageMetadata } from "~/lib/metadata";
export const generateMetadata = () => getPageMetadata("events", "/events", "Events");
export default function EventsLayout({ children }: { children: React.ReactNode }) { return children; }
