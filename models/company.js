"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(
          `SELECT handle
           FROM companies
           WHERE handle = $1`,
        [handle]);

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
          `INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
        [
          handle,
          name,
          description,
          numEmployees,
          logoUrl,
        ],
    );
    const company = result.rows[0];

    return company;
  }

  /** Find all companies.
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */

  static async findAll() {
    const companiesRes = await db.query(
          `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           ORDER BY name`);
    return companiesRes.rows;
  }

  /*
    Find companies based on filters consisting of 'name', minEmployees, and maxEmployees.

    Will return [{ handle, name, description, numEmployees, logoUrl }, ...] for each company.

    Notes:
    *Reduced the usage of the select statement by assigning it to a variable.
    *Depending on the filter that was placed in the query the where statement, and the val variable were changed.
    *The query was then put together with a string literal and the values were assigned where they needed to be.
    *If the filter key wasn't one of the approved filters, it throws an error.
    *If min is greater than max, it throws an error.
    *When querying with all three parameters, it throws an error IF you don't start the query with 'name'.
    **minEmployees and maxEmployees are interchangeable.
  */

  static async filteredCompany(key, value){
    const select = `SELECT handle,name,description,num_employees AS "numEmployees",logo_url AS "logoUrl" FROM companies`;
    let where;
    let val;
    let filteredCo;
    if(key.length === 1){
      if(key[0] === "name"){
        val = `${value[0]}%`;
        where = `WHERE name LIKE $1`;
      } else if (key[0] === "minEmployees"){
        val = value[0]
        where = `WHERE num_employees >= $1`
      }else if( key[0] === "maxEmployees"){
        val = value[0]
        where = `WHERE num_employees <= $1`
      }else{ throw new BadRequestError(`Query parameter must include name, minEmployees, or maxEmployees, please adjust your query.`); }
      filteredCo = await db.query(`${select} ${where}`, [val]);
      return filteredCo.rows;
    } else if(key.length === 2){
      if(key[0] === "minEmployees" && key[1] === "maxEmployees"  && value[1] > value[0]){
        where = `WHERE num_employees >= $1 AND num_employees <= $2`;
      } 
      else if(key[1] === "minEmployees" && key[0] === "maxEmployees" && value[0] > value[1]){
        where = `WHERE num_employees >= $2 AND num_employees <= $1`;
      } else { throw new BadRequestError(`minEmployees must be less than maxEmployees.`); }
      filteredCo = await db.query(`${select} ${where}`, [value[0], value[1]]);
      return filteredCo.rows;
    } else if(key.length === 3){
      if(key[0] === 'name'){
        val = `${value[0]}%`;
        if(key[1] === "minEmployees" && key[2] === "maxEmployees" && value[2] > value[1]){
          where = `WHERE name LIKE $1 AND num_employees >= $2 AND num_employees <= $3`;
        } 
        else if(key[2] === "minEmployees" && key[1] === "maxEmployees"  && value[1] > value[2]){
            where = `WHERE name LIKE $1 AND num_employees >= $3 AND num_employees <= $2`;
        }else { throw new BadRequestError(`minEmployees must be less than maxEmployees.`); }
      }else { throw new BadRequestError(`Query must start with name.`); }
      filteredCo = await db.query(`${select} ${where}`, [val, value[1], value[2]]);
      return filteredCo.rows;
    } else{
      throw new BadRequestError(`Query parameters need to be updated.`);
    }
  }

  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...] (Part 5)
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    const companyRes = await db.query(
          `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           WHERE handle = $1`,
        [handle]);
    const jobRes = await db.query(
      `
        SELECT id, title, salary, equity
        FROM jobs
        WHERE company_handle = $1
      `, [handle]
    );

    const company = companyRes.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
    
    company.jobs = jobRes.rows;

    return company;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(
        data,
        {
          numEmployees: "num_employees",
          logoUrl: "logo_url",
        });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE companies 
                      SET ${setCols} 
                      WHERE handle = ${handleVarIdx} 
                      RETURNING handle, 
                                name, 
                                description, 
                                num_employees AS "numEmployees", 
                                logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(
          `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
        [handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }
}


module.exports = Company;
