const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const originalLoad = Module._load;
let records;
const model = {
  async create(data) { records.push({ _id: '1', ...data }); return records.at(-1); },
  find(query) { return { sort: async () => records.filter(b => b.createdBy === query.createdBy) }; },
  async findOne(query) { return records.find(b => b._id === query._id && b.createdBy === query.createdBy) || null; },
  async findOneAndUpdate(query, update) { const b = await this.findOne(query); if (b) Object.assign(b, update.$set); return b; },
  async findOneAndDelete(query) { const b = await this.findOne(query); if (b) records.splice(records.indexOf(b), 1); return b; }
};
Module._load = function(request, parent, isMain) { return request === '../models/Book' ? model : originalLoad.apply(this, arguments); };
const controller = require('../controllers/bookController');
Module._load = originalLoad;
async function call(method, user, body = {}) {
  const res = { code: 200, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } };
  await controller[method]({ user: { id: user }, params: { id: '1' }, body }, res, err => { throw err; });
  return res;
}
test('other users cannot read, update or delete a book', async () => {
  records = [{ _id: '1', createdBy: 'alice', title: 'Original' }];
  for (const method of ['getBookById', 'updateBook', 'deleteBook']) assert.equal((await call(method, 'bob', { title: 'Changed' })).code, 404);
  assert.equal(records[0].title, 'Original');
});
test('owner can update allowed fields but cannot change ownership', async () => {
  records = [{ _id: '1', createdBy: 'alice', title: 'Original' }];
  const res = await call('updateBook', 'alice', { title: 'New', createdBy: 'bob', unknown: 'x' });
  assert.equal(res.data.title, 'New'); assert.equal(res.data.createdBy, 'alice'); assert.equal(res.data.unknown, undefined);
  assert.equal((await call('getBookById', 'alice')).code, 200);
  assert.equal((await call('deleteBook', 'alice')).code, 200);
});
test('creation assigns ownership from authentication', async () => {
  records = [];
  const res = await call('createBook', 'alice', { title: 'Book', createdBy: 'bob' });
  assert.equal(res.code, 201); assert.equal(res.data.createdBy, 'alice');
});
