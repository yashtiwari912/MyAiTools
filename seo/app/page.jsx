import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import AiTools from "@/components/AiTools";
import Testimonial from "@/components/Testimonial";
import Plan from "@/components/Plan";
import Footer from "@/components/Footer";

export const metadata = {
  title: "MyAiTools — AI content and image tools",
  description:
    "Transform your content creation with premium AI tools. Write articles, generate images, and enhance your workflow.",
};

export default function Page() {
  return (
    <>
      <Navbar />
      <Hero />
      <AiTools />
      <Testimonial />
      <Plan />
      <Footer />
    </>
  );
}
