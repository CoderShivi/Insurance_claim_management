const cds = require('@sap/cds');

module.exports = cds.service.impl(async function () {

    const {
        Payouts,
        SLARules,
        AlertLog,
        Claims,
        Employees
    } = this.entities;


    // =========================================================
    // Create Payout
    // =========================================================

    this.on('createPayout', async (req) => {

        const {
            claimID,
            amount
        } = req.data;


        // Check Claim
        const claim = await SELECT.one
            .from(Claims)
            .where({ ID: claimID });


        if (!claim) {
            return req.error(404, 'Claim not found');
        }


        // Claim must be Approved
        if (claim.status !== 'Approved') {
            return req.error(
                400,
                'Payout can be created only for an approved claim'
            );
        }


        // Check existing payout
        const existingPayout = await SELECT.one
            .from(Payouts)
            .where({ claim_ID: claimID });


        if (existingPayout) {
            return req.error(
                400,
                'Payout already exists for this claim'
            );
        }


        // Validate Amount
        if (!amount || amount <= 0) {
            return req.error(
                400,
                'Payout amount must be greater than zero'
            );
        }


        // Create Payout
        await INSERT.into(Payouts).entries({

            payoutNumber: `PAY-${Date.now()}`,

            claim_ID: claimID,

            amount: amount,

            status: 'Pending'

        });


        return 'Payout created successfully';

    });


    // =========================================================
    // Process Payout
    // =========================================================

    this.on('processPayout', async (req) => {

        const {
            payoutID
        } = req.data;


        // Find Payout
        const payout = await SELECT.one
            .from(Payouts)
            .where({ ID: payoutID });


        if (!payout) {
            return req.error(404, 'Payout not found');
        }


        // Payout must be Pending
        if (payout.status !== 'Pending') {
            return req.error(
                400,
                `Payout cannot be processed. Current status: ${payout.status}`
            );
        }


        // Change status to Processing
        await UPDATE(Payouts)
            .set({
                status: 'Processing'
            })
            .where({ ID: payoutID });


        try {

            /*
             * In a real enterprise project,
             * external payment/finance system
             * can be called here using Destination Service.
             *
             * Currently payment is simulated.
             */

            const paymentSuccessful = true;


            if (paymentSuccessful) {

                // Update Payout
                await UPDATE(Payouts)
                    .set({
                        status: 'Processed',
                        processedAt: new Date()
                    })
                    .where({ ID: payoutID });


                // Create Success Alert
                await INSERT.into(AlertLog).entries({

                    claim_ID: payout.claim_ID,

                    alertType: 'PayoutSuccess',

                    message:
                        `Payout ${payout.payoutNumber} processed successfully`,

                    status: 'Created'

                });


                return 'Payout processed successfully';

            } else {

                // Update Payout as Failed
                await UPDATE(Payouts)
                    .set({
                        status: 'Failed'
                    })
                    .where({ ID: payoutID });


                // Create Failure Alert
                await INSERT.into(AlertLog).entries({

                    claim_ID: payout.claim_ID,

                    alertType: 'PayoutFailed',

                    message:
                        `Payout ${payout.payoutNumber} failed`,

                    status: 'Created'

                });


                return 'Payout processing failed';
            }


        } catch (error) {

            // Update Payout as Failed
            await UPDATE(Payouts)
                .set({
                    status: 'Failed'
                })
                .where({ ID: payoutID });


            // Create Failure Alert
            await INSERT.into(AlertLog).entries({

                claim_ID: payout.claim_ID,

                alertType: 'PayoutFailed',

                message:
                    `Payout ${payout.payoutNumber} failed`,

                status: 'Created'

            });


            return req.error(
                500,
                'Payout processing failed'
            );
        }

    });


    // =========================================================
    // Calculate SLA Status
    // =========================================================

    this.on('calculateSLAStatus', async (req) => {

        const {
            claimID
        } = req.data;


        // Find Claim
        const claim = await SELECT.one
            .from(Claims)
            .where({ ID: claimID });


        if (!claim) {
            return req.error(404, 'Claim not found');
        }


        // Find SLA Rule based on Claim Type
        const slaRule = await SELECT.one
            .from(SLARules)
            .where({
                claimType_ID: claim.claimType_ID
            });


        if (!slaRule) {
            return req.error(
                404,
                'SLA rule not found for this claim type'
            );
        }


        // Calculate elapsed time
        const submittedTime =
            new Date(claim.reportedDate);

        const currentTime =
            new Date();


        const elapsedHours =
            (currentTime - submittedTime)
            / (1000 * 60 * 60);


        const resolutionHours =
            slaRule.resolutionHours;


        // SLA Breached
        if (elapsedHours > resolutionHours) {

            return 'SLA_BREACHED';

        }


        // SLA Nearing Breach
        const remainingHours =
            resolutionHours - elapsedHours;


        if (remainingHours <= 6) {

            return 'SLA_NEARING_BREACH';

        }


        // SLA OK
        return 'WITHIN_SLA';

    });


    // =========================================================
    // Create Alert
    // =========================================================

    this.on('createAlert', async (req) => {

        const {
            claimID,
            recipientID,
            alertType,
            message
        } = req.data;


        // Check Claim
        if (claimID) {

            const claim = await SELECT.one
                .from(Claims)
                .where({ ID: claimID });


            if (!claim) {
                return req.error(
                    404,
                    'Claim not found'
                );
            }

        }


        // Check Employee
        if (recipientID) {

            const employee = await SELECT.one
                .from(Employees)
                .where({ ID: recipientID });


            if (!employee) {
                return req.error(
                    404,
                    'Employee not found'
                );
            }

        }


        // Create Alert
        await INSERT.into(AlertLog).entries({

            claim_ID: claimID,

            recipient_ID: recipientID,

            alertType: alertType,

            message: message,

            status: 'Created'

        });


        return 'Alert created successfully';

    });


    // =========================================================
    // Mark Alert as Read
    // =========================================================

    this.on('markAsRead', async (req) => {

        const {
            alertID
        } = req.data;


        // Find Alert
        const alert = await SELECT.one
            .from(AlertLog)
            .where({ ID: alertID });


        if (!alert) {
            return req.error(
                404,
                'Alert not found'
            );
        }


        // Check current status
        if (alert.status === 'Read') {
            return req.error(
                400,
                'Alert is already marked as Read'
            );
        }


        // Update Alert
        await UPDATE(AlertLog)
            .set({
                status: 'Read'
            })
            .where({ ID: alertID });


        return 'Alert marked as read successfully';

    });

});
