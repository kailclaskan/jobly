"use strict";

/** Routes for jobs **/

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureLoggedIn, ensureAdmin } = require("../middleware/auth");
const Job = require("../models/job");

const jobNewSchema = require("../schemas/jobNew.json");
const jobUpdateSchema = require("../schemas/jobUpdate.json");
const { route } = require("./users");

const router = new express.Router();

/** POST /{ job } => {job}
* 
* job should be {title, salary, equity, company_handle}
* 
* Returns {id, title, salary, equity, company_handle}
* 
* Authorization required: login and admin rights.
* 
**/
router.post("/", ensureAdmin, async(req, res, next) => {
    try{
        const validator = jsonschema.validate(req.body, jobNewSchema);
        if(!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }

        const job = await Job.create(req.body);
        return res.status(201).json({ job });
    }catch (err){
        return next(err);
    }
});

/** GET / =>
* {jobs: [{id, title, salary, equity, companyName, numEmployees}]}
* 
* Can filter based on select search filters.
* -title
* -minSalary
* -hasEquity
* 
* Authorization required: none
*
**/
router.get("/", async (req, res, next) => {
    try{
        let keys = Object.keys(req.query);
        let values = Object.values(req.query);
        let jobs;
        if(keys.length > 0){
            jobs = await Job.filteredJob(keys, values);
        }else{
            jobs = await Job.findAll();
        }
        return res.json({ jobs });
    }catch(err){
        return next(err);
    }
});

/** GET /:id => { job } 
* Job is {id, title, salary, equity, company}
*     Company should return like  {handle, name, description, numEmployees, logoUrl}
* 
* Throws NotFoundError if not found.
* 
* Authorization required: None
**/
router.get("/:id", async (req, res, next) => {
    try{
        const job = await Job.get(req.params.id);
        return res.json({job});
    }catch(err){
        return next(err);
    }
});

/** PATCH /[id] { fld1, fld2, ...} => { Job } 
* 
* Patches Job data.
* 
* fields can be: { title, salary, equity }
* 
* Returns { id, title, salary, equity, companyHandle }
* 
* Authorization required: login
* 
**/
router.patch("/:id", ensureAdmin, async (req,res,next) => {
    try{
        const validator = jsonschema.validate(req.body, jobUpdateSchema);
        if(!validator.valid){
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }

        const job = await Job.update(req.params.id, req.body);
        return res.json({ job });
    }catch(err){
        return next(err);
    }
});

/** DELETE /:id => {deleted: id}
* 
* Authorization: login
**/
router.delete("/:id", ensureAdmin, async (req,res,next) => {
    try{
        await Job.remove(req.params.id);
        return res.json({ deleted: req.params.id });
    }catch(err){
        return next(err);
    }
});

module.exports = router;