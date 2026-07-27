import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', req.session.userId)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ tasks: data });
});

router.patch('/:id', async (req, res) => {
  const { deadline, status } = req.body;
  const updates = {};
  if (deadline !== undefined) updates.deadline = deadline;
  if (status !== undefined) {
    if (!['open', 'done'].includes(status)) {
      return res.status(400).json({ error: 'status must be "open" or "done"' });
    }
    updates.status = status;
  }
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', req.params.id)
    .eq('user_id', req.session.userId)
    .select()
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Task not found' });
  res.json({ task: data });
});

router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.session.userId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

export default router;
