import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Megaphone } from "lucide-react";
import { getCustomerAnnouncements } from "@/lib/announcement.functions";
export const customerAnnouncementsQuery=queryOptions({queryKey:["customer","announcements"],queryFn:()=>getCustomerAnnouncements()});
export function CustomerAnnouncements(){
 const {data=[]}=useSuspenseQuery(customerAnnouncementsQuery);
 if(!data.length)return null;
 return <section className="space-y-3"><div className="flex items-center gap-2"><Megaphone className="size-5 text-primary"/><h2 className="font-display text-lg font-semibold">Announcements</h2></div>{data.map(a=><article key={a.id} className="rounded-2xl border border-primary/20 bg-card p-4 shadow-soft"><strong className="block">{a.title}</strong><p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{a.message}</p></article>)}</section>;
}
