const cds = require('@sap/cds');

module.exports = cds.service.impl(async function () {

    const {
        Payouts,
        SLARules,
        AlertLog
    } = this.entities;

    const db = await cds.connect.to('db');

    const {
        Claims,
        Employees
    } = db.entities;


    // CREATE + PROCESS PAYOUT
    this.on('createPayout', async (req) => {

        const { claimID, amount } = req.data;

        if (!claimID) {
            return req.error(400, 'claimID is required');
        }

        if (
            amount === undefined ||
            amount === null ||
            Number(amount) <= 0
        ) {
            return req.error(
                400,
                'Payout amount must be greater than zero'
            );
        }

        // Check Claim
        const claim = await SELECT.one
            .from(Claims)
            .where({
                ID: claimID
            });

        if (!claim) {
            return req.error(
                404,
                `Claim ${claimID} not found`
            );
        }

        // Check whether payout already exists
        let payout = await SELECT.one
            .from(Payouts)
            .where({
                claim_ID: claimID
            });

        /*
         * EXISTING PAYOUT
         */
        if (payout) {

            console.log(
                `Existing payout found: ${payout.ID}, status: ${payout.status}`
            );

            // Already successfully processed
            if (payout.status === 'Processed') {

                console.log(
                    `Payout ${payout.ID} is already Processed`
                );

                return payout;
            }

            // Already created and waiting for payout approval
            if (payout.status === 'Pending') {

                console.log(
                    `Payout ${payout.ID} is Pending and waiting for approval`
                );

                return payout;
            }

            // Another process is currently processing it
            if (payout.status === 'Processing') {

                return req.error(
                    400,
                    `Payout ${payout.ID} is currently being processed`
                );
            }
            if (payout.status === 'Failed') {

                console.log(
                    `Payout ${payout.ID} previously failed`
                );

                return payout;
            }
        }
        // A new payout can only be created for an Approved claim
        if (claim.status !== 'Approved') {

            return req.error(
                400,
                `Payout can be created only for an approved claim. Current status: ${claim.status}`
            );
        }


        const payoutID = cds.utils.uuid();

        await INSERT.into(Payouts).entries({

            ID: payoutID,

            payoutNumber: `PAY-${Date.now()}`,

            claim_ID: claimID,

            amount: Number(amount),

            status: 'Pending'
        });

        payout = await SELECT.one
            .from(Payouts)
            .where({
                ID: payoutID
            });

        console.log(
            `New payout created: ${payout.ID}, status: ${payout.status}`
        );

        return payout;
    });



    // payout approval in BPA.
    this.on('processPayout', async (req) => {

        const { payoutID } = req.data;

        if (!payoutID) {
            return req.error(
                400,
                'payoutID is required'
            );
        }

        // Find payout
        const payout = await SELECT.one
            .from(Payouts)
            .where({
                ID: payoutID
            });

        if (!payout) {
            return req.error(
                404,
                `Payout ${payoutID} not found`
            );
        }

        console.log(
            `Processing payout ${payout.ID}, current status: ${payout.status}`
        );


        //Do not process the same payout twice.

        if (payout.status === 'Processed') {

            console.log(
                `Payout ${payout.ID} is already Processed`
            );

            return payout;
        }

        /*
         * ONLY Pending OR Failed CAN BE PROCESSED
         */
        if (
            payout.status !== 'Pending' &&
            payout.status !== 'Failed'
        ) {

            return req.error(
                400,
                `Payout cannot be processed. Current status: ${payout.status}`
            );
        }

        // Get associated claim
        const claim = await SELECT.one
            .from(Claims)
            .where({
                ID: payout.claim_ID
            });

        if (!claim) {
            return req.error(
                404,
                'Claim associated with payout not found'
            );
        }


        /*
        * If the claim is already Paid, something is inconsistent
        * because the payout should already be Processed.
        */
        if (claim.status !== 'Approved') {

            return req.error(
                400,
                `Payout can be processed only for an approved claim. Current claim status: ${claim.status}`
            );
        }

        try {

            /*
             * Pending / Failed
             *        ↓
             *    Processing
             */

            await UPDATE(Payouts)
                .set({
                    status: 'Processing'
                })
                .where({
                    ID: payoutID
                });

            console.log(
                `Payout ${payoutID} status changed to Processing`
            );

            /*
             * PAYMENT PROCESSING
             *
             * Replace this later with actual payment integration.
             */
            const paymentSuccessful = true;

            if (paymentSuccessful) {

                /*
                 * Processing
                 *      ↓
                 *  Processed
                 */

                await UPDATE(Payouts)
                    .set({
                        status: 'Processed'
                    })
                    .where({
                        ID: payoutID
                    });

                /*
                 * Claim
                 * Approved
                 *    ↓
                 * Paid
                 */

                await UPDATE(Claims)
                    .set({
                        status: 'Paid'
                    })
                    .where({
                        ID: payout.claim_ID
                    });

                console.log(
                    `Payout ${payoutID} processed successfully`
                );

                /*
                 * Success Alert
                 */

                await INSERT.into(AlertLog).entries({

                    ID: cds.utils.uuid(),

                    claim_ID: payout.claim_ID,

                    alertType: 'PayoutSuccess',

                    message:
                        `Payout ${payout.payoutNumber} processed successfully`,

                    status: 'Created'
                });

                /*
                 * Return final payout
                 */

                return await SELECT.one
                    .from(Payouts)
                    .where({
                        ID: payoutID
                    });
            }

            /*
             * PAYMENT FAILED
             */

            await UPDATE(Payouts)
                .set({
                    status: 'Failed'
                })
                .where({
                    ID: payoutID
                });

            await INSERT.into(AlertLog).entries({

                ID: cds.utils.uuid(),

                claim_ID: payout.claim_ID,

                alertType: 'PayoutFailed',

                message:
                    `Payout ${payout.payoutNumber} failed`,

                status: 'Created'
            });

            return await SELECT.one
                .from(Payouts)
                .where({
                    ID: payoutID
                });

        } catch (error) {

            console.error(
                'Payout processing error:',
                error
            );

            /*
             * Processing
             *      ↓
             *   Failed
             */

            await UPDATE(Payouts)
                .set({
                    status: 'Failed'
                })
                .where({
                    ID: payoutID
                });

            /*
             * Failure Alert
             */

            await INSERT.into(AlertLog).entries({

                ID: cds.utils.uuid(),

                claim_ID: payout.claim_ID,

                alertType: 'PayoutFailed',

                message:
                    `Payout ${payout.payoutNumber} failed: ${error.message}`,

                status: 'Created'
            });

            return req.error(
                500,
                `Payout processing failed: ${error.message}`
            );
        }

    });


    this.on('rejectPayout', async (req) => {
        const { payoutID } = req.data;

        if (!payoutID) {
            return req.error(400, 'payoutID is required');
        }

        const payout = await SELECT.one
            .from(Payouts)
            .where({ ID: payoutID });

        if (!payout) {
            return req.error(404, `Payout ${payoutID} not found`);
        }

        if (payout.status === 'Processed') {
            return req.error(400, 'Processed payout cannot be rejected');
        }

        if (payout.status === 'Processing') {
            return req.error(400, 'Payout currently being processed cannot be rejected');
        }

        if (payout.status !== 'Pending' && payout.status !== 'Failed') {
            return req.error(
                400,
                `Payout cannot be rejected. Current status: ${payout.status}`
            );
        }

        await DELETE.from(Payouts)
            .where({ ID: payoutID });

        await INSERT.into(AlertLog).entries({
            ID: cds.utils.uuid(),
            claim_ID: payout.claim_ID,
            alertType: 'PayoutFailed',
            message: `Payout ${payout.payoutNumber} was rejected`,
            status: 'Created'
        });

        return true;
    });

    // CALCULATE SLA STATUS
    this.on('calculateSLAStatus', async (req) => {

        const { claimID } = req.data;

        if (!claimID) {
            return req.error(
                400,
                'claimID is required'
            );
        }

        const claim = await SELECT.one
            .from(Claims)
            .where({
                ID: claimID
            });

        if (!claim) {
            return req.error(
                404,
                `Claim ${claimID} not found`
            );
        }

        const slaRule = await SELECT.one
            .from(SLARules)
            .where({
                claimType_ID: claim.claimType_ID
            });

        if (!slaRule) {
            return req.error(
                404,
                'No SLA rule configured for this claim type'
            );
        }

        if (!claim.incidentDate) {
            return 'WITHIN_SLA';
        }

        const submittedTime =
            new Date(claim.incidentDate);

        const currentTime =
            new Date();

        const elapsedHours =
            (currentTime - submittedTime) /
            (1000 * 60 * 60);

        const resolutionHours =
            Number(slaRule.resolutionHours);

        if (elapsedHours > resolutionHours) {
            return 'SLA_BREACHED';
        }

        const remainingHours =
            resolutionHours - elapsedHours;

        if (remainingHours <= 6) {
            return 'SLA_NEARING_BREACH';
        }

        return 'WITHIN_SLA';

    });


    // CREATE ALERT
    this.on('createAlert', async (req) => {

        const {
            claimID,
            recipientID,
            alertType,
            message
        } = req.data;


        if (claimID) {

            const claim = await SELECT.one
                .from(Claims)
                .where({
                    ID: claimID
                });

            if (!claim) {
                return req.error(
                    404,
                    'Claim not found'
                );
            }
        }


        if (recipientID) {

            const employee = await SELECT.one
                .from(Employees)
                .where({
                    ID: recipientID
                });

            if (!employee) {
                return req.error(
                    404,
                    'Employee not found'
                );
            }
        }


        if (!alertType) {
            return req.error(
                400,
                'alertType is required'
            );
        }


        const alertID = cds.utils.uuid();


        await INSERT.into(AlertLog).entries({

            ID: alertID,

            claim_ID: claimID || null,

            recipient_ID: recipientID || null,

            alertType: alertType,

            message: message || null,

            status: 'Created'
        });


        return await SELECT.one
            .from(AlertLog)
            .where({
                ID: alertID
            });

    });


    // MARK ALERT AS READ
    this.on('markAsRead', async (req) => {

        const { alertID } = req.data;

        if (!alertID) {
            return req.error(
                400,
                'alertID is required'
            );
        }


        const alert = await SELECT.one
            .from(AlertLog)
            .where({
                ID: alertID
            });


        if (!alert) {
            return req.error(
                404,
                `Alert ${alertID} not found`
            );
        }


        if (alert.status === 'Read') {
            return req.error(
                400,
                'Alert is already marked as Read'
            );
        }


        await UPDATE(AlertLog)
            .set({
                status: 'Read'
            })
            .where({
                ID: alertID
            });


        return await SELECT.one
            .from(AlertLog)
            .where({
                ID: alertID
            });

    });

});