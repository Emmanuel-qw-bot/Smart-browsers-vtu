import { useState } from "react";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, RefreshCw, Pencil, Trash2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatNaira, nairaToKobo } from "@/lib/wallet";
import { addProvider, archiveProduct, getProviderControl, saveProduct, testProviderConnection } from "@/lib/vtu.functions";
import type { Tables } from "@/integrations/supabase/types";

export const providerControlQuery = queryOptions({ queryKey: ["admin", "vtu-control"], queryFn: () => getProviderControl() });

export function ProviderControl() {
  const { data } = useSuspenseQuery(providerControlQuery);
  const qc = useQueryClient();
  const add = useServerFn(addProvider);
  const save = useServerFn(saveProduct);
  const remove = useServerFn(archiveProduct);
  const test = useServerFn(testProviderConnection);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [adapter, setAdapter] = useState<"arewabundle" | "unimplemented">("arewabundle");
  const [editing, setEditing] = useState<{ provider: string; service: "data" | "airtime"; product?: Tables<"vtu_products"> } | null>(null);
  const [notice, setNotice] = useState("");
  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    try { await action(); await qc.invalidateQueries({ queryKey: providerControlQuery.queryKey }); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not save settings."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-6">
    <div className="flex items-start gap-3 border-l-4 border-gold bg-muted p-4 text-sm">
      <ShieldAlert className="size-5 shrink-0 text-primary" />
      <p>Customer purchases are disabled. Account authentication is separate from purchase approval; response meanings and callback verification still need confirmation.</p>
    </div>
    <div className="flex justify-end"><Button variant="outline" onClick={() => setAdding(!adding)}><Plus />Add provider</Button></div>
    {adding && <form className="grid gap-3 border-b pb-5 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); void run(async () => { await add({ data: { name, adapter } }); setAdding(false); setName(""); }); }}>
      <label className="text-sm">Provider name<Input required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label className="text-sm">Connection<select className="mt-1 h-9 w-full rounded-md border bg-background px-3" value={adapter} onChange={(e) => setAdapter(e.target.value === "arewabundle" ? "arewabundle" : "unimplemented")}><option value="arewabundle">Arewabundle</option><option value="unimplemented">Future provider — not connected</option></select></label>
      <Button className="self-end" disabled={busy}><Plus />Save provider</Button>
    </form>}
    {!data.providers.length && <p className="text-sm text-muted-foreground">No provider settings saved. Add Arewabundle to configure your plans.</p>}
    {data.providers.map((p) => <section key={p.id} className="space-y-4 border-b pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-xl font-semibold">{p.name}</h2><Button variant="outline" disabled={busy || p.adapter !== "arewabundle"} onClick={() => void run(async () => { const result = await test({ data: { id: p.id } }); setNotice(result.message); })}><RefreshCw />Test connection</Button></div>
      <dl className="grid gap-4 text-sm sm:grid-cols-3"><div><dt className="text-muted-foreground">Account connection</dt><dd className="font-semibold">{p.connection_status.replaceAll("_", " ")}</dd></div><div><dt className="text-muted-foreground">Last authentication</dt><dd>{p.last_authenticated_at ? new Date(p.last_authenticated_at).toLocaleString("en-NG") : "Not tested"}</dd></div><div><dt className="text-muted-foreground">Customer services</dt><dd>Disabled — awaiting approved tests</dd></div></dl>
      {p.last_error && <p role="alert" className="text-sm text-destructive">{p.last_error}</p>}
      {(["data", "airtime"] as const).map((service) => <div key={service} className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{service === "data" ? "Data Plan Management" : "Airtime Network Management"}</h3><Button size="sm" variant="outline" onClick={() => setEditing({ provider: p.id, service })}><Plus />{service === "data" ? "Add plan" : "Add network"}</Button></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[550px] text-left text-sm"><thead className="bg-muted text-muted-foreground"><tr>{["Network", "Plan / network", "Price", "Availability", "Actions"].map((h) => <th key={h} className="p-2 font-medium">{h}</th>)}</tr></thead><tbody>
          {data.products.filter((x) => x.provider_id === p.id && x.service === service).map((x) => <tr key={x.id} className="border-b"><td className="p-2">{x.network_name}</td><td className="p-2">{x.plan_name}<span className="block text-xs text-muted-foreground">{x.validity}</span></td><td className="p-2">{service === "data" ? formatNaira(x.selling_price_kobo ?? 0) : `Face value + ${x.markup_percent}%`}</td><td className="p-2">{x.active ? "Configured active · gated" : "Inactive"}</td><td className="flex gap-1 p-2"><Button size="icon" variant="ghost" aria-label={`Edit ${x.plan_name}`} onClick={() => setEditing({ provider: p.id, service, product: x })}><Pencil /></Button><Button size="icon" variant="ghost" aria-label={`Remove ${x.plan_name}`} disabled={busy} onClick={() => { if (window.confirm(`Remove ${x.plan_name}?`)) void run(() => remove({ data: { id: x.id } })); }}><Trash2 /></Button></td></tr>)}
        </tbody></table></div>
      </div>)}
    </section>)}
    {notice && <p role="status" className="border-l-4 border-primary p-3 text-sm">{notice}</p>}
    {editing && <MappingForm key={editing.product?.id ?? `${editing.provider}-${editing.service}`} {...editing} busy={busy} onCancel={() => setEditing(null)} onSave={(values) => void run(async () => { await save({ data: values }); setEditing(null); toast.success("Mapping saved"); })} />}
    <div className="text-sm text-muted-foreground">Plan validation is not documented by Arewabundle. A saved mapping is not a successful purchase test.</div>
    <section><h3 className="mb-2 font-semibold">Configuration activity</h3><ul className="space-y-2 text-xs text-muted-foreground">{data.audit.map((a) => <li key={a.id}>{new Date(a.created_at).toLocaleString("en-NG")} · {a.action} · {a.entity_type === "vtu_products" ? "Product mapping" : "Provider settings"}</li>)}</ul></section>
  </div>;
}

type SaveInput = Parameters<typeof saveProduct>[0]["data"];
function MappingForm({ provider, service, product, busy, onCancel, onSave }: { provider: string; service: "data" | "airtime"; product?: Tables<"vtu_products">; busy: boolean; onCancel: () => void; onSave: (value: SaveInput) => void }) {
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const text = (key: string) => String(f.get(key) ?? "").trim();
    const money = (key: string) => { const value = text(key); if (!value) return null; const kobo = nairaToKobo(value); if (kobo === null) throw new Error("Enter valid amounts between ₦0.01 and ₦100,000."); return kobo; };
    try { onSave({ id: product?.id, provider_id: provider, service, network_name: text("network_name"), network_id: Number(text("network_id")), plan_name: text("plan_name"), data_plan_id: service === "data" ? Number(text("data_plan_id")) : null, plan_type: text("plan_type") || null, validity: text("validity") || null, cost_kobo: money("cost"), selling_price_kobo: service === "data" ? money("price") : null, min_amount_kobo: money("min"), max_amount_kobo: money("max"), markup_percent: Number(text("markup")), active: f.get("active") === "on" }); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Invalid mapping."); }
  }
  const fields = [
    { key: "network_name", label: "Network name", value: product?.network_name, required: true },
    { key: "network_id", label: "Provider network ID", value: product?.network_id, required: true, numeric: true },
    { key: "plan_name", label: service === "data" ? "Customer plan name" : "Network display name", value: product?.plan_name, required: true },
    ...(service === "data" ? [
      { key: "data_plan_id", label: "Provider data_plan ID", value: product?.data_plan_id, required: true, numeric: true },
      { key: "plan_type", label: "Plan type", value: product?.plan_type },
      { key: "validity", label: "Validity period", value: product?.validity },
      { key: "price", label: "Customer selling price (₦)", value: product?.selling_price_kobo ? product.selling_price_kobo / 100 : "", required: true },
      { key: "cost", label: "Confirmed provider cost (₦, optional)", value: product?.cost_kobo ? product.cost_kobo / 100 : "" },
    ] : [
      { key: "min", label: "Provider-confirmed minimum (₦, optional)", value: product?.min_amount_kobo ? product.min_amount_kobo / 100 : "" },
      { key: "max", label: "Provider-confirmed maximum (₦, optional)", value: product?.max_amount_kobo ? product.max_amount_kobo / 100 : "" },
      { key: "markup", label: "Customer markup (%)", value: product?.markup_percent ?? 0 },
    ]),
  ];
  return <form onSubmit={submit} className="space-y-4 border-t pt-5"><h3 className="font-semibold">{product ? "Edit" : "Add"} {service === "data" ? "data plan" : "airtime network"}</h3><div className="grid gap-3 sm:grid-cols-2">{fields.map((f) => <label key={f.key} className="text-sm">{f.label}<Input name={f.key} defaultValue={f.value ?? ""} required={f.required} type={f.numeric ? "number" : "text"} min={f.numeric ? 1 : undefined} maxLength={100} /></label>)}</div><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={product?.active ?? false} />Mapping active (purchases remain gated)</label><div className="flex gap-2"><Button disabled={busy}>Save mapping</Button><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button></div></form>;
}