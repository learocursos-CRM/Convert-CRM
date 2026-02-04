# Aprendizados de Debugging - Convert CRM

## Bug: F5 Refresh Infinite Loading (Resolvido: 2026-02-02)

### Sintomas
- Pressionar F5 enquanto logado causava loading infinito
- Tela "Carregando..." que nunca terminava
- Acontecia tanto em localhost quanto em produção

### Causa Raiz
A restauração de sessão do Supabase (que acontece automaticamente no refresh) pode **interferir com queries ao banco de dados** feitas simultaneamente. Isso fazia a query `loadProfile` travar indefinidamente, sem retornar nem sucesso nem erro.

### Solução (3 Camadas)

1. **ProtectedRoute com isLoading** (`App.tsx`)
   - Não redirecionar para login enquanto `isLoading` é `true`
   - Mostrar spinner durante verificação de sessão

2. **Timeout Inteligente** (`AuthContext.tsx`)
   - Timeout que se estende se há operação de auth em andamento
   - Evita timeout prematuro que mataria uma autenticação válida

3. **Timeout na Query** (`AuthContext.tsx`)
   - `Promise.race()` entre a query e um timeout de 5 segundos
   - Se a query travar, o timeout retorna `null` e libera o fluxo

### Padrão Recomendado

```typescript
// SEMPRE adicionar timeout em queries durante inicialização
const loadDataWithTimeout = async () => {
    const queryPromise = supabase.from('table').select('*').single();
    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 5000)
    );
    return Promise.race([queryPromise, timeoutPromise]);
};
```

### Metodologia Usada
- **Skill**: `systematic-debugging` (4 fases: Reproduzir → Isolar → Entender → Corrigir)
- **Técnica chave**: "5 Porquês" para chegar na causa raiz
- **Ferramenta**: Console logs estratégicos para mapear o fluxo de execução

### Lição Principal
> Serviços de autenticação de terceiros (Supabase, Firebase, Auth0) têm comportamentos edge-case durante page refresh. **Sempre** proteja operações assíncronas com timeouts durante a inicialização do app.

---

*Documentado para referência futura. Este bug levou ~3 horas para resolver.*
