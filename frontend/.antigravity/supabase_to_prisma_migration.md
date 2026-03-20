# Supabase to Prisma Migration Strategy

When transitioning from Supabase to Prisma in this project, follow these guidelines to ensure consistency and prevent logic fragmentation.

## 1. Handling Supabase RPCs
If you encounter a call to `supabase.rpc('function_name', { ... })`, do not simply replace it with an external server action if the user prefers local logic or if the logic is tightly coupled to a hook.

### Recommended Approach:
- **Direct Prisma Query**: Use Prisma's aggregation (`groupBy`, `count`, `sum`) or fetch relevant rows and aggregate in TypeScript if the logic is complex.
- **Example Implementation**:
  ```typescript
  // OLD (Supabase)
  const { data, error } = await supabase.rpc('get_stats', { id: businessId });

  // NEW (Prisma)
  const data = await db.model.findMany({ where: { businessId } });
  const result = data.reduce((acc, item) => {
    acc.total += item.value;
    return acc;
  }, { total: 0 });
  ```

## 2. Maintaining Interfaces
Always preserve existing TypeScript interfaces and mapping logic. If the legacy RPC returned a specific JSON structure, ensure your Prisma-based result matches that structure exactly to avoid breaking client components.

## 3. Server Component Integration
When possible, fetch data in a Server Component and pass it as an `initialData` prop to a client wrapper. This improves LCP and SEO while maintaining interactivity.

## 4. Hook Consolidation
If multiple hooks perform the same calculation, consolidate them or ensured they share a common server-side implementation. Avoid duplicating database logic across different parts of the application.
