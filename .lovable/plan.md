## Objetivo

Remover o auto-cadastro público e centralizar gestão de usuários em um painel de admin. Apenas admins podem criar, editar, remover e promover usuários, além de emitir links mágicos de convite (24h, 1 uso).

## Papéis

- **admin** — gerencia usuários, convites, todos os dados.
- **manager** — opera a plataforma e dados de negócio, mas não gerencia usuários.
- **user** — uso comum da plataforma.

Sua conta (`luca@excelsior.com.br`) será promovida a `admin` na migração inicial.

## Mudanças no banco (uma migração)

1. **Enum `app_role`** com valores `admin`, `manager`, `user`.
2. **Tabela `public.user_roles`** (`user_id`, `role`, único por par) + GRANTs + RLS. Função `public.has_role(_user_id, _role)` SECURITY DEFINER.
3. **Tabela `public.profiles`** (`id` → `auth.users`, `full_name`, `email`, `must_change_password boolean default false`, `created_by`) + GRANTs + RLS (usuário lê/edita o próprio; admin lê/edita todos via `has_role`). Trigger `on_auth_user_created` cria profile automaticamente.
4. **Tabela `public.user_invites`** (`id`, `email`, `role`, `token_hash`, `expires_at`, `used_at`, `used_by`, `created_by`, `created_at`). RLS: somente admin lê/cria/revoga. GRANT para `authenticated` + `service_role`.
5. **Desabilitar signup público** em Supabase Auth (`configure_auth` com `disable_signup: true`).
6. **Seed**: promover Luca a admin via lookup por e-mail em `auth.users` (na própria migração).

## Server functions (`src/lib/admin.functions.ts`)

Todas com `requireSupabaseAuth` + checagem `has_role(admin)` antes de carregar `supabaseAdmin` dinamicamente.

- `listUsers()` — lista profiles + roles.
- `createUserManual({ email, full_name, role, password })` — admin define senha temporária; marca `must_change_password = true`.
- `updateUser({ user_id, full_name, role })`.
- `deleteUser({ user_id })`.
- `createInvite({ email, role })` — gera token aleatório (32 bytes), armazena apenas hash SHA-256, `expires_at = now() + 24h`. Retorna o link `https://<host>/invite/<token>` para o admin copiar.
- `revokeInvite({ id })`.
- `listInvites()`.

Server function pública (sem auth) **com validação por token**:
- `consumeInvite({ token, password, full_name })` — valida hash, expiração e `used_at`. Cria usuário via `supabaseAdmin.auth.admin.createUser` (email_confirm: true), atribui role, marca convite como usado. Atômico (lock por `FOR UPDATE`).

Server function autenticada:
- `changeOwnPassword({ new_password })` — usa supabase do contexto, limpa `must_change_password`.

## Rotas (TanStack)

- **`src/routes/invite.$token.tsx`** (público) — formulário para o convidado definir nome + senha. Chama `consumeInvite`. Após sucesso, redireciona para `/auth` para login.
- **`src/routes/auth.tsx`** — remover toggle de "criar conta", manter apenas login + recuperação de senha. Mostrar texto explicando que cadastros são por convite.
- **`src/routes/_authenticated/admin.usuarios.tsx`** — painel:
  - Tabela de usuários (nome, e-mail, role, criado em) com ações editar / remover / promover.
  - Botão "Cadastrar manualmente" → dialog com nome, e-mail, role, senha temporária.
  - Botão "Gerar link de convite" → dialog com e-mail + role → exibe link copiável (toast "copiado").
  - Tabela de convites pendentes (e-mail, role, expira em, status) com botão revogar.
  - Rota protegida por `beforeLoad` que checa `has_role(admin)` via server fn; redireciona não-admins.
- **Item no menu lateral "Administração"** visível apenas para admins.

## Troca obrigatória de senha

- Hook global no shell autenticado: ao montar, consulta `must_change_password` do próprio profile.
- Se `true`, abre dialog **bloqueante** (não fechável) com campos nova senha + confirmação. Submit chama `changeOwnPassword` e remove flag.

## Validação e segurança

- Zod em todos os inputs (e-mail, senha mín. 8 chars, role enum).
- Token de convite: 32 bytes random base64url; armazenar apenas SHA-256.
- RLS estrita em `user_roles`, `user_invites` e `profiles`.
- `consumeInvite` é o único caminho público; bloqueia se token expirou/usado.
- Senha temporária nunca é logada nem retornada.

## Detalhes técnicos

```text
src/
├── lib/
│   ├── admin.functions.ts        # CRUD usuários, convites
│   └── invites.functions.ts      # consumeInvite (público)
├── routes/
│   ├── auth.tsx                  # editar: só login
│   ├── invite.$token.tsx         # novo: aceitar convite
│   └── _authenticated/
│       └── admin.usuarios.tsx    # novo: painel admin
├── components/
│   ├── admin/
│   │   ├── users-table.tsx
│   │   ├── create-user-dialog.tsx
│   │   ├── invite-dialog.tsx
│   │   └── invites-table.tsx
│   └── auth/
│       └── force-password-change-dialog.tsx
└── hooks/
    └── use-current-role.ts       # consulta has_role do user atual
```

Pacote `crypto` (Node nativo) para hash de token; sem dependências novas.

## Itens a confirmar depois da aprovação

- Layout/visual do painel admin (segue design system atual).
- Texto exato na tela de login explicando "acesso por convite".
