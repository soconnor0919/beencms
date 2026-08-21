import { getPageMetadata } from "~/lib/metadata";
export const generateMetadata = () => getPageMetadata("programs", "/programs", "Programs");
export default function ProgramsLayout({ children }: { children: React.ReactNode }) { return children; }
