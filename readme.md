# Jobly Backend

This is the Express backend for Jobly, version 2.

To run this:

    node server.js
    
To run the tests:

    jest -i

To create a user:

    Pass username, password, firstName, lastName, email to auth/register in a post request.

To login as a user:

    Pass username, password to auth/token in a post request.

#### sqlForPartialUpdate

Updates user or company data. setCols updates column names to keys for key/value pairing. values sets the data to be assigned to the keys set by setCols using parameterized variables and then defines each value. Only changes data that is given to the update methods.

* Assigned to: 
* * company.js
* * user.js

#### filteredCompany

Filters all companies by certain criteria. Either the filter will sort companies by **name**, **minEmployees**, or **maxEmployees**. You may also filter companies by **minEmployees** and **maxEmployees**. Anything outside of **name**, **minEmployees** and **maxEmployees** will result in an error. When specifying **minEmployees** and **maxEmployees** please query this way **/companies?minEmployees=x&maxEmployees=x**. **name** is case sensitive so be sure you start with a capital. Can also query all three keys. The query **must** start with the **name** parameter followed by either **minEmployees**, or **maxEmployees**. Any queries that don't meet these parameters will result in a 400 error. 