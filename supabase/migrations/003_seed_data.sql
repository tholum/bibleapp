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
