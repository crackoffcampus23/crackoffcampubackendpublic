function sanitizeTimestamps(row) {
  if (!row) return row;
  const o = { ...row };
  return o;
}

function makeController(model, idField, exposeMap) {
  const sanitize = (r) => {
    if (!r) return null;
    const o = {};
    for (const [apiKey, dbKey] of Object.entries(exposeMap)) {
      o[apiKey] = r[dbKey];
    }
    o.createdAt = r.created_at;
    o.updatedAt = r.updated_at;
    return sanitizeTimestamps(o);
  };

  return {
    add: async (req, res) => {
      try {
        const created = await model.create(req.body || {});
        const item = sanitize(created);
        res.status(201).json({ [idField]: item[idField], item });
      } catch (e) {
        console.error('add error', e);
        res.status(500).json({ error: 'Internal server error' });
      }
    },
    getAll: async (_req, res) => {
      try {
        const rows = await model.list();
        res.json({ items: rows.map(sanitize) });
      } catch (e) {
        console.error('getAll error', e);
        res.status(500).json({ error: 'Internal server error' });
      }
    },
    getOne: async (req, res) => {
      try {
        const id = req.params[idField];
        const row = await model.get(id);
        if (!row) return res.status(404).json({ error: 'Not found' });
        res.json({ item: sanitize(row) });
      } catch (e) {
        console.error('getOne error', e);
        res.status(500).json({ error: 'Internal server error' });
      }
    },
    update: async (req, res) => {
      try {
        const id = req.params[idField];
        const updated = await model.update(id, req.body || {});
        res.json({ item: sanitize(updated) });
      } catch (e) {
        console.error('update error', e);
        res.status(500).json({ error: 'Internal server error' });
      }
    },
    remove: async (req, res) => {
      try {
        const id = req.params[idField];
        await model.remove(id);
        res.json({ success: true });
      } catch (e) {
        console.error('remove error', e);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };
}

module.exports = { makeController };
