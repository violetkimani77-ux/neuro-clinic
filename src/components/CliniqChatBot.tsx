import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";

interface Message { role: "bot" | "user"; text: string; }
interface Answer { keywords: string[]; response: string; }

const KNOWLEDGE: Answer[] = [
  { keywords: ["hello", "hi", "greeting", "good morning", "good afternoon", "good evening"], response: "Hello! 👋 I'm Dr. Nyaoncha's AI assistant. Ask me about our neurosurgical services, Dr. Nyaoncha's background, location, or how to book a consultation." },
  { keywords: ["service", "brain tumour", "tumour", "tumor"], response: "Our services include **Brain Tumour Surgery** using modern microsurgical techniques, **Aneurysm Surgery**, **Spinal Surgery**, **Paediatric Neurosurgery**, **Neurosurgical Assessment**, and **General Surgery**." },
  { keywords: ["aneurysm"], response: "Dr. Nyaoncha performs precision surgery for cerebral aneurysms — described by patients as the best in Kenya." },
  { keywords: ["spine", "spinal", "cervical"], response: "Spinal care includes spinal fusions, decompressions, and treatment for cervical spine conditions and infections." },
  { keywords: ["child", "paediatric", "pediatric", "congenital"], response: "Paediatric Neurosurgery focuses on correcting congenital abnormalities in children with compassionate, family-centered care." },
  { keywords: ["assessment", "diagnosis", "evaluate"], response: "Neurosurgical Assessment provides comprehensive evaluation and diagnosis for brain, spine, and nervous system conditions." },
  { keywords: ["general surgery"], response: "Dr. Nyaoncha's broad surgical expertise is grounded in general surgery training at Aga Khan University." },
  { keywords: ["about", "background", "qualification", "bio", "yale", "career", "experience"], response: "Dr. Andrew Nyaoncha is a Consultant Neurosurgeon with 15+ years of specialist expertise. He holds an MBChB from the University of Nairobi (2008), M.Med General Surgery from Aga Khan University (2015), trained at the Royal College of Surgeons, UK (2016), and holds FCS-ECSA Neurosurgery from COSECSA (2018). He was named Business Daily Top 40 Under 40 in 2019 and has completed 300+ complex procedures since 2018." },
  { keywords: ["whatsapp", "whats app", "chat with"], response: "You can message Dr. Nyaoncha's team on **WhatsApp at 0721 358137** — tap the green WhatsApp button at the bottom of the page." },
  { keywords: ["contact", "phone", "call", "number", "book", "booking", "appointment", "schedule"], response: "You can **book online at /book** — choose your reason for visit, a date and a time — or call **0721 358137** to book a consultation with Dr. Nyaoncha." },
  { keywords: ["where", "location", "address", "nyeri", "nyahururu", "murang", "samburu"], response: "We're at **Doctors Plaza, Nyeri, Kenya**, serving Nyeri, Nyahururu, Murang'a, and beyond." },
  { keywords: ["hour", "open", "close", "saturday", "sunday", "monday", "friday"], response: "Hours are **Monday–Friday: 8:00 AM–5:00 PM**, **Saturday: 8:00 AM–1:00 PM**, and **Sunday: Closed**." },
  { keywords: ["symptom", "pain", "headache", "sick", "diagnose", "treatment", "medicine"], response: "I can't diagnose symptoms or provide medical advice. Please book a consultation by calling **0721 358137** so our team can help." },
  { keywords: ["thank", "thanks", "great", "good", "helpful"], response: "You're welcome! Please call **0721 358137** if you'd like to book a consultation." },
];

const QUICK_LINKS = [
  { label: "↓ Services", href: "/#section-services" },
  { label: "↓ About", href: "/#section-about" },
  { label: "↓ Contact", href: "/#section-contact" },
];

function findAnswer(input: string): string | null {
  const lower = input.toLowerCase();
  for (const entry of KNOWLEDGE) for (const keyword of entry.keywords) if (lower.includes(keyword)) return entry.response;
  return null;
}

export default function CliniqChatBot() {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [dotOnline, setDotOnline] = useState(false);
  const dotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [messages, setMessages] = useState<Message[]>([{ role: "bot", text: "Hello! 👋 I'm Dr. Nyaoncha's AI assistant. Ask me about our neurosurgical services, Dr. Nyaoncha's background, location, or how to book a consultation." }]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { const timer = setTimeout(() => setMounted(true), 500); return () => clearTimeout(timer); }, []);
  const scrollToBottom = useCallback(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, []);
  useEffect(() => { if (isOpen) scrollToBottom(); }, [messages, isOpen, scrollToBottom]);
  const addMessage = useCallback((message: Message) => setMessages((previous) => [...previous, message]), []);
  const botSay = useCallback((text: string, delay = 400) => { setTimeout(() => addMessage({ role: "bot", text }), delay); }, [addMessage]);
  useEffect(() => { if (isOpen) setTimeout(() => inputRef.current?.focus(), 150); }, [isOpen]);
  useEffect(() => {
      if (isOpen) {
          dotTimerRef.current = setTimeout(() => setDotOnline(true), 1000);
      } else {
          setDotOnline(false);
          if (dotTimerRef.current) clearTimeout(dotTimerRef.current);
      }
      return () => { if (dotTimerRef.current) clearTimeout(dotTimerRef.current); };
  }, [isOpen]);
  const handleSend = useCallback(() => { const text = input.trim(); if (!text) return; addMessage({ role: "user", text }); setInput(""); botSay(findAnswer(text) ?? "Please call 0721 358137 to speak with our team."); }, [input, addMessage, botSay]);
  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); handleSend(); } if (event.key === "Escape") setIsOpen(false); }, [handleSend]);
  if (!mounted) return null;
  return <>
    <button className="chatbot-bubble" onClick={() => setIsOpen((open) => !open)} aria-label={isOpen ? "Close chat" : "Open chat"}>
      {isOpen ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg> : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><line x1="8" y1="9" x2="16" y2="9" /><line x1="8" y1="13" x2="14" y2="13" /></svg>}
    </button>
    <div className={`chatbot-panel${isOpen ? " chatbot-panel--open" : ""}`} aria-hidden={!isOpen}>
      <div className="chatbot-header"><div className="chatbot-header__info"><span className={`chatbot-header__dot${dotOnline ? " chatbot-header__dot--online" : ""}`} /><span className="chatbot-header__title">Nyaoncha Assistant</span></div></div>
      <div className="chatbot-messages">
        {messages.map((message, index) => <div key={index} className={`chatbot-msg chatbot-msg--${message.role}`}><div className="chatbot-msg__text" dangerouslySetInnerHTML={{ __html: message.text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br/>") }} /></div>)}
        {messages.length === 1 && <div className="chatbot-quicklinks" role="group" aria-label="Quick links">{QUICK_LINKS.map((link) => <a key={link.label} className="chatbot-quicklink" href={link.href}>{link.label}</a>)}</div>}
        <div ref={messagesEndRef} />
      </div>
      <div className="chatbot-input-row"><input ref={inputRef} type="text" className="chatbot-input" placeholder="Ask me anything…" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={handleKeyDown} /><button className="chatbot-send" onClick={handleSend} disabled={!input.trim()} aria-label="Send message"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg></button></div>
      <p className="chatbot-footer">Dr. Andrew Nyaoncha. Demo assistant.</p>
    </div>
  </>;
}
