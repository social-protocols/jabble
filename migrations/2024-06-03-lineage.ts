import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
	await sql`
        create table Lineage(
              ancestorId   integer
            , descendantId integer not null
            , separation    integer not null
            , primary key(ancestorId, descendantId)
        ) strict;
    `.execute(db)

	await sql`
        create index Lineage_ancestorId
        on Lineage(ancestorId);
    `.execute(db)

	await sql`
        create index Lineage_descendantId
        on Lineage(descendantId);
    `.execute(db)

	await sql`
      create trigger afterInsertPost after insert on Post
        when new.parentId is not null
        begin

            -- Insert a lineage record for parent
            insert into Lineage(ancestorId, descendantId, separation)
            values(new.parentId, new.id, 1) on conflict do nothing;

            -- Insert a lineage record for all ancestors of this parent
            insert into Lineage
            select 
                  ancestorId
                , new.id as descendantId
                , 1 + separation as separation
            from lineage ancestor 
            where ancestor.descendantId = new.parentId;
        end
    `.execute(db)
}
