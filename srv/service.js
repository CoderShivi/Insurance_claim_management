const cds = require('@sap/cds')
const { executeHttpRequest } = require('@sap-cloud-sdk/http-client');

module.exports = cds.service.impl(function () {


    // FraudRiskScores

    const { Policies, Claims, ClaimDocuments } = this.entities;
    this.before('CREATE', 'FraudRiskScores', async (req) => {

        const score = req.data.riskScore;

        if (score < 0 || score > 100) {
            req.error(400, 'Risk score must be between 0 and 100');
        }

        // Automatically calculate risk level
        if (score <= 25) {
            req.data.riskLevel = 'Low';
        }
        else if (score <= 50) {
            req.data.riskLevel = 'Medium';
        }
        else if (score <= 75) {
            req.data.riskLevel = 'High';
        }
        else {
            req.data.riskLevel = 'Critical';
        }
    });



    // Investigations


    this.before('UPDATE', 'Investigations', async (req) => {

        // If investigation is completed,
        // findings should be provided

        if (req.data.status === 'Completed' &&
            !req.data.findings) {

            req.error(
                400,
                'Findings are required when investigation is completed'
            );
        }
    });



    // Approvals


    this.before('UPDATE', 'Approvals', async (req) => {

        // If decision is Approved or Rejected,
        // approver must be available

        if (
            (req.data.decision === 'Approved' ||
                req.data.decision === 'Rejected') &&
            !req.data.approver_ID
        ) {
            req.error(
                400,
                'Approver is required for approval decision'
            );
        }
    });



    this.before(['CREATE', 'UPDATE'], 'Policies', async (req) => {

        const { startDate, endDate, coverageLimit } = req.data;

        if (startDate && endDate && endDate < startDate) {
            return req.error(400, 'End date cannot be before start date');
        }

        if (coverageLimit !== undefined && coverageLimit <= 0) {
            return req.error(400, 'Coverage limit must be greater than zero');
        }
    });

    this.before('CREATE', 'Claims', async (req) => {

        const { policy_ID, claimedAmount } = req.data;

        const policy = await SELECT.one
            .from(Policies)
            .where({ ID: policy_ID });

        if (!policy) {
            return req.error(400, 'Policy not found');
        }

        if (policy.status !== 'Active') {
            return req.error(400, 'Claim cannot be created for an inactive policy');
        }

        if (claimedAmount !== undefined && claimedAmount <= 0) {
            return req.error(400, 'Claimed amount must be greater than zero');
        }
    });

    this.before('UPDATE', 'Claims', async (req) => {

        if (req.data.claimedAmount !== undefined &&
            req.data.claimedAmount <= 0) {

            return req.error(400, 'Claimed amount must be greater than zero');
        }
    });

    this.before('CREATE', 'ClaimDocuments', async (req) => {

        const { claim_ID, fileName, mediaType } = req.data;

        if (!claim_ID) {
            return req.error(400, 'Claim is required');
        }

        if (!fileName) {
            return req.error(400, 'File name is required');
        }

        if (!mediaType) {
            return req.error(400, 'Media type is required');
        }

        const allowedTypes = [
            'application/pdf',
            'image/jpeg',
            'image/png'
        ];

        if (!allowedTypes.includes(mediaType)) {
            return req.error(
                400,
                'Only PDF, JPEG and PNG documents are allowed'
            );
        }
    });

    this.on('renewPolicy', async (req) => {

        const { policyID } = req.data;

        const policy = await SELECT.one.from(Policies)
            .where({ ID: policyID });

        if (!policy) {
            return req.error(404, 'Policy not found');
        }

        if (policy.status === 'Cancelled') {
            return req.error(400, 'Cancelled policy cannot be renewed');
        }

        await UPDATE(Policies)
            .set({
                status: 'Active'
            })
            .where({ ID: policyID });

        return await SELECT.one.from(Policies)
            .where({ ID: policyID });
    });

    this.on('cancelPolicy', async (req) => {

        const { policyID } = req.data;

        const policy = await SELECT.one.from(Policies)
            .where({ ID: policyID });

        if (!policy) {
            return req.error(404, 'Policy not found');
        }

        if (policy.status === 'Cancelled') {
            return req.error(400, 'Policy is already cancelled');
        }

        await UPDATE(Policies)
            .set({
                status: 'Cancelled'
            })
            .where({ ID: policyID });

        return await SELECT.one.from(Policies)
            .where({ ID: policyID });
    });

    this.on('getPolicyStatus', async (req) => {

        const { policyID } = req.data;

        const policy = await SELECT.one.from(Policies)
            .columns('status')
            .where({ ID: policyID });

        if (!policy) {
            return req.error(404, 'Policy not found');
        }

        return policy.status;
    });

    this.on('getPolicyClaimsCount', async (req) => {

        const { policyID } = req.data;

        const policy = await SELECT.one.from(Policies)
            .where({ ID: policyID });

        if (!policy) {
            return req.error(404, 'Policy not found');
        }

        const result = await SELECT.one
            .from(Claims)
            .columns`count(*) as count`
            .where({ policy_ID: policyID });

        return Number(result.count);
    });

    this.on("submitClaim", async (req) => {

        const { claimID } = req.data;

        // ------------------------------------------------------------

        if (!claimID) {
            return req.reject(400, "Claim ID is required");
        }



        const claim = await SELECT
            .one
            .from(Claims)
            .where({
                ID: claimID
            });

        if (!claim) {
            return req.reject(404, "Claim not found");
        }



        if (claim.status !== "Draft") {
            return req.reject(
                400,
                "Only Draft claims can be submitted for approval"
            );
        }


        try {



            const response = await executeHttpRequest(
                {
                    destinationName: "ClaimProcess"
                },
                {
                    method: "GET",

                    url: "/workflow/rest/v1/workflow-instances",

                    // data: {
                    //     definitionId:
                    //         "us10.547c31aatrial.claimsureclaimmanagement.claimApprovalProcess",

                    //     context: {
                    //         claimid: claim.ID,
                    //         claimnumber: claim.claimNumber,
                    //         claimedamount: Number(claim.claimedAmount),
                    //         description: claim.description || ""
                    //     }
                    // }
                },
                {
                    fetchCsrfToken: false
                }
            );

            console.log(response);
            


            await UPDATE(Claims)
                .set({
                    status: "PendingApproval"
                })
                .where({
                    ID: claimID
                });


            console.log(
                "SBPA STATUS:",
                response.status
            );

            console.log(
                "SBPA RESPONSE DATA:",
                JSON.stringify(response.data, null, 2)
            );



            const updatedClaim = await SELECT
                .one
                .from(Claims)
                .where({
                    ID: claimID
                });


            return updatedClaim;


        } catch (error) {

            console.error(
                "SBPA ERROR MESSAGE:",
                error.message
            );

            console.error(
                "SBPA ERROR CAUSE:",
                error.cause
            );

            console.error(
                "SBPA RESPONSE DATA:",
                JSON.stringify(
                    error.response?.data,
                    null,
                    2
                )
            );

            return req.reject(
                502,
                `Failed to start approval process: ${error.message}`
            );
        }
    });

    this.on('approveClaim', async (req) => {

        const { claimID } = req.data;

        const claim = await SELECT.one.from(Claims)
            .where({ ID: claimID });

        if (!claim) {
            return req.error(404, 'Claim not found');
        }

        if (
            claim.status !== 'PendingApproval' &&
            claim.status !== 'UnderReview'
        ) {
            return req.error(
                400,
                'Claim cannot be approved in its current status'
            );
        }

        await UPDATE(Claims)
            .set({
                status: 'Approved'
            })
            .where({ ID: claimID });

        return await SELECT.one.from(Claims)
            .where({ ID: claimID });
    });


    this.on('rejectClaim', async (req) => {

        const { claimID } = req.data;

        const claim = await SELECT.one.from(Claims)
            .where({ ID: claimID });

        if (!claim) {
            return req.error(404, 'Claim not found');
        }

        if (
            claim.status !== 'PendingApproval' &&
            claim.status !== 'UnderReview'
        ) {
            return req.error(
                400,
                'Claim cannot be rejected in its current status'
            );
        }

        await UPDATE(Claims)
            .set({
                status: 'Rejected'
            })
            .where({ ID: claimID });

        return await SELECT.one.from(Claims)
            .where({ ID: claimID });
    });

    this.on('getClaimStatus', async (req) => {

        const { claimID } = req.data;

        const claim = await SELECT.one.from(Claims)
            .columns('status')
            .where({ ID: claimID });

        if (!claim) {
            return req.error(404, 'Claim not found');
        }

        return claim.status;
    });

    this.on('getClaimAmount', async (req) => {

        const { claimID } = req.data;

        const claim = await SELECT.one.from(Claims)
            .columns('claimedAmount')
            .where({ ID: claimID });

        if (!claim) {
            return req.error(404, 'Claim not found');
        }

        return claim.claimedAmount;
    });

    this.on('getClaimDocumentsCount', async (req) => {

        const { claimID } = req.data;

        const claim = await SELECT.one.from(Claims)
            .where({ ID: claimID });

        if (!claim) {
            return req.error(404, 'Claim not found');
        }

        const result = await SELECT.one
            .from(ClaimDocuments)
            .columns`count(*) as count`
            .where({ claim_ID: claimID });

        return Number(result.count);
    });

    this.on('deleteDocument', async (req) => {

        const { documentID } = req.data;

        const document = await SELECT.one
            .from(ClaimDocuments)
            .where({ ID: documentID });

        if (!document) {
            return req.error(404, 'Document not found');
        }

        await DELETE.from(ClaimDocuments)
            .where({ ID: documentID });

        return true;
    });

    this.on('getDocumentInfo', async (req) => {

        const { documentID } = req.data;

        const document = await SELECT.one
            .from(ClaimDocuments)
            .columns(
                'fileName',
                'documentType',
                'mediaType'
            )
            .where({ ID: documentID });

        if (!document) {
            return req.error(404, 'Document not found');
        }

        return `File: ${document.fileName}, Type: ${document.documentType}, Media Type: ${document.mediaType}`;
    });





})