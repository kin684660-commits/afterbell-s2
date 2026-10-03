import {test} from "node:test";
import assert from "node:assert/strict";
import {demoAccess,reserveResearch} from "../lib/access";
import {save,get,recent} from "../lib/store";
process.env.AFTERBELL_DATABASE_PATH=`data/test-access-${process.pid}.sqlite`;
test("public signed sessions reject tampering and isolate saved research",t=>{
  process.env.AFTERBELL_PUBLIC_DEMO="1";process.env.AFTERBELL_SESSION_SECRET="unit-test-secret-that-is-long-enough";
  t.after(()=>{delete process.env.AFTERBELL_PUBLIC_DEMO;delete process.env.AFTERBELL_SESSION_SECRET;});
  const a=demoAccess(new Request("https://demo.example/api/research"));
  const cookie=a.headers["Set-Cookie"].split(";")[0];
  assert.match(a.headers["Set-Cookie"],/HttpOnly.*SameSite=Lax.*Secure/);
  assert.equal(demoAccess(new Request("https://demo.example",{headers:{cookie}})).owner,a.owner);
  assert.notEqual(demoAccess(new Request("https://demo.example",{headers:{cookie:cookie+"f"}})).owner,a.owner);
  const b=demoAccess(new Request("https://demo.example"));
  const run:any={id:"private-fixture",createdAt:new Date().toISOString(),input:{symbol:"NVDA",question:"test private",mode:"live"},status:"complete"};
  save(run,a.owner);assert.ok(get(run.id,a.owner));assert.equal(get(run.id,b.owner),null);assert.equal(get(run.id),null);assert.equal(recent(b.owner).length,0);
});
test("public model admission limits concurrency and repeated requests",t=>{
  process.env.AFTERBELL_PUBLIC_DEMO="1";t.after(()=>delete process.env.AFTERBELL_PUBLIC_DEMO);
  const a=reserveResearch("a"),b=reserveResearch("b");assert.equal(a.error,null);assert.equal(b.error,null);assert.ok(reserveResearch("c").error);a.release();assert.ok(reserveResearch("a").error);b.release();assert.equal(reserveResearch("c").error,null);
});
