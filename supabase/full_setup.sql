-- ============================================================
-- Community Bible Study App - Initial Schema
-- ============================================================

-- ============================================================
-- CUSTOM TYPES AND ENUMS
-- ============================================================

-- Observation categories from "Living By the Book" methodology
CREATE TYPE observation_category AS ENUM (
  'terms_identification',
  'who',
  'cause_effect',
  'place',
  'define_terms',
  'things_emphasized',
  'things_repeated',
  'things_related',
  'things_alike',
  'things_unlike',
  'true_to_life',
  'general_note',
  'question',
  'application',
  'cross_reference'
);

-- Group member roles
CREATE TYPE group_role AS ENUM (
  'owner',
  'admin',
  'member'
);

-- Assignment status
CREATE TYPE assignment_status AS ENUM (
  'draft',
  'active',
  'completed',
  'archived'
);

-- Strong's language type
CREATE TYPE strongs_language AS ENUM (
  'hebrew',
  'greek'
);

-- ============================================================
-- UTILITY FUNCTIONS
-- ============================================================

-- Function to generate random invite codes
CREATE OR REPLACE FUNCTION generate_invite_code(length INTEGER DEFAULT 8)
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PROFILES TABLE (extends auth.users)
-- ============================================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  api_bible_key TEXT, -- User's personal API.Bible key (get free at scripture.api.bible)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_display_name ON public.profiles(display_name);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- BIBLE REFERENCE TABLES
-- ============================================================

CREATE TABLE public.bible_books (
  id SMALLINT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  abbreviation TEXT NOT NULL UNIQUE,
  testament TEXT NOT NULL CHECK (testament IN ('OT', 'NT')),
  chapter_count SMALLINT NOT NULL,
  canonical_order SMALLINT NOT NULL UNIQUE
);

CREATE INDEX idx_bible_books_name ON public.bible_books(name);
CREATE INDEX idx_bible_books_testament ON public.bible_books(testament);

-- ============================================================
-- STRONG'S CONCORDANCE
-- ============================================================

CREATE TABLE public.strongs_entries (
  id SERIAL PRIMARY KEY,
  strongs_number TEXT NOT NULL UNIQUE,
  language strongs_language NOT NULL,
  original_word TEXT NOT NULL,
  transliteration TEXT NOT NULL,
  pronunciation TEXT,
  short_definition TEXT NOT NULL,
  long_definition TEXT,
  derivation TEXT,
  kjv_usage TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_strongs_number ON public.strongs_entries(strongs_number);
CREATE INDEX idx_strongs_language ON public.strongs_entries(language);
CREATE INDEX idx_strongs_transliteration ON public.strongs_entries(transliteration);

-- Full-text search on definitions
CREATE INDEX idx_strongs_definition_fts ON public.strongs_entries
  USING GIN (to_tsvector('english', short_definition || ' ' || COALESCE(long_definition, '')));

-- ============================================================
-- STUDY GROUPS
-- ============================================================

CREATE TABLE public.study_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  invite_code TEXT UNIQUE DEFAULT generate_invite_code(),
  max_members INTEGER DEFAULT 50,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_study_groups_created_by ON public.study_groups(created_by);
CREATE INDEX idx_study_groups_public ON public.study_groups(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_study_groups_invite_code ON public.study_groups(invite_code) WHERE invite_code IS NOT NULL;

CREATE TRIGGER update_study_groups_updated_at
  BEFORE UPDATE ON public.study_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- GROUP MEMBERSHIPS
-- ============================================================

CREATE TABLE public.group_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role group_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

CREATE INDEX idx_group_memberships_group ON public.group_memberships(group_id);
CREATE INDEX idx_group_memberships_user ON public.group_memberships(user_id);
CREATE INDEX idx_group_memberships_role ON public.group_memberships(group_id, role);

-- ============================================================
-- ASSIGNMENTS
-- ============================================================

CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status assignment_status NOT NULL DEFAULT 'draft',

  -- Verse range for assignment
  start_book_id SMALLINT NOT NULL REFERENCES public.bible_books(id),
  start_chapter SMALLINT NOT NULL,
  start_verse SMALLINT NOT NULL,
  end_book_id SMALLINT NOT NULL REFERENCES public.bible_books(id),
  end_chapter SMALLINT NOT NULL,
  end_verse SMALLINT NOT NULL,

  -- Requirements
  observations_per_verse INTEGER DEFAULT 7,

  -- Dates
  due_date TIMESTAMPTZ,
  start_date TIMESTAMPTZ,

  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assignments_group ON public.assignments(group_id);
CREATE INDEX idx_assignments_status ON public.assignments(group_id, status);
CREATE INDEX idx_assignments_due_date ON public.assignments(due_date) WHERE due_date IS NOT NULL;

CREATE TRIGGER update_assignments_updated_at
  BEFORE UPDATE ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- OBSERVATIONS
-- ============================================================

CREATE TABLE public.observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User and context
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE SET NULL,
  group_id UUID REFERENCES public.study_groups(id) ON DELETE SET NULL,

  -- Verse reference
  book_id SMALLINT NOT NULL REFERENCES public.bible_books(id),
  chapter SMALLINT NOT NULL,
  start_verse SMALLINT NOT NULL,
  end_verse SMALLINT,

  -- Observation content
  category observation_category NOT NULL,
  title TEXT,
  content TEXT NOT NULL,

  -- Related Strong's references
  strongs_references TEXT[],

  -- Visibility
  is_private BOOLEAN NOT NULL DEFAULT FALSE,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_observations_user ON public.observations(user_id);
CREATE INDEX idx_observations_assignment ON public.observations(assignment_id) WHERE assignment_id IS NOT NULL;
CREATE INDEX idx_observations_group ON public.observations(group_id) WHERE group_id IS NOT NULL;
CREATE INDEX idx_observations_verse ON public.observations(book_id, chapter, start_verse);
CREATE INDEX idx_observations_category ON public.observations(category);
CREATE INDEX idx_observations_created ON public.observations(created_at DESC);

-- GIN index for Strong's references array
CREATE INDEX idx_observations_strongs ON public.observations USING GIN (strongs_references);

-- Full-text search on observation content
CREATE INDEX idx_observations_content_fts ON public.observations
  USING GIN (to_tsvector('english', COALESCE(title, '') || ' ' || content));

CREATE TRIGGER update_observations_updated_at
  BEFORE UPDATE ON public.observations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ============================================================
-- Community Bible Study App - Row Level Security Policies
-- ============================================================

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Check if user is a member of a group
CREATE OR REPLACE FUNCTION public.is_group_member(group_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_memberships
    WHERE group_id = group_uuid
    AND user_id = (SELECT auth.uid())
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if user is admin or owner of a group
CREATE OR REPLACE FUNCTION public.is_group_admin(group_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_memberships
    WHERE group_id = group_uuid
    AND user_id = (SELECT auth.uid())
    AND role IN ('admin', 'owner')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- PROFILES RLS
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- ============================================================
-- BIBLE REFERENCE TABLES RLS (Read-only)
-- ============================================================

ALTER TABLE public.bible_books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bible books are readable by authenticated users"
  ON public.bible_books FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- STRONG'S CONCORDANCE RLS (Read-only)
-- ============================================================

ALTER TABLE public.strongs_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Strongs entries are readable by authenticated users"
  ON public.strongs_entries FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- STUDY GROUPS RLS
-- ============================================================

ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;

-- View public groups OR groups user is a member of
CREATE POLICY "Users can view public groups and their own groups"
  ON public.study_groups FOR SELECT
  TO authenticated
  USING (
    is_public = TRUE
    OR (SELECT public.is_group_member(id))
    OR created_by = (SELECT auth.uid())
  );

-- Any authenticated user can create a group
CREATE POLICY "Authenticated users can create groups"
  ON public.study_groups FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = created_by);

-- Only owner/admin can update group
CREATE POLICY "Group admins can update groups"
  ON public.study_groups FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_group_admin(id)))
  WITH CHECK ((SELECT public.is_group_admin(id)));

-- Only owner can delete group
CREATE POLICY "Group owner can delete group"
  ON public.study_groups FOR DELETE
  TO authenticated
  USING (created_by = (SELECT auth.uid()));

-- ============================================================
-- GROUP MEMBERSHIPS RLS
-- ============================================================

ALTER TABLE public.group_memberships ENABLE ROW LEVEL SECURITY;

-- Members can view other members in their groups
CREATE POLICY "Group members can view memberships"
  ON public.group_memberships FOR SELECT
  TO authenticated
  USING (
    group_id IN (
      SELECT group_id FROM public.group_memberships
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Users can join groups (insert their own membership)
CREATE POLICY "Users can join groups"
  ON public.group_memberships FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
  );

-- Admins can update member roles (except owner)
CREATE POLICY "Admins can update member roles"
  ON public.group_memberships FOR UPDATE
  TO authenticated
  USING (
    (SELECT public.is_group_admin(group_id))
    AND role != 'owner'
  )
  WITH CHECK (
    (SELECT public.is_group_admin(group_id))
    AND role != 'owner'
  );

-- Users can leave groups or admins can remove members
CREATE POLICY "Users can leave or admins can remove members"
  ON public.group_memberships FOR DELETE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (
      (SELECT public.is_group_admin(group_id))
      AND role != 'owner'
    )
  );

-- ============================================================
-- ASSIGNMENTS RLS
-- ============================================================

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- Group members can view assignments
CREATE POLICY "Group members can view assignments"
  ON public.assignments FOR SELECT
  TO authenticated
  USING ((SELECT public.is_group_member(group_id)));

-- Group admins can create assignments
CREATE POLICY "Group admins can create assignments"
  ON public.assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT public.is_group_admin(group_id))
    AND created_by = (SELECT auth.uid())
  );

-- Group admins can update assignments
CREATE POLICY "Group admins can update assignments"
  ON public.assignments FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_group_admin(group_id)))
  WITH CHECK ((SELECT public.is_group_admin(group_id)));

-- Group admins can delete assignments
CREATE POLICY "Group admins can delete assignments"
  ON public.assignments FOR DELETE
  TO authenticated
  USING ((SELECT public.is_group_admin(group_id)));

-- ============================================================
-- OBSERVATIONS RLS
-- ============================================================

ALTER TABLE public.observations ENABLE ROW LEVEL SECURITY;

-- Users can view their own observations and non-private group observations
CREATE POLICY "Users can view accessible observations"
  ON public.observations FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (
      is_private = FALSE
      AND group_id IS NOT NULL
      AND (SELECT public.is_group_member(group_id))
    )
    OR (
      is_private = FALSE
      AND assignment_id IN (
        SELECT a.id FROM public.assignments a
        WHERE (SELECT public.is_group_member(a.group_id))
      )
    )
  );

-- Users can create their own observations
CREATE POLICY "Users can create observations"
  ON public.observations FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (
      group_id IS NULL
      OR (SELECT public.is_group_member(group_id))
    )
    AND (
      assignment_id IS NULL
      OR assignment_id IN (
        SELECT a.id FROM public.assignments a
        WHERE (SELECT public.is_group_member(a.group_id))
      )
    )
  );

-- Users can update their own observations
CREATE POLICY "Users can update their own observations"
  ON public.observations FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Users can delete their own observations
CREATE POLICY "Users can delete their own observations"
  ON public.observations FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));
-- ============================================================
-- Community Bible Study App - Seed Data
-- ============================================================

-- ============================================================
-- BIBLE BOOKS (All 66 books)
-- ============================================================

INSERT INTO public.bible_books (id, name, abbreviation, testament, chapter_count, canonical_order) VALUES
-- Old Testament (39 books)
(1, 'Genesis', 'Gen', 'OT', 50, 1),
(2, 'Exodus', 'Exod', 'OT', 40, 2),
(3, 'Leviticus', 'Lev', 'OT', 27, 3),
(4, 'Numbers', 'Num', 'OT', 36, 4),
(5, 'Deuteronomy', 'Deut', 'OT', 34, 5),
(6, 'Joshua', 'Josh', 'OT', 24, 6),
(7, 'Judges', 'Judg', 'OT', 21, 7),
(8, 'Ruth', 'Ruth', 'OT', 4, 8),
(9, '1 Samuel', '1Sam', 'OT', 31, 9),
(10, '2 Samuel', '2Sam', 'OT', 24, 10),
(11, '1 Kings', '1Kgs', 'OT', 22, 11),
(12, '2 Kings', '2Kgs', 'OT', 25, 12),
(13, '1 Chronicles', '1Chr', 'OT', 29, 13),
(14, '2 Chronicles', '2Chr', 'OT', 36, 14),
(15, 'Ezra', 'Ezra', 'OT', 10, 15),
(16, 'Nehemiah', 'Neh', 'OT', 13, 16),
(17, 'Esther', 'Esth', 'OT', 10, 17),
(18, 'Job', 'Job', 'OT', 42, 18),
(19, 'Psalms', 'Ps', 'OT', 150, 19),
(20, 'Proverbs', 'Prov', 'OT', 31, 20),
(21, 'Ecclesiastes', 'Eccl', 'OT', 12, 21),
(22, 'Song of Solomon', 'Song', 'OT', 8, 22),
(23, 'Isaiah', 'Isa', 'OT', 66, 23),
(24, 'Jeremiah', 'Jer', 'OT', 52, 24),
(25, 'Lamentations', 'Lam', 'OT', 5, 25),
(26, 'Ezekiel', 'Ezek', 'OT', 48, 26),
(27, 'Daniel', 'Dan', 'OT', 12, 27),
(28, 'Hosea', 'Hos', 'OT', 14, 28),
(29, 'Joel', 'Joel', 'OT', 3, 29),
(30, 'Amos', 'Amos', 'OT', 9, 30),
(31, 'Obadiah', 'Obad', 'OT', 1, 31),
(32, 'Jonah', 'Jonah', 'OT', 4, 32),
(33, 'Micah', 'Mic', 'OT', 7, 33),
(34, 'Nahum', 'Nah', 'OT', 3, 34),
(35, 'Habakkuk', 'Hab', 'OT', 3, 35),
(36, 'Zephaniah', 'Zeph', 'OT', 3, 36),
(37, 'Haggai', 'Hag', 'OT', 2, 37),
(38, 'Zechariah', 'Zech', 'OT', 14, 38),
(39, 'Malachi', 'Mal', 'OT', 4, 39),

-- New Testament (27 books)
(40, 'Matthew', 'Matt', 'NT', 28, 40),
(41, 'Mark', 'Mark', 'NT', 16, 41),
(42, 'Luke', 'Luke', 'NT', 24, 42),
(43, 'John', 'John', 'NT', 21, 43),
(44, 'Acts', 'Acts', 'NT', 28, 44),
(45, 'Romans', 'Rom', 'NT', 16, 45),
(46, '1 Corinthians', '1Cor', 'NT', 16, 46),
(47, '2 Corinthians', '2Cor', 'NT', 13, 47),
(48, 'Galatians', 'Gal', 'NT', 6, 48),
(49, 'Ephesians', 'Eph', 'NT', 6, 49),
(50, 'Philippians', 'Phil', 'NT', 4, 50),
(51, 'Colossians', 'Col', 'NT', 4, 51),
(52, '1 Thessalonians', '1Thess', 'NT', 5, 52),
(53, '2 Thessalonians', '2Thess', 'NT', 3, 53),
(54, '1 Timothy', '1Tim', 'NT', 6, 54),
(55, '2 Timothy', '2Tim', 'NT', 4, 55),
(56, 'Titus', 'Titus', 'NT', 3, 56),
(57, 'Philemon', 'Phlm', 'NT', 1, 57),
(58, 'Hebrews', 'Heb', 'NT', 13, 58),
(59, 'James', 'Jas', 'NT', 5, 59),
(60, '1 Peter', '1Pet', 'NT', 5, 60),
(61, '2 Peter', '2Pet', 'NT', 3, 61),
(62, '1 John', '1John', 'NT', 5, 62),
(63, '2 John', '2John', 'NT', 1, 63),
(64, '3 John', '3John', 'NT', 1, 64),
(65, 'Jude', 'Jude', 'NT', 1, 65),
(66, 'Revelation', 'Rev', 'NT', 22, 66);

-- ============================================================
-- SAMPLE STRONG'S ENTRIES (Common words for testing)
-- ============================================================

INSERT INTO public.strongs_entries (strongs_number, language, original_word, transliteration, pronunciation, short_definition, long_definition, derivation, kjv_usage) VALUES
-- Greek entries
('G26', 'greek', 'ἀγάπη', 'agape', 'ag-ah''-pay', 'love', 'Love, i.e. affection or benevolence; specially (plural) a love-feast.', 'From G25', 'charity, dear, love'),
('G3056', 'greek', 'λόγος', 'logos', 'log''-os', 'word', 'Something said (including the thought); by implication a topic (subject of discourse), also reasoning (the mental faculty) or motive; by extension a computation.', 'From G3004', 'account, cause, communication, concerning, doctrine, fame, have to do, intent, matter, mouth, preaching, question, reason, reckon, remove, say(-ing), shew, speaker, speech, talk, thing, tidings, treatise, utterance, word, work'),
('G4102', 'greek', 'πίστις', 'pistis', 'pis''-tis', 'faith', 'Persuasion, i.e. credence; moral conviction (of religious truth, or the truthfulness of God or a religious teacher), especially reliance upon Christ for salvation.', 'From G3982', 'assurance, belief, believe, faith, fidelity'),
('G5485', 'greek', 'χάρις', 'charis', 'khar''-ece', 'grace', 'Graciousness (as gratifying), of manner or act; especially the divine influence upon the heart, and its reflection in the life.', 'From G5463', 'acceptable, benefit, favour, gift, grace(-ious), joy, liberality, pleasure, thank(-s, -worthy)'),
('G5547', 'greek', 'Χριστός', 'Christos', 'khris-tos''', 'Christ', 'Anointed, i.e. the Messiah, an epithet of Jesus.', 'From G5548', 'Christ'),
('G2316', 'greek', 'θεός', 'theos', 'theh''-os', 'God', 'A deity, especially the supreme Divinity; figuratively a magistrate; by Hebraism very.', 'Of uncertain affinity', 'exceeding, God, god(-ly, -ward)'),
('G2424', 'greek', 'Ἰησοῦς', 'Iesous', 'ee-ay-sooce''', 'Jesus', 'Jesus (i.e. Jehoshua), the name of our Lord and two (three) other Israelites.', 'Of Hebrew origin H3091', 'Jesus'),
('G4151', 'greek', 'πνεῦμα', 'pneuma', 'pnyoo''-mah', 'spirit', 'A current of air, i.e. breath (blast) or a breeze; by analogy or figuratively a spirit.', 'From G4154', 'ghost, life, spirit(-ual, -ually), mind'),
('G2222', 'greek', 'ζωή', 'zoe', 'dzo-ay''', 'life', 'Life (literally or figuratively).', 'From G2198', 'life(-time)'),
('G1680', 'greek', 'ἐλπίς', 'elpis', 'el-pece''', 'hope', 'Expectation (abstract or concrete) or confidence.', 'From G1679', 'faith, hope'),

-- Hebrew entries
('H430', 'hebrew', 'אֱלֹהִים', 'elohim', 'el-o-heem''', 'God', 'Gods in the ordinary sense; but specifically used (in the plural thus, especially with the article) of the supreme God.', 'Plural of H433', 'angels, exceeding, God (gods)(-dess, -ly), (very) great, judges, mighty'),
('H3068', 'hebrew', 'יְהֹוָה', 'Yehovah', 'yeh-ho-vaw''', 'LORD', 'The self-Existent or Eternal; Jehovah, Jewish national name of God.', 'From H1961', 'GOD, Jehovah, the Lord'),
('H1', 'hebrew', 'אָב', 'ab', 'awb', 'father', 'Father in a literal and immediate, or figurative and remote application.', 'A primitive word', 'chief, (fore-)father(-less), patrimony, principal'),
('H157', 'hebrew', 'אָהַב', 'ahab', 'aw-hab''', 'love', 'To have affection for (sexually or otherwise).', 'A primitive root', '(be-)love(-d, -ly, -r), like, friend'),
('H539', 'hebrew', 'אָמַן', 'aman', 'aw-man''', 'believe', 'Properly to build up or support; to foster as a parent or nurse; figuratively to render (or be) firm or faithful, to trust or believe.', 'A primitive root', 'hence assurance, believe, bring up, establish, fail, be faithful (of long continuance, stedfast, sure, surely, trusty, verified), nurse, (-ing father), (put), trust, turn to the right'),
('H7965', 'hebrew', 'שָׁלוֹם', 'shalom', 'shaw-lome''', 'peace', 'Safe, i.e. (figuratively) well, happy, friendly; also (abstractly) welfare, i.e. health, prosperity, peace.', 'From H7999', 'do, familiar, fare, favour, friend, greet, (good) health, perfect, such as be at, prosper(-ity, -ous), rest, safe(-ty), salute, welfare, (all is, be) well, wholly'),
('H1254', 'hebrew', 'בָּרָא', 'bara', 'baw-raw''', 'create', 'To create; (qualified) to cut down (a wood), select, feed (as formative processes).', 'A primitive root', 'choose, create (creator), cut down, dispatch, do, make (fat)'),
('H8034', 'hebrew', 'שֵׁם', 'shem', 'shame', 'name', 'An appellation, as a mark or memorial of individuality; by implication honor, authority, character.', 'A primitive word', 'base, (in-)fame(-ous), name(-d), renown, report'),
('H3045', 'hebrew', 'יָדַע', 'yada', 'yaw-dah''', 'know', 'To know (properly to ascertain by seeing); used in a great variety of senses.', 'A primitive root', 'acknowledge, acquaintance(-ted with), advise, answer, appoint, assuredly, be aware, (un-)awares, can(-not), certainly, comprehend, consider, could they, cunning, declare, be diligent, (can, cause to) discern, discover, endued with, familiar friend, famous, feel, can have, be (ig-)norant, instruct, kinsfolk, kinsman, (cause to, let, make) know, (come to give, have, take) knowledge, have (knowledge), (be, make, make to be, make self) known, be learned, lie by man, mark, perceive'),
('H3820', 'hebrew', 'לֵב', 'leb', 'labe', 'heart', 'The heart; also used (figuratively) very widely for the feelings, the will and even the intellect.', 'A form of H3824', 'care for, comfortably, consent, considered, courag(-eous), friend(-ly), (broken-, hard-, merry-, stiff-, stout-, double) heart(-ed), heed, I, kindly, midst, mind(-ed), regard(-ed), themselves, unawares, understanding, well, willingly, wisdom');
