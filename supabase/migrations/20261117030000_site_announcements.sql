CREATE TABLE public.site_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120),
  message text NOT NULL CHECK (char_length(message) BETWEEN 3 AND 1200),
  published boolean NOT NULL DEFAULT false,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);
ALTER TABLE public.site_announcements ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.site_announcements TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_announcements TO authenticated;
CREATE POLICY "Customers read published active announcements" ON public.site_announcements
  FOR SELECT TO authenticated USING (
    (published AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at > now()))
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "Admins create announcements" ON public.site_announcements
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());
CREATE POLICY "Admins update announcements" ON public.site_announcements
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete announcements" ON public.site_announcements
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
