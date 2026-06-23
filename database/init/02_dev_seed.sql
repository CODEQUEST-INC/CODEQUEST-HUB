-- Seed data for local development and demo day.
-- Run automatically by docker-entrypoint-initdb.d on first container creation (see database/README.md).
--
-- All seeded users share the password: password123
-- (hashed below with bcrypt, 10 rounds — same hash reused for all four users is fine for dev/demo data)

INSERT INTO cohorts (id, name, year, is_active) VALUES
  ('00000000-0000-0000-0000-000000000001', 'CodeQuest 2026', 2026, true);

INSERT INTO users (id, full_name, email, password_hash, role, student_id, index_number) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Arhin Prince Owusu', 'arhin@knust.edu.gh', '$2a$10$v5BpvOfKb8GReT8VsJNmheu.tLSUOKSJBKSyqqBfJeFDYOC3aaf5e', 'student', '21166887', '6143424'),
  ('10000000-0000-0000-0000-000000000002', 'Jeremy Sefa Brobbey', 'jeremy@knust.edu.gh', '$2a$10$v5BpvOfKb8GReT8VsJNmheu.tLSUOKSJBKSyqqBfJeFDYOC3aaf5e', 'student', '21166316', '6152224'),
  ('10000000-0000-0000-0000-000000000003', 'Dr. Ama Boateng', 'ama.boateng@knust.edu.gh', '$2a$10$v5BpvOfKb8GReT8VsJNmheu.tLSUOKSJBKSyqqBfJeFDYOC3aaf5e', 'supervisor', NULL, NULL),
  ('10000000-0000-0000-0000-000000000004', 'System Admin', 'admin@knust.edu.gh', '$2a$10$v5BpvOfKb8GReT8VsJNmheu.tLSUOKSJBKSyqqBfJeFDYOC3aaf5e', 'admin', NULL, NULL);

INSERT INTO groups (id, cohort_id, group_number, name, supervisor_id) VALUES
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 129, 'Group 129', '10000000-0000-0000-0000-000000000003');

INSERT INTO group_members (group_id, user_id) VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002');
