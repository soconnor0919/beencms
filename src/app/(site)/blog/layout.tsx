import { getPageMetadata } from "~/lib/metadata";
export const generateMetadata = () => getPageMetadata("blog", "/blog", "Blog");
export default function BlogLayout({ children }: { children: React.ReactNode }) { return children; }
