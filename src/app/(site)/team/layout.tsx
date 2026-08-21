import { getPageMetadata } from "~/lib/metadata";
export const generateMetadata = () => getPageMetadata("team", "/team", "Team");
export default function TeamLayout({ children }: { children: React.ReactNode }) { return children; }
