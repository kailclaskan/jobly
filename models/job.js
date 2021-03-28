"use strickt";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related Functions for jobs. **/

class Job{
    /** Create a job
     * 
     * Allows a user to create a job.
     * 
     * data should include {title, salary, equity, company_handle}
     * 
     * RETURNS {title, salary, equity, companyHandle}
     *  
    **/
    static async create({title, salary, equity, company_handle}){
        try{
            const result = await db.query(`
                INSERT INTO jobs (title, salary, equity, company_handle)
                VALUES ($1, $2, $3, $4)
                RETURNING title, salary, equity, company_handle AS "companyHandle"
            `, [title, salary, equity, company_handle]);

            const job = result.rows[0];
        
            return job;
        } catch (err){
            return next(err)
        }
    }

    /**Find all jobs
     * 
     * Returns [{title, salary, equity, companyName, numEmployees}, ...]
    **/
    static async findAll(){
        const jobs = await db.query(`
            SELECT j.title, j.salary, j.equity, c.name AS "companyName", c.num_employees AS "numEmployees"
            FROM jobs AS j
            LEFT JOIN companies AS c ON j.company_handle=c.handle
            ORDER BY title
        `);
        return jobs.rows;
    }

    /**
    * Find Jobs based on filters consisting of 'title', 'minSalary', 'hasEquity'.
    * 
    * Will return [{id, title, salary, equity, companyName, numEmployees}]
    * 
    * A user is able to select one filter: title, minSalary, or hasEquity and 
    * can find jobs from there.
    * 
    * If they don't use the correct filter, or input an bad one it returns a 
    * 400. IF the query returns NO results, then it also returns a 400 status code. 
    * 
    * IF a user attempts to add more than one key they will receive a 400.
    * 
    **/
    static async filteredJob(key, value){
        const select = `
            SELECT j.id, j.title, j.salary, j.equity, c.name AS "companyName", c.num_employees AS "numEmployees"
            FROM jobs AS j 
            LEFT JOIN companies AS c ON j.company_handle=c.handle
            `;
        let where;
        let val;
        let filteredCo;
        if(key.length === 1){
            if(key[0] === "title"){
                val = `${value[0]}%`
                where = `WHERE title LIKE $1`
            }
            else if(key[0] === "minSalary"){
                val = value[0]
                where = `WHERE salary >= $1
                         ORDER BY salary DESC`
            }
            else if(key[0] === "hasEquity"){
                if(value[0] === "true"){
                    val = 0;
                    where = `WHERE equity > $1
                             ORDER BY equity DESC`
                }
                else if(value[0] === "false" || value[0] === ""){
                    val = 0;
                    where = `WHERE equity = $1`
                }
            }
            else{ throw new BadRequestError(`Query parameter must include title, minSalary, or hasEquity. Please make adjustments and try again.`)}
            filteredCo = await db.query(`${select} ${where}`, [val]);
            if(filteredCo.rows.length <= 0){throw new BadRequestError(`Query returned no results. Please try again.`);}
            return filteredCo.rows;
        }
        else {
            throw new BadRequestError(`Too many query parameters, please update.`);
        }
    }

    /**Find specific job 
    * 
    * Returns {id, title, salary, equity, company}
    *   company should return like {handle, name, description, numEmployees, logoUrl}
    *
    * Throws NotFoundError if not found
    *  
    **/
   static async get(id){
        const res = await db.query(`
            SELECT j.id, j.title, j.salary, j.equity, c.name AS "companyName", c.description AS "companyDescription", c.num_employees AS "numEmployees"
            FROM jobs AS j
            FULL OUTER JOIN companies AS c
            ON j.company_handle = c.handle
            WHERE j.id = $1
        `, [id]);
        const job = res.rows[0];

        if(!job) throw new NotFoundError(`No Job with id of ${id}`);

        return job;
   }

    /** Update a job.
    * 
    * This will use the sqlPartialUpdate function and won't require all fields be updated. 
    * 
    * Does not allow the change of the jobs ID or Company associated with it.
    * 
    * Data can include title, salary and equity.
    * 
    * Returns {id, title, salary, equity, companyHandle}
    * 
    * Throws not found error IF it's not found.
    *  
    **/
    static async update(id,data){
        const { setCols, values } = sqlForPartialUpdate(data, 
            {
                companyHandle: "company_handle"
            });
        // if(setCols.includes("id") || setCols.includes("company_handle")) throw new BadRequestError(`Cannot change job id or company. Please change your request.`);
        const handleVarIdx = "$" + (values.length + 1);

        const querySql = `UPDATE jobs
                          SET ${setCols}
                          WHERE id = ${handleVarIdx}
                          RETURNING id, title, salary, equity, company_handle AS "companyHandle"`;
        
        const result = await db.query(querySql, [...values, id]);
        const job = result.rows[0];

        if (!job) throw new NotFoundError(`No job with id of ${id}`);

        return job;
    }

    /** Remove a job
    * 
    * Throws NotFoundError if job not found
    * 
    **/
    static async remove(id){
        const result = await db.query(`
            DELETE
            FROM jobs
            WHERE id = $1
            RETURNING id
        `, [id]);
        const job = result.rows[0];

        if (!job) throw new NotFoundError(`No job with id of ${id}`);
    }
}

module.exports = Job;