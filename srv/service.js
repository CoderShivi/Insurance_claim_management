const cds = require('@sap/cds');

module.exports = cds.service.impl(function () {

    const { Customers, Policies } = this.entities;

    // =========================================================
    // CUSTOMERS
    // =========================================================

    // CREATE Customer
    this.before('CREATE', Customers, async (req) => {

        const { customerNumber, firstName, lastName, email, phone } = req.data;

        // Customer number mandatory
        if (!customerNumber) {
            req.error(400, 'Customer Number is required');
        }

        // Check duplicate customer number
        const existingCustomer = await SELECT.one
            .from(Customers)
            .where({ customerNumber });

        if (existingCustomer) {
            req.error(400, `Customer ${customerNumber} already exists`);
        }

        // Email validation
        if (email && !email.includes('@')) {
            req.error(400, 'Invalid email address');
        }

        // First name validation
        if (!firstName) {
            req.error(400, 'First Name is required');
        }

        // Last name validation
        if (!lastName) {
            req.error(400, 'Last Name is required');
        }
    });


    // UPDATE Customer
    this.before('UPDATE', Customers, async (req) => {

        const { email } = req.data;

        if (email && !email.includes('@')) {
            req.error(400, 'Invalid email address');
        }
    });


    // =========================================================
    // POLICIES
    // =========================================================

    // CREATE Policy
    this.before('CREATE', Policies, async (req) => {

        const {
            policyNumber,
            customer_ID,
            claimType_ID,
            coverageLimit,
            startDate,
            endDate
        } = req.data;

        // Policy number required
        if (!policyNumber) {
            req.error(400, 'Policy Number is required');
        }

        // Check duplicate policy number
        const existingPolicy = await SELECT.one
            .from(Policies)
            .where({ policyNumber });

        if (existingPolicy) {
            req.error(400, `Policy ${policyNumber} already exists`);
        }

        // Coverage validation
        if (coverageLimit == null || coverageLimit <= 0) {
            req.error(400, 'Coverage Limit must be greater than 0');
        }

        // Date validation
        if (startDate && endDate) {

            if (new Date(endDate) < new Date(startDate)) {
                req.error(
                    400,
                    'End Date cannot be before Start Date'
                );
            }
        }

        // Customer validation
        if (!customer_ID) {
            req.error(400, 'Customer is required');
        }

        // Claim Type validation
        if (!claimType_ID) {
            req.error(400, 'Claim Type is required');
        }
    });


    // UPDATE Policy
    this.before('UPDATE', Policies, async (req) => {

        const {
            coverageLimit,
            startDate,
            endDate
        } = req.data;

        if (coverageLimit !== undefined && coverageLimit <= 0) {
            req.error(400, 'Coverage Limit must be greater than 0');
        }

        if (startDate && endDate) {

            if (new Date(endDate) < new Date(startDate)) {
                req.error(
                    400,
                    'End Date cannot be before Start Date'
                );
            }
        }
    });


    // =========================================================
    // AFTER READ
    // =========================================================

    this.after('READ', Customers, (customers) => {

        if (!Array.isArray(customers)) {
            customers = [customers];
        }

        customers.forEach(customer => {

            if (customer) {
                customer.fullName =
                    `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
            }

        });
    });


    this.after('READ', Policies, (policies) => {

        if (!Array.isArray(policies)) {
            policies = [policies];
        }

        policies.forEach(policy => {

            if (policy) {
                policy.policyInfo =
                    `${policy.policyNumber} - ${policy.status}`;
            }

        });
    });

});