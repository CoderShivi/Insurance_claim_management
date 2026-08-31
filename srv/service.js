const cds = require("@sap/cds");

module.exports = cds.service.impl(async function () {

    const {
        Customers,
        ClaimTypes,
        Employees
    } = this.entities;


<<<<<<< HEAD
=======
    // =====================================================
    // CUSTOMERS
    // =====================================================

>>>>>>> main
    // Check duplicate customer number
    this.before("CREATE", Customers, async (req) => {

        const { customerNumber } = req.data;

        const existingCustomer = await SELECT.one
            .from(Customers)
            .where({ customerNumber });

        if (existingCustomer) {
            req.error(
                409,
                "Customer number already exists"
            );
        }
    });

<<<<<<< HEAD
=======

    // =====================================================
    // CLAIM TYPES
    // =====================================================

>>>>>>> main
    // Check duplicate claim type code
    this.before("CREATE", ClaimTypes, async (req) => {

        const { code } = req.data;

        const existingClaimType = await SELECT.one
            .from(ClaimTypes)
            .where({ code });

        if (existingClaimType) {
            req.error(
                409,
                "Claim type code already exists"
            );
        }
    });


<<<<<<< HEAD
=======
    // =====================================================
    // EMPLOYEES
    // =====================================================

>>>>>>> main
    // Check duplicate employee number
    this.before("CREATE", Employees, async (req) => {

        const { employeeNumber } = req.data;

        const existingEmployee = await SELECT.one
            .from(Employees)
            .where({ employeeNumber });

        if (existingEmployee) {
            req.error(
                409,
                "Employee number already exists"
            );
        }
    });


    // Check duplicate employee number during update
    this.before("UPDATE", Employees, async (req) => {

        const { employeeNumber, ID } = req.data;

        if (!employeeNumber) {
            return;
        }

        const existingEmployee = await SELECT.one
            .from(Employees)
            .where({
                employeeNumber,
                ID: { "!=": ID }
            });

        if (existingEmployee) {
            req.error(
                409,
                "Employee number already exists"
            );
        }
    });

});