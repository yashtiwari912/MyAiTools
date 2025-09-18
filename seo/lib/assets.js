export const assets = {
  logo: '/assets/logo.svg',
  gradientBackground: '/assets/gradientBackground.png',
  user_group: '/assets/user_group.png',
  star_icon: '/assets/star_icon.svg',
  star_dull_icon: '/assets/star_dull_icon.svg',
  profile_img_1: '/assets/profile_img_1.png',
  arrow_icon: '/assets/arrow_icon.svg',
};

import { SquarePen, Hash, Image as ImageIcon, Eraser, Scissors, FileText, Youtube, QrCode, Users } from 'lucide-react';

export const AiToolsData = [
  {
    title: 'AI Article Writer',
    description: 'Generate high-quality, engaging articles on any topic with our AI writing technology.',
    Icon: SquarePen,
    bg: { from: '#3588F2', to: '#0BB0D7' },
    path: '/ai/write-article',
  },
  {
    title: 'Blog Title Generator',
    description: 'Find the perfect, catchy title for your blog posts with our AI-powered generator.',
    Icon: Hash,
    bg: { from: '#B153EA', to: '#E549A3' },
    path: '/ai/blog-titles',
  },
  {
    title: 'AI Image Generation',
    description: 'Create stunning visuals with our AI image generation tool, Experience the power of AI ',
    Icon: ImageIcon,
    bg: { from: '#20C363', to: '#11B97E' },
    path: '/ai/generate-images',
  },
  {
    title: 'Background Removal',
    description: 'Effortlessly remove backgrounds from your images with our AI-driven tool.',
    Icon: Eraser,
    bg: { from: '#F76C1C', to: '#F04A3C' },
    path: '/ai/remove-background',
  },
  {
    title: 'Object Removal',
    description: 'Remove unwanted objects from your images seamlessly with our AI object removal tool.',
    Icon: Scissors,
    bg: { from: '#5C6AF1', to: '#427DF5' },
    path: '/ai/remove-object',
  },
  {
    title: 'Resume Reviewer',
    description: 'Get your resume reviewed by AI to improve your chances of landing your dream job.',
    Icon: FileText,
    bg: { from: '#12B7AC', to: '#08B6CE' },
    path: '/ai/review-resume',
  },
  {
    title: 'Image to Text (OCR)',
    description: 'Extract text from images using fast, accurate OCR powered by Tesseract.',
    Icon: FileText,
    bg: { from: '#F6AB41', to: '#FF4938' },
    path: '/ai/extract-text',
  },
  {
    title: 'Image Compressor & Resizer',
    description: 'Compress and resize images without losing quality. Choose size, quality and format.',
    Icon: ImageIcon,
    bg: { from: '#7C3AED', to: '#4C1D95' },
    path: '/ai/image-compressor',
  },
  {
    title: 'PDF Summarizer',
    description: 'Upload a PDF to get a concise summary and chat with the document contents.',
    Icon: FileText,
    bg: { from: '#6366F1', to: '#A855F7' },
    path: '/ai/pdf-summarizer',
  },
  {
    title: 'YouTube Summarizer',
    description: 'Paste a YouTube link to generate summaries and ask questions about the video.',
    Icon: Youtube,
    bg: { from: '#EF4444', to: '#F59E0B' },
    path: '/ai/youtube-summarizer',
  },
  {
    title: 'QR Code Generator',
    description: 'Create customizable QR codes in PNG or SVG for links, text and more.',
    Icon: QrCode,
    bg: { from: '#0EA5E9', to: '#22D3EE' },
    path: '/ai/qr-generator',
  },
  {
    title: 'Community Showcase',
    description: 'Explore published creations from the community and show your appreciation.',
    Icon: Users,
    bg: { from: '#10B981', to: '#059669' },
    path: '/ai/community',
  },
];

export const dummyTestimonialData = [
  {
    image: '/assets/profile_img_1.png',
    name: 'John Doe',
    title: 'Marketing Director, TechCorp',
    content:
      'ContentAI has revolutionized our content workflow. The quality of the articles is outstanding, and it saves us hours of work every week.',
    rating: 4,
  },
  {
    image: '/assets/profile_img_1.png',
    name: 'Jane Smith',
    title: 'Content Creator, TechCorp',
    content:
      'ContentAI has made our content creation process effortless. The AI tools have helped us produce high-quality content faster than ever before.',
    rating: 5,
  },
  {
    image: '/assets/profile_img_1.png',
    name: 'David Lee',
    title: 'Content Writer, TechCorp',
    content:
      'ContentAI has transformed our content creation process. The AI tools have helped us produce high-quality content faster than ever before.',
    rating: 4,
  },
];
