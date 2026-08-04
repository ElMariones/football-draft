-- A career seed is an unsigned 32-bit number (`randomSeed()` returns
-- `Uint32Array[0] >>> 0`, so 0 .. 4294967295), but the column was `integer` —
-- Postgres int4, signed, capped at 2147483647. Exactly half of all rolled seeds
-- were therefore out of range, the INSERT raised 22003, and the run never
-- reached the board.
--
-- bigint holds the full range with room to spare. Existing rows are all values
-- that already fitted in int4, so the widening is lossless and needs no backfill.
ALTER TABLE "careerRun" ALTER COLUMN "seed" TYPE bigint;
