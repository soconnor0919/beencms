import ContactForm from "~/components/ContactForm";

export default function ContactPage() {
  return <><section className="bg-secondary/50 px-6 py-20 text-center"><div className="mx-auto max-w-2xl"><h1 className="font-serif text-5xl font-bold">Contact Us</h1><p className="mt-6 text-lg leading-relaxed text-muted-foreground">Whether you’re interested in partnering, donating, volunteering, or seeking employment, we’d love to hear from you.</p></div></section><section className="px-6 py-20"><div className="mx-auto max-w-2xl"><ContactForm /></div></section></>;
}
