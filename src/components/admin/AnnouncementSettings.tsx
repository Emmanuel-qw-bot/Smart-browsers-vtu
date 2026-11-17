import { useState } from "react";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Megaphone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAnnouncements, saveAnnouncement, deleteAnnouncement } from "@/lib/announcement.functions";
export const announcementsQuery=queryOptions({queryKey:["admin","announcements"],queryFn:()=>getAnnouncements()});
export function AnnouncementSettings(){
 const {data=[]}=useQuery(announcementsQuery); const client=useQueryClient();
 const save=useServerFn(saveAnnouncement); const remove=useServerFn(deleteAnnouncement);
 const [title,setTitle]=useState(""); const [message,setMessage]=useState(""); const [published,setPublished]=useState(true); const [busy,setBusy]=useState(false);
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);try{await save({data:{title,message,published,starts_at:null,ends_at:null}});setTitle("");setMessage("");await client.invalidateQueries({queryKey:announcementsQuery.queryKey});toast.success("Announcement saved.");}catch(e){toast.error(e instanceof Error?e.message:"Could not save.");}finally{setBusy(false);}}
 async function del(id:string){try{await remove({data:{id}});await client.invalidateQueries({queryKey:announcementsQuery.queryKey});toast.success("Announcement deleted.");}catch(e){toast.error(e instanceof Error?e.message:"Could not delete.");}}
 return <div className="space-y-5"><form onSubmit={submit} className="space-y-3 rounded-2xl border bg-card p-4"><div className="flex items-center gap-2"><Megaphone className="size-5 text-primary"/><h2 className="font-display text-lg font-semibold">Create announcement</h2></div><label className="block space-y-1 text-sm font-medium">Title<Input value={title} maxLength={120} onChange={e=>setTitle(e.target.value)} required minLength={3}/></label><label className="block space-y-1 text-sm font-medium">Message<textarea className="min-h-28 w-full rounded-xl border bg-background p-3 text-sm" value={message} maxLength={1200} onChange={e=>setMessage(e.target.value)} required minLength={3}/></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={published} onChange={e=>setPublished(e.target.checked)}/> Publish immediately</label><Button disabled={busy}>{busy?"Saving...":"Save announcement"}</Button></form><section className="space-y-3"><h2 className="font-display text-lg font-semibold">Recent announcements</h2>{data.length===0?<p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">No announcements yet.</p>:data.map(a=><article key={a.id} className="rounded-2xl border bg-card p-4"><div className="flex items-start justify-between gap-3"><div><strong>{a.title}</strong><p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{a.message}</p><p className="mt-2 text-xs text-muted-foreground">{a.published?"Published":"Draft"}</p></div><Button size="icon" variant="ghost" aria-label="Delete announcement" onClick={()=>del(a.id)}><Trash2 className="size-4"/></Button></div></article>)}</section></div>;
}
