using Microsoft.EntityFrameworkCore;
using Profile.Api.Data;

namespace Profile.Api.Admin;

/// <summary>List, create, update, delete and reorder for any content with an owner-controlled order.</summary>
public static class OrderedCrud
{
    public static void Map<TEntity, TEdit>(
        RouteGroupBuilder group, string path,
        Func<ProfileContext, IQueryable<TEntity>> query,
        Func<ProfileContext, TEdit, TEntity?, Task<Problems>> validate,
        Func<ProfileContext, TEdit, TEntity, Task> apply,
        Func<TEntity, object> view)
        where TEntity : class, IOrdered, new()
    {
        group.MapGet(path, async (ProfileContext db) =>
            Results.Ok((await query(db).OrderBy(e => e.SortOrder).ToListAsync()).Select(view)));

        group.MapPost(path, async (ProfileContext db, TEdit edit) =>
        {
            var problems = await validate(db, edit, null);
            if (problems.Any) return problems.Result();

            var entity = new TEntity();
            var set = db.Set<TEntity>();
            entity.SortOrder = await set.AnyAsync() ? await set.MaxAsync(e => e.SortOrder) + 1 : 0;
            await apply(db, edit, entity);
            set.Add(entity);
            await db.SaveChangesAsync();
            return Results.Created($"/api/admin{path}/{entity.Id}", view(entity));
        });

        group.MapPut(path + "/{id:int}", async (ProfileContext db, int id, TEdit edit) =>
        {
            var entity = await query(db).FirstOrDefaultAsync(e => e.Id == id);
            if (entity is null) return Results.NotFound();

            var problems = await validate(db, edit, entity);
            if (problems.Any) return problems.Result();

            await apply(db, edit, entity);
            await db.SaveChangesAsync();
            return Results.Ok(view(entity));
        });

        group.MapDelete(path + "/{id:int}", async (ProfileContext db, int id) =>
        {
            // Through the query, so owned rows (journey highlights) are loaded and removed with it.
            var entity = await query(db).FirstOrDefaultAsync(e => e.Id == id);
            if (entity is null) return Results.NotFound();
            db.Set<TEntity>().Remove(entity);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // The whole order at once: a partial list would leave positions ambiguous.
        group.MapPut(path + "/order", async (ProfileContext db, int[] ids) =>
        {
            var all = await db.Set<TEntity>().ToListAsync();
            if (ids.Length != all.Count || ids.Distinct().Count() != ids.Length || !all.All(e => ids.Contains(e.Id)))
                return new Problems().Add("ids", "must list every item exactly once").Result();

            foreach (var entity in all) entity.SortOrder = Array.IndexOf(ids, entity.Id);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }
}
