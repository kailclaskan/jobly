"use strict";

const request = require("supertest");

const db = require("../db.js");
const app = require("../app");

const {
    commonBeforeAll,
    commonBeforeEach,
    commonAfterEach,
    commonAfterAll,
    u1Token,
  } = require("./_testCommon");
  
  beforeAll(commonBeforeAll);
  beforeEach(commonBeforeEach);
  afterEach(commonAfterEach);
  afterAll(commonAfterAll);

/** POST /jobs **/
describe("POST /jobs", () => {
    const newJob = {
        title: "j4",
        salary: 2504585,
        equity: 0.6,
        company_handle: "c2"
    }

    test("can add new job", async () => {
        const resp = await request(app)
            .post("/jobs")
            .send(newJob)
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.body).toEqual({ job: {
            title: "j4",
            salary: 2504585,
            equity: "0.6",
            companyHandle: "c2"
        }});
        
    });

    test("bad request with missing data", async() => {

        const resp = await request(app)
            .post("/jobs")
            .send({
                title: "failed test",
                companyHandle: "c2"
            })
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(400);
    });

    test("bad request with invalid data", async () => {
        const resp = await request(app)
            .post("/jobs")
            .send({
                ...newJob,
                googly: "boogly",
            })
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(400);
    });
});

/** GET /jobs **/
describe("GET /jobs", () => {
    test("can pull all jobs regardless if you're logged in.", async () => {
        const resp = await request(app).get("/jobs");
        expect(resp.body).toEqual({
            jobs: [{
                title: "j1",
                salary: 20000,
                equity: "0.1",
                companyName: "C1",
                numEmployees: 1
            },
            {
                title: "j2",
                salary: 500000,
                equity: "0.1",
                companyName: "C3",
                numEmployees: 3
            },
            {
                title: "j3",
                salary: 205000,
                equity: "0.1",
                companyName: "C3",
                numEmployees: 3    
        }]});
    });
});

/** GET /jobs?(title, minSalary, hasEquity) **/
describe("GET /jobs?(title, minSalary, hasEquity", () => {
    test("works for 'title' filter", async () =>{
        const resp = await request(app).get(`/jobs?title=j`);
        expect(resp.body).toEqual({"jobs": [{
            id: expect.any(Number),
            title: "j1",
            salary: 20000,
            equity: "0.1",
            companyName: "C1",
            numEmployees: 1
        },
        {
            id: expect.any(Number),
            title: "j2",
            salary: 500000,
            equity: "0.1",
            companyName: "C3",
            numEmployees: 3
        },
        {
            id: expect.any(Number),
            title: "j3",
            salary: 205000,
            equity: "0.1",
            companyName: "C3",
            numEmployees: 3
        }]});
    });

    test("works for minSalary", async () => {
        const resp = await request(app).get(`/jobs?minSalary=250000`);
        expect(resp.body).toEqual({"jobs": [{
                id: expect.any(Number),
                title: "j2",
                salary: 500000,
                equity: "0.1",
                companyName: "C3",
                numEmployees: 3
        }]});
    });

    test("works for hasEquity", async () => {
        const resp = await request(app).get(`/jobs?hasEquity=true`);
        expect(resp.body).toEqual({"jobs": [{
            id: expect.any(Number),
            title: "j1",
            salary: 20000,
            equity: "0.1",
            companyName: "C1",
            numEmployees: 1
        },
        {
            id: expect.any(Number),
            title: "j2",
            salary: 500000,
            equity: "0.1",
            companyName: "C3",
            numEmployees: 3
        },
        {
            id: expect.any(Number),
            title: "j3",
            salary: 205000,
            equity: "0.1",
            companyName: "C3",
            numEmployees: 3
        }]});
    });

    test("Errors on keys other than title, minSalary, hasEquity", async() => {
        const resp = await request(app).get(`/jobs?taco=heckyeah`);
        expect(resp.statusCode).toEqual(400);
    });
});

/** GET /jobs/:id **/
describe("GET /jobs/:id", () => {
    test("works for anon user", async () => {
        const select = await db.query(`
            SELECT id
            FROM jobs
            WHERE title = 'j1'
        `);
        let id = select.rows[0].id;
        const resp = await request(app).get(`/jobs/${id}`);
        expect(resp.body).toEqual({
            job:{
                id: expect.any(Number),
                title: 'j1',
                salary: 20000,
                equity: "0.1",
                companyName: "C1",
                companyDescription: "Desc1",
                numEmployees: 1
            },
        });
    });

    test("not found for no such job", async () => {
        const resp = await request(app).get(`/jobs/10`);
        expect(resp.statusCode).toEqual(404);
    });
});

/** PATCH /jobs/:id **/
describe("PATCH /jobs/:id", () => {
    test("works for admin users", async () => {
        const select = await db.query(`
            SELECT id
            FROM jobs
            WHERE title = 'j1'
        `);
        let id = select.rows[0].id;
        const resp = await request(app)
            .patch(`/jobs/${id}`)
            .send({
                title: "J1 - NEW"
            })
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.body).toEqual({
            job: {
                id: expect.any(Number),
                title: "J1 - NEW",
                salary: 20000,
                equity: "0.1",
                companyHandle: "c1"
            },
        });
    });

    test("unauth for anon", async () => {
        const select = await db.query(`
            SELECT id
            FROM jobs
            WHERE title = 'j1'
        `);
        let id = select.rows[0].id;
        const resp = await request(app)
            .patch(`/jobs/${id}`)
            .send({
                title: "J1 - ANONYMOUS"
            });
        expect(resp.statusCode).toEqual(401);
    });

    test("not found on no such job", async () => {
        const resp = await request(app)
            .patch(`/jobs/5`)
            .send({
                title: "J5 - Doesn't Exist"
            })
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(404);
    });

    test("bad request on id change attempt", async() => {
        const select = await db.query(`
            SELECT id
            FROM jobs
            WHERE title = 'j1'
        `);
        let id = select.rows[0].id;
        const resp = await request(app)
            .patch(`/jobs/${id}`)
            .send({
                id: 5555
            })
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(400);
    });

    test("bad request, or invalid data", async() => {
        const select = await db.query(`
            SELECT id
            FROM jobs
            WHERE title = 'j1'
        `);
        let id = select.rows[0].id;
        const resp = await request(app)
            .patch(`/jobs/${id}`)
            .send({
                salary: "too-much-too-little"
            })
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(400);
    });
});

/** DELETE /jobs/:id **/
describe("DELETE /jobs/:id", () => {
    test("works for admin users", async () => {
        const select = await db.query(`
            SELECT id
            FROM jobs
            WHERE title = 'j1'
        `);
        const id = select.rows[0].id;
        const resp = await request(app)
            .delete(`/jobs/${id}`)
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.body).toEqual({ deleted: `${id}` });
    });

    test("unauth for anon", async () => {
        const select = await db.query(`
            SELECT id
            FROM jobs
            WHERE title = 'j1'
        `);
        const id = select.rows[0].id;
        const resp = await request(app)
            .delete(`/jobs/${id}`);
        expect(resp.statusCode).toEqual(401);
    });

    test("not found for no such job", async () => {
        const resp = await request(app)
            .delete(`/jobs/5`)
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(404);
    });
});