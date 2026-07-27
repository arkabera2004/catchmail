import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { syncTasksToCalendar } from '../services/calendar.js';

const router = Router();
router.use(requireAuth);

// Adds every open task to the user's primary Google Calendar in one shot.
router.post('/sync', async (req, res) => {
  try {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.session.userId)
      .maybeSingle();
    if (userError) return res.status(500).json({ error: userError.message });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'open')
      .order('deadline', { ascending: true, nullsFirst: false });
    if (tasksError) return res.status(500).json({ error: tasksError.message });

    if (!tasks || tasks.length === 0) {
      return res.json({ created: 0, skipped: 0 });
    }

    const result = await syncTasksToCalendar(user, tasks);
    res.json(result);
  } catch (err) {
    console.error('[calendar] sync failed:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
