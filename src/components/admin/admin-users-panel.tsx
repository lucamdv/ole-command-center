import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listUsers,
  createUserManual,
  updateUser,
  deleteUser,
  listInvites,
  createInvite,
  revokeInvite,
} from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Pencil, Copy, X } from "lucide-react";

type Role = "admin" | "manager" | "user";

export function AdminUsersPanel() {
  const qc = useQueryClient();
  const lU = useServerFn(listUsers);
  const lI = useServerFn(listInvites);
  const { data: users } = useQuery({ queryKey: ["admin-users"], queryFn: () => lU() });
  const { data: invites } = useQuery({ queryKey: ["admin-invites"], queryFn: () => lI() });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-users"] });
    qc.invalidateQueries({ queryKey: ["admin-invites"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Administração de Usuários</h1>
          <p className="text-[13px] text-muted-foreground">
            Cadastre, edite, remova ou convide usuários para a plataforma.
          </p>
        </div>
        <div className="flex gap-2">
          <CreateUserDialog onCreated={invalidate} />
          <CreateInviteDialog onCreated={invalidate} />
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-border text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
          Usuários ({users?.length ?? 0})
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(users ?? []).map((u) => (
              <UserRow key={u.id} user={u} onChanged={invalidate} />
            ))}
            {users && users.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                  Nenhum usuário.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-border text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
          Convites ({invites?.length ?? 0})
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expira em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(invites ?? []).map((i) => (
              <InviteRow key={i.id} invite={i} onChanged={invalidate} />
            ))}
            {invites && invites.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                  Nenhum convite emitido.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function UserRow({ user, onChanged }: { user: any; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(user.full_name ?? "");
  const [role, setRole] = useState<Role>((user.roles?.[0] as Role) ?? "user");
  const update = useServerFn(updateUser);
  const del = useServerFn(deleteUser);

  async function save() {
    try {
      await update({ data: { user_id: user.id, full_name: fullName, role } });
      toast.success("Usuário atualizado");
      setEditing(false);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha");
    }
  }

  async function remove() {
    if (!confirm(`Remover ${user.email}?`)) return;
    try {
      await del({ data: { user_id: user.id } });
      toast.success("Usuário removido");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha");
    }
  }

  const currentRole = user.roles?.[0] ?? "user";

  return (
    <TableRow>
      <TableCell>
        {editing ? (
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-8" />
        ) : (
          user.full_name || <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="font-mono text-[12px]">{user.email}</TableCell>
      <TableCell>
        {editing ? (
          <Select value={role} onValueChange={(v) => setRole(v as Role)}>
            <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">admin</SelectItem>
              <SelectItem value="manager">manager</SelectItem>
              <SelectItem value="user">user</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Badge variant={currentRole === "admin" ? "default" : "secondary"}>{currentRole}</Badge>
        )}
      </TableCell>
      <TableCell className="text-[12px] text-muted-foreground">
        {new Date(user.created_at).toLocaleDateString("pt-BR")}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          {editing ? (
            <>
              <Button size="sm" onClick={save}>Salvar</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
            </>
          ) : (
            <>
              <Button size="icon" variant="ghost" onClick={() => setEditing(true)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" onClick={remove}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

function InviteRow({ invite, onChanged }: { invite: any; onChanged: () => void }) {
  const revoke = useServerFn(revokeInvite);
  const expired = new Date(invite.expires_at).getTime() < Date.now();
  const status = invite.used_at
    ? { label: "usado", variant: "secondary" as const }
    : invite.revoked_at
      ? { label: "revogado", variant: "destructive" as const }
      : expired
        ? { label: "expirado", variant: "destructive" as const }
        : { label: "pendente", variant: "default" as const };

  async function handleRevoke() {
    try {
      await revoke({ data: { id: invite.id } });
      toast.success("Convite revogado");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha");
    }
  }

  return (
    <TableRow>
      <TableCell className="font-mono text-[12px]">{invite.email}</TableCell>
      <TableCell><Badge variant="secondary">{invite.role}</Badge></TableCell>
      <TableCell><Badge variant={status.variant}>{status.label}</Badge></TableCell>
      <TableCell className="text-[12px] text-muted-foreground">
        {new Date(invite.expires_at).toLocaleString("pt-BR")}
      </TableCell>
      <TableCell className="text-right">
        {!invite.used_at && !invite.revoked_at && !expired && (
          <Button size="icon" variant="ghost" onClick={handleRevoke}>
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

function CreateUserDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("user");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const create = useServerFn(createUserManual);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await create({ data: { email, full_name: fullName, role, password } });
      toast.success("Usuário criado. Deve trocar a senha no primeiro acesso.");
      setOpen(false);
      setEmail(""); setFullName(""); setRole("user"); setPassword("");
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Cadastrar manualmente</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cadastrar usuário</DialogTitle>
          <DialogDescription>
            Define uma senha temporária. O usuário será obrigado a trocá-la no primeiro acesso.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome completo</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={120} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Perfil</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">admin</SelectItem>
                <SelectItem value="manager">manager</SelectItem>
                <SelectItem value="user">user</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Senha temporária</Label>
            <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>{loading ? "Criando…" : "Criar usuário"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreateInviteDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("user");
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const create = useServerFn(createInvite);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await create({ data: { email, role } });
      const url = `${window.location.origin}/invite/${res.token}`;
      setLink(url);
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setOpen(false);
    setLink(null); setEmail(""); setRole("user");
  }

  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    toast.success("Link copiado");
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : reset())}>
      <DialogTrigger asChild>
        <Button>Gerar link de convite</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gerar link de convite</DialogTitle>
          <DialogDescription>
            Link válido por 24 horas e utilizável apenas uma vez.
          </DialogDescription>
        </DialogHeader>
        {!link ? (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>Email do convidado</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Perfil</Label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">admin</SelectItem>
                  <SelectItem value="manager">manager</SelectItem>
                  <SelectItem value="user">user</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading}>{loading ? "Gerando…" : "Gerar link"}</Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border border-border bg-muted/30 p-3 break-all text-[12px] font-mono">
              {link}
            </div>
            <div className="flex gap-2">
              <Button onClick={copy} className="flex-1">
                <Copy className="h-4 w-4 mr-2" /> Copiar link
              </Button>
              <Button variant="outline" onClick={reset}>Fechar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
