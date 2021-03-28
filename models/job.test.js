"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./job.js");
const {
    commonBeforeAll,
    commonBeforeEach,
    commonAfterEach,
    commonAfterAll    
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/** Create **/
/** Model **/
describe("create", () => {
    const newJob = {
        title: "New Job",
        salary: 500000,
        equity: 0.5,
        company_handle: "c3"
    };

    test("add job to db", async () => {
        let job = await Job.create(newJob);
        expect(job).toEqual({
            title: "New Job",
            salary: 500000,
            equity: "0.5",
            companyHandle: "c3"
        });

        const result = await db.query(`
            SELECT id, title, salary, equity, company_handle AS "companyHandle"
            FROM jobs
            WHERE title = 'New Job'
        `);
        expect(result.rows).toEqual([{
            id: expect.any(Number),
            title: "New Job",
            salary: 500000,
            equity: "0.5",
            companyHandle: "c3"
        }]);
    });
});

/** findAll **/
describe("findAll jobs", () => {
    test("works: no filter", async() => {
        let jobs = await Job.findAll();
        expect(jobs).toEqual([
            {
                title: 'j1',
                salary: 20000,
                equity: "0.1",
                companyName: 'C1',
                numEmployees: 1
            },
            {
                title: 'j2',
                salary: 500000,
                equity: "0.1",
                companyName: 'C3',
                numEmployees: 3
            },
            {
                title: 'j3',
                salary: 205000,
                equity: "0.1",
                companyName: 'C3',
                numEmployees: 3
            },
        ]);
    });
});

/** get **/
describe("get id", () => {
    test("works with id", async()=>{
        let find = await db.query(`
            SELECT id
            FROM jobs
            WHERE title = 'j2'
        `);
        let { id } = find.rows[0]

        let job = await Job.get(id);
        expect(job).toEqual({
            id: id,
            title: 'j2',
            salary: 500000,
            equity: "0.1",
            companyName: 'C3',
            companyDescription: "Desc3",
            numEmployees: 3
        });
    });

    test("no such id", async() => {
        try{
            await Job.get("5");
            fail();
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
});

/** update **/
describe("update", () => {
    const updateData = {
        title: "Updated Job",
        salary: 60000,
        equity: 0.75,
        companyHandle: "c2"
    };

    test("Updates the job title, salary, equity, handle", async() => {
        let find = await db.query(`
            SELECT id
            FROM jobs
            WHERE title = 'j2'
        `);
        let { id } = find.rows[0];

        let job = await Job.update(id,updateData);
        expect(job).toEqual({
            id: id,        
            title: "Updated Job",
            salary: 60000,
            equity: "0.75",
            companyHandle: "c2"
        });

        const result = await db.query(`
            SELECT id, title, salary, equity, company_handle AS "companyHandle"
            FROM jobs
            WHERE id = $1
        `, [id]);
        expect(result.rows).toEqual([{
            id: id,
            title: "Updated Job",
            salary: 60000,
            equity: "0.75",
            companyHandle: "c2"
        }]);
    });

    test("works with NULL fields", async() => {
        let find = await db.query(`
            SELECT id
            FROM jobs
            WHERE title = 'j2'
        `);
        let { id } = find.rows[0];

        const updateDataSetNulls = {
            title: "Null Job",
            salary: null,
            equity: 0.1,
            companyHandle: "c2"
        };

        let job = await Job.update(id, updateDataSetNulls);
        expect(job).toEqual({
            id: id,
            title: "Null Job",
            salary: null,
            equity: "0.1",
            companyHandle: "c2"
        });

        const result = await db.query(
            `
            SELECT id, title, salary, equity, company_handle AS "companyHandle"
            FROM jobs
            WHERE id = $1
            `,[id]);
        expect(result.rows).toEqual([{
            id: id,
            title: "Null Job",
            salary: null,
            equity: "0.1",
            companyHandle: "c2"
        }]);
    });

    test("not removed if no id exists", async() => {
        try{
            await Job.update(5, updateData);
            fail();
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });

    test("bad request with no data", async () => {
        try{
            await Job.update(4, {});
            fail();
        } catch (err){
            expect(err instanceof BadRequestError).toBeTruthy();
        }
    });
});

/** remove **/
describe("remove", () =>{
    test("works with correct id", async()=>{
        let find = await db.query(`
            SELECT id
            FROM jobs
            WHERE title = 'j1'
        `);
        let { id } = find.rows[0];

        await Job.remove(id);
        const res = await db.query(
            `SELECT id FROM jobs WHERE id = $1`,
        [id]);
        expect(res.rows.length).toEqual(0);
    });

    test ("not found if no such job", async () => {
        try {
            await Job.remove(5);
            fail();
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
});