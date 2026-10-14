-- ============================================================
--  MDRRMO Endorsement Letters — Neon PostgreSQL Schema
--  Paste this entire file into the Neon SQL Editor and run it.
-- ============================================================


-- ── 0. Extensions ────────────────────────────────────────────
-- pgcrypto gives us gen_random_uuid(); already available on Neon.
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ── 1. Enum: allowed signatory positions ─────────────────────
DO $$ BEGIN
  CREATE TYPE team_position AS ENUM (
    'Team Alpha - Team Leader',
    'Team Bravo - Team Leader',
    'Team Charlie - Team Leader',
    'Team Delta - Team Leader'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ── 2. Main letters table ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS endorsement_letters (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- header info
  title                TEXT        NOT NULL,
  team                 TEXT        NOT NULL,
  date                 TEXT        NOT NULL,   -- "October 05, 2026"
  time                 TEXT        NOT NULL,   -- "8:00 am – 8:00 pm"

  -- signatories
  prepared_by_name     TEXT        NOT NULL,
  prepared_by_position team_position NOT NULL,
  received_by_name     TEXT        NOT NULL,
  received_by_position team_position NOT NULL,

  -- audit
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE endorsement_letters IS
  'One row per MDRRMO endorsement letter (header + signatory data).';


-- ── 3. Sections (Ambulance, Adventure, …) ────────────────────
CREATE TABLE IF NOT EXISTS letter_sections (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_id  UUID    NOT NULL REFERENCES endorsement_letters(id) ON DELETE CASCADE,
  name       TEXT    NOT NULL,                -- "Ambulance" / "Adventure"
  sort_order INTEGER NOT NULL DEFAULT 0       -- preserves display order
);

COMMENT ON TABLE letter_sections IS
  'Inventory sections that belong to an endorsement letter.';


-- ── 4. Items inside each section ─────────────────────────────
CREATE TABLE IF NOT EXISTS section_items (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID    NOT NULL REFERENCES letter_sections(id) ON DELETE CASCADE,

  item       TEXT    NOT NULL,                -- "BVM (Adult)"
  in_qty     TEXT    NOT NULL DEFAULT '',     -- "1", "1 set", …
  used       TEXT    NOT NULL DEFAULT '',
  out_qty    TEXT    NOT NULL DEFAULT '',
  notes      TEXT    NOT NULL DEFAULT '',     -- "Empty", "Checked", …

  sort_order INTEGER NOT NULL DEFAULT 0
);

COMMENT ON TABLE section_items IS
  'Individual equipment / supply rows within a section.';


-- ── 5. Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_letter_sections_letter_id
  ON letter_sections(letter_id);

CREATE INDEX IF NOT EXISTS idx_section_items_section_id
  ON section_items(section_id);

CREATE INDEX IF NOT EXISTS idx_endorsement_letters_team
  ON endorsement_letters(team);

CREATE INDEX IF NOT EXISTS idx_endorsement_letters_created_at
  ON endorsement_letters(created_at DESC);


-- ── 6. Auto-update updated_at ─────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_letters_updated_at ON endorsement_letters;
CREATE TRIGGER trg_letters_updated_at
  BEFORE UPDATE ON endorsement_letters
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ── 7. Convenience view (returns full letter as JSON) ─────────
--  Usage:  SELECT * FROM v_endorsement_letters WHERE id = '…';
CREATE OR REPLACE VIEW v_endorsement_letters AS
SELECT
  el.id,
  el.title,
  el.team,
  el.date,
  el.time,

  jsonb_build_object(
    'name',     el.prepared_by_name,
    'position', el.prepared_by_position
  ) AS "preparedBy",

  jsonb_build_object(
    'name',     el.received_by_name,
    'position', el.received_by_position
  ) AS "receivedBy",

  -- sections → items aggregated into JSONB (same shape as the API)
  COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'name',  ls.name,
        'items', ls.items
      )
      ORDER BY ls.sort_order
    ) FILTER (WHERE ls.id IS NOT NULL),
    '[]'::jsonb
  ) AS sections,

  el.created_at AS "createdAt",
  el.updated_at AS "updatedAt"

FROM endorsement_letters el

LEFT JOIN LATERAL (
  -- per section, pre-aggregate its items
  SELECT
    ls.id,
    ls.letter_id,
    ls.name,
    ls.sort_order,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'item',   si.item,
          'inQty',  si.in_qty,
          'used',   si.used,
          'outQty', si.out_qty,
          'notes',  si.notes
        )
        ORDER BY si.sort_order
      ) FILTER (WHERE si.id IS NOT NULL),
      '[]'::jsonb
    ) AS items
  FROM letter_sections ls
  LEFT JOIN section_items si ON si.section_id = ls.id
  WHERE ls.letter_id = el.id
  GROUP BY ls.id
) ls ON true

GROUP BY el.id;

COMMENT ON VIEW v_endorsement_letters IS
  'Full letter with nested sections + items as JSONB — mirrors the REST API response shape.';


-- ── 8. Sample data (the same preloaded Team Charlie letter) ───
DO $$
DECLARE
  v_letter_id  UUID;
  v_amb_id     UUID;
  v_adv_id     UUID;
BEGIN
  -- only insert if the table is empty
  IF NOT EXISTS (SELECT 1 FROM endorsement_letters LIMIT 1) THEN

    INSERT INTO endorsement_letters (
      title, team, date, time,
      prepared_by_name, prepared_by_position,
      received_by_name, received_by_position
    ) VALUES (
      'Endorsement of Rescue Equipment and Medical Supplies',
      'Team Charlie',
      'October 05, 2026',
      '8:00 am – 8:00 pm',
      'Reginald Christian V. Balaygan', 'Team Alpha - Team Leader',
      'Marvin Eguillon',                'Team Bravo - Team Leader'
    )
    RETURNING id INTO v_letter_id;

    -- Ambulance section
    INSERT INTO letter_sections (letter_id, name, sort_order)
    VALUES (v_letter_id, 'Ambulance', 0)
    RETURNING id INTO v_amb_id;

    INSERT INTO section_items (section_id, item, in_qty, used, out_qty, notes, sort_order) VALUES
      (v_amb_id, 'BVM (Adult)',                        '1',     '', '1',     '',      0),
      (v_amb_id, 'BVM (Infant)',                       '1',     '', '1',     '',      1),
      (v_amb_id, 'SPIDER STRAP',                       '2',     '', '2',     '',      2),
      (v_amb_id, 'SPLINT',                             '1 set', '', '1 set', '',      3),
      (v_amb_id, 'KIDNEY BASIN',                       '2',     '', '2',     '',      4),
      (v_amb_id, 'ARM SLING',                          '5',     '', '5',     '',      5),
      (v_amb_id, 'FOLDABLE SPLINT',                    '1',     '', '1',     '',      6),
      (v_amb_id, 'FIRE BLANKET',                       '1',     '', '1',     '',      7),
      (v_amb_id, 'C-COLLAR',                           '2',     '', '2',     '',      8),
      (v_amb_id, 'SPINE BOARD',                        '1',     '', '1',     '',      9),
      (v_amb_id, 'HARD HAT',                           '5',     '', '5',     '',      10),
      (v_amb_id, 'PPE',                                '4',     '', '4',     '',      11),
      (v_amb_id, 'Scoop Stretcher',                    '1',     '', '1',     '',      12),
      (v_amb_id, 'Oxygen Tank',                        '1',     '', '1',     'Empty', 13),
      (v_amb_id, 'Stretcher',                          '1',     '', '1',     '',      14),
      (v_amb_id, 'Vest',                               '3',     '', '3',     '',      15),
      (v_amb_id, 'Nasal Cannula',                      '14',    '', '14',    '',      16),
      (v_amb_id, 'Stethoscope',                        '1',     '', '1',     '',      17),
      (v_amb_id, 'Cadaver bag',                        '0',     '', '0',     '',      18),
      (v_amb_id, 'BP Apparatus',                       '1',     '', '1',     '',      19),
      (v_amb_id, 'Mobile Radio Base',                  '1',     '', '1',     '',      20),
      (v_amb_id, 'Electronic Blood Pressure Monitor',  '1',     '', '1',     '',      21);

    -- Adventure section
    INSERT INTO letter_sections (letter_id, name, sort_order)
    VALUES (v_letter_id, 'Adventure', 1)
    RETURNING id INTO v_adv_id;

    INSERT INTO section_items (section_id, item, in_qty, used, out_qty, notes, sort_order) VALUES
      (v_adv_id, 'SPINE BOARD',  '1', '', '1', '', 0),
      (v_adv_id, 'SPIDER STRAP', '1', '', '1', '', 1);

  END IF;
END $$;


-- ── 9. Quick smoke-test queries ───────────────────────────────
-- Run these after pasting to verify everything looks right:
--
--   SELECT * FROM endorsement_letters;
--   SELECT * FROM letter_sections;
--   SELECT * FROM section_items;
--   SELECT id, team, "preparedBy", sections FROM v_endorsement_letters;
