
module.exports = cds.service.impl(function () {

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


    // ==============================
    // Investigations
    // ==============================

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


    // ==============================
    // Approvals
    // ==============================

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

});
