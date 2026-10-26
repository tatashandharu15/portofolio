// Semua teks & data situs ada di sini. Sumber: CV Tatas Handharu Sworo & github.com/tatashandharu15.

export type Project = {
  slug: string;
  title: string;
  category: string;
  year: string;
  context: string;
  summary: string;
  cover: string;
  detail?: string;
  link?: { label: string; href: string };
  body: { heading: string; paragraphs: string[] }[];
};

const GITHUB = "https://github.com/tatashandharu15";
const LINKEDIN = "https://www.linkedin.com/in/tatas-handharu";
const EMAIL = "tatas.handharu@gmail.com";

export const site = {
  name: "Tatas Handharu",
  title: "Tatas Handharu — AI Systems Engineer",
  description:
    "Portfolio of Tatas Handharu Sworo, Tech Lead AI Systems based in Jakarta, building AI platforms for cyber threat intelligence, social media monitoring and blockchain analytics.",
  clock: { prefix: "TATASHANDHARU_JKT", timeZone: "Asia/Jakarta", hour12: true },
  email: EMAIL,
  cvUrl: LINKEDIN,
  hero: {
    name: "Tatas\nHandharu",
    roleLines: ["Tech Lead AI Systems", "Based in Jakarta"],
    portfolioLabel: "Portfolio_20/26",
    scrollHint: "[Scroll to explore]",
  },
  heroSocials: [
    { label: "GitHub", href: GITHUB },
    { label: "LinkedIn", href: LINKEDIN },
    { label: "Email", href: `mailto:${EMAIL}` },
  ],
  work: {
    label: "(Selected work)",
    range: "AI Systems_2024—2026",
    dragHint: "[Drag to explore]",
  },
  about: {
    label: "(About)",
    statement:
      "I build AI systems that turn messy, fast-moving data into intelligence people can act on. My work sits where machine learning, cybersecurity and backend engineering meet — platforms that read the web, flag what matters and keep running in production.",
    practice:
      "My practice spans LLM and RAG applications, AI agents, data pipelines and FastAPI backends. I take models from research to containerised production, with monitoring and observability built in.",
    cvLabel: "Full profile on LinkedIn",
    offDuty:
      "Before industry I was an assistant lecturer at University of Technology Yogyakarta, running Big Data and Machine Learning sessions. In my spare time I explore Web3 and blockchain tooling.",
    stats: [
      { label: "Years in data & AI", value: 3, prefix: "", suffix: "+", delay: 0 },
      { label: "Greenwich Mean Time", value: 7, prefix: "+", suffix: "", delay: 0.15 },
      { label: "Certifications", value: 9, prefix: "", suffix: "", delay: 0.3 },
    ],
  },
  footer: {
    media: { type: "video" as "image" | "video", src: "/media/contact.mp4" },
    cta: "Get in touch",
    linksA: [
      { label: "GitHub", href: GITHUB },
      { label: "LinkedIn", href: LINKEDIN },
    ],
    linksB: [
      { label: "Email", href: `mailto:${EMAIL}` },
      { label: "Contact form", href: "/contact" },
    ],
    creditName: "Tatas Handharu",
    builtWith: "Next.js + WebGL",
    copyright: "©2026_All rights reserved",
  },
  menu: {
    brand: "Tatas Handharu",
    items: [
      { label: "Index", href: "/#index" },
      { label: "Work", href: "/#work" },
      { label: "About", href: "/#about" },
      { label: "Skills", href: "/#skills" },
      { label: "Contact", href: "/contact" },
      { label: "404", href: "/404" },
    ],
    socials: [
      { label: "GitHub", href: GITHUB },
      { label: "LinkedIn", href: LINKEDIN },
    ],
  },
  notFound: {
    label: "(Error 404)",
    title: "Signal lost",
    text: "This page has moved, or it never existed. Let’s get you back on track.",
    back: "Back to index",
  },
};

export const projects: Project[] = [
  {
    slug: "cyber-web-intelligence",
    title: "Cyber Web Intel",
    category: "Threat Intelligence",
    year: "2025—26",
    context: "Siberindo",
    summary:
      "An AI-powered platform that monitors the dark web and the surface web for cyber threats, with automated analysis, dashboards and alerting for monitoring teams.",
    cover: "/media/cyber-web-intelligence.png",
    body: [
      {
        heading: "What I built",
        paragraphs: [
          "I developed the platform’s AI-powered threat monitoring and integrated web intelligence collection with automated analysis across dark-web and surface-web sources.",
        ],
      },
      {
        heading: "Operations",
        paragraphs: ["I designed the dashboards and alerting workflows that cyber monitoring operations run on."],
      },
    ],
  },
  {
    slug: "social-media-monitoring",
    title: "Social Monitor",
    category: "Social Intelligence",
    year: "2025—26",
    context: "Siberindo · APAC",
    summary:
      "A large-scale platform that collects, processes and analyses digital conversations across multiple social platforms for intelligence reporting in the APAC region.",
    cover: "/media/social-media-monitoring.png",
    body: [
      {
        heading: "Signals from noise",
        paragraphs: [
          "Sentiment analysis, trend detection, topic clustering and entity extraction run on incoming conversations using AI and NLP techniques.",
        ],
      },
      {
        heading: "Pipelines and reporting",
        paragraphs: [
          "I built scalable ingestion pipelines for structured and unstructured social media data, plus automated monitoring workflows and real-time dashboards for intelligence reporting.",
        ],
      },
    ],
  },
  {
    slug: "ai-ticketing",
    title: "AI Ticketing",
    category: "Enterprise Platform",
    year: "2025—26",
    context: "Siberindo",
    summary:
      "An enterprise-grade ticket management platform with intelligent ticket classification and workflow automation.",
    cover: "/media/ai-ticketing.png",
    body: [
      {
        heading: "Classification and automation",
        paragraphs: ["I designed and developed the platform, including intelligent ticket classification and workflow automation features."],
      },
      {
        heading: "Security and operations",
        paragraphs: [
          "Secure backend APIs with role-based access control, reporting and operational monitoring dashboards, and a containerised deployment architecture using Docker.",
        ],
      },
    ],
  },
  {
    slug: "wallet-intelligence",
    title: "Wallet Intel",
    category: "Blockchain Analytics",
    year: "2025—26",
    context: "Siberindo",
    summary:
      "Blockchain intelligence work covering cryptocurrency wallet analysis, transaction tracing and risk assessment.",
    cover: "/media/wallet-intelligence.png",
    body: [
      {
        heading: "Following the money",
        paragraphs: ["I conducted cryptocurrency wallet analysis and transaction tracing."],
      },
      {
        heading: "Tooling",
        paragraphs: ["I built tools for blockchain monitoring and risk assessment."],
      },
    ],
  },
  {
    slug: "lead-management",
    title: "Lead Engine",
    category: "AI Product",
    year: "2026",
    context: "Personal project",
    summary:
      "An AI-assisted mini lead management system, built twice — Python with FastAPI and Node.js with TypeScript and Fastify — with verified feature parity.",
    cover: "/media/lead-management.png",
    link: { label: "View on GitHub", href: `${GITHUB}/ai-assisted-lead-management` },
    body: [
      {
        heading: "Two stacks, one contract",
        paragraphs: [
          "Both implementations share one feature set and are checked against 61 automated compliance checks, with 72 of 72 tests passing.",
        ],
      },
      {
        heading: "AI and data quality",
        paragraphs: [
          "GPT-4o-mini assists the lead workflow, a two-stage blocking step removes duplicate leads, and lead sources are extracted with a three-tier fallback.",
        ],
      },
    ],
  },
  {
    slug: "idx-lstm",
    title: "IDX Forecast",
    category: "Research",
    year: "2024",
    context: "Published in JCSTS",
    summary:
      "Research on analysing and predicting Indonesia Stock Exchange share prices with Long Short-Term Memory networks, published in the Journal of Computer Science and Technology Studies.",
    cover: "/media/idx-lstm.png",
    link: { label: "View on GitHub", href: `${GITHUB}/Analysis_and_Prediction_of_Indonesia_Stock_Exchange-IDX-_Stock_Prices` },
    body: [
      {
        heading: "The study",
        paragraphs: [
          "Starting from my capstone on BBRI share prices, I compared machine learning models on IDX stocks, then implemented and validated an LSTM model for price analysis and prediction.",
        ],
      },
      {
        heading: "Where it went",
        paragraphs: [
          "The work became my final project and a paper in Al-Kindi’s JCSTS in June 2024. A year earlier, at SENOVTIK 2023, I presented a comparison of KNN, linear regression and SVM for price prediction.",
        ],
      },
    ],
  },
];
