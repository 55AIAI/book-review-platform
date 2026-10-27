const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");

function loadController(model) {
  const original = Module._load;
  try {
    Module._load = function(request, parent, isMain) {
      if (request === "../models/Book" && parent?.filename?.endsWith("bookController.js")) return model;
      return original.apply(this, arguments);
    };
    delete require.cache[require.resolve("../controllers/bookController")];
    return require("../controllers/bookController");
  } finally {
    Module._load = original;
  }
}

function response() {
  return {
    code: 200, body: null,
    status(n) { this.code = n; return this; },
    json(data) { this.body = data; return this; }
  };
}

test("read is always scoped to the authenticated owner", async () => {
  let filter;
  const controller = loadController({findOne: async q => { filter = q; return null; }});
  const res = response();
  await controller.getBookById({ params: {id:"book1"}, user:{id:"alice"} }, res, err=>{throw err});
  assert.deepEqual(filter, {_id:"book1", createdBy:"alice"});
  assert.equal(res.code,404);
});

test("update filters owner and discards ownership and operator injection", async () => {
  let filter, update, options;
  const controller = loadController({
    findOneAndUpdate: async (f,u,o)=>{filter=f;update=u;options=o;return {title:"Safe"};}
  });
  const res=response();
  await controller.updateBook({
    params:{id:"book1"}, user:{id:"alice"},
    body:{title:"Safe",createdBy:"attacker", $set:{createdBy:"attacker"},externalId:"rewrite"}
  },res,err=>{throw err});
  assert.deepEqual(filter,{_id:"book1",createdBy:"alice"});
  assert.deepEqual(update,{$set:{title:"Safe"}});
  assert.equal(options.runValidators,true);
});

test("create always assigns the JWT owner and ignores client ownership", async () => {
  let payload;
  const controller=loadController({create:async p=>{payload=p;return p;}});
  const res=response();
  await controller.createBook({user:{id:"alice"},body:{title:"Example",createdBy:"attacker"}},res,err=>{throw err});
  assert.equal(payload.createdBy,"alice");
  assert.equal(res.code,201);
});

test("delete uses owner-scoped atomic query", async () => {
  let filter;
  const controller=loadController({findOneAndDelete:async q=>{filter=q;return null;}});
  const res=response();
  await controller.deleteBook({params:{id:"book1"},user:{id:"alice"}},res,err=>{throw err});
  assert.deepEqual(filter,{_id:"book1",createdBy:"alice"});
  assert.equal(res.code,404);
});
