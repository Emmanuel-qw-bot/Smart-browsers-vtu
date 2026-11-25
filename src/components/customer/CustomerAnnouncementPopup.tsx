import { useEffect, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Megaphone } from "lucide-react";
import { customerAnnouncementsQuery } from "@/components/customer/CustomerAnnouncements";
export function CustomerAnnouncementPopup(){
 const {data=[]}=useSuspenseQuery(customerAnnouncementsQuery);
 const [acknowledged,setAcknowledged]=useState<string[]>(()=>{try{return typeof window==="undefined"?[]:JSON.parse(window.localStorage.getItem("smartbrowsers-announcements-read")||"[]");}catch{return [];}});
 const current=data.find(a=>!acknowledged.includes(a.id));
 const [visible,setVisible]=useState(false);
 useEffect(()=>{setVisible(false);if(!current)return;const timer=window.setTimeout(()=>setVisible(true),900);return()=>window.clearTimeout(timer);},[current?.id]);
 if(!current||!visible)return null;
 const dismiss=()=>{const updated=[...acknowledged,current.id];setAcknowledged(updated);try{window.localStorage.setItem("smartbrowsers-announcements-read",JSON.stringify(updated));}catch{}};
 return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="announcement-title"><div className="w-full max-w-md animate-rise rounded-2xl border bg-card p-5 shadow-2xl"><div className="mb-3 flex items-center gap-2 text-primary"><span className="grid size-9 place-items-center rounded-xl bg-primary/10"><Megaphone className="size-5"/></span><span className="text-sm font-semibold">Announcement</span></div><h2 id="announcement-title" className="text-lg font-bold">{current.title}</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{current.message}</p><button type="button" onClick={dismiss} className="mt-5 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">OK, I've read this</button></div></div>;
}
